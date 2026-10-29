import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import { freezeRecord } from "../experiment/engine";
import type { PerceptionRecord } from "./contracts";

type RetentionState = { key: Buffer; records: Map<string, { record: PerceptionRecord; expires: number }> };
// Share across route bundles and development module reloads in this server process.
const processScope = globalThis as typeof globalThis & { __causalflyPerceptionV1?: RetentionState };
function state(): RetentionState {
  return processScope.__causalflyPerceptionV1 ??= { key: randomBytes(32), records: new Map() };
}
export const MAX_PERCEPTION_RECEIPT = 384_000;
export class PerceptionRetentionError extends Error {}

/** Authenticated server output can be reused without an ephemeral map entry. No new secret variable. */
export function perceptionReceipt(record: PerceptionRecord): string {
  const payload = deflateSync(Buffer.from(JSON.stringify({ version: 1, expires: Date.now() + 12 * 60 * 60 * 1000, record }))).toString("base64url");
  const signature = createHmac("sha256", state().key).update(payload).digest("base64url");
  const receipt = `${payload}.${signature}`;
  if (receipt.length > MAX_PERCEPTION_RECEIPT) throw new PerceptionRetentionError("Perception result is too large to retain. Analyze a shorter clip.");
  return receipt;
}

export function verifyPerceptionReceipt(id: string, receipt: string): PerceptionRecord {
  try {
    if (receipt.length > MAX_PERCEPTION_RECEIPT) throw new Error();
    const [payload, signature, extra] = receipt.split(".");
    if (!payload || !signature || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(payload + signature)) throw new Error();
    const expected = createHmac("sha256", state().key).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const decoded = JSON.parse(inflateSync(Buffer.from(payload, "base64url"), { maxOutputLength: 2 * 1024 * 1024 }).toString("utf8"));
    if (decoded.version !== 1 || decoded.expires < Date.now() || decoded.record?.id !== id) throw new Error();
    return freezeRecord(decoded.record as PerceptionRecord);
  } catch {
    throw new PerceptionRetentionError("This server can no longer verify the retained perception result (restart, expiry, or changed receipt). Your preview is retained. Re-analyze the video, then retry.");
  }
}
export function retainPerception(record: PerceptionRecord): PerceptionRecord {
  const retained = state().records;
  for (const [id, entry] of retained) if (entry.expires < Date.now()) retained.delete(id);
  if (retained.size >= 100) retained.delete(retained.keys().next().value!);
  const frozen = freezeRecord(structuredClone(record));
  retained.set(record.id, { record: frozen, expires: Date.now() + 2 * 60 * 60 * 1000 });
  return frozen;
}
export function retainedPerception(id: string, receipt?: string): PerceptionRecord | undefined {
  if (receipt) return verifyPerceptionReceipt(id, receipt);
  const retained = state().records;
  const entry = retained.get(id);
  if (!entry || entry.expires < Date.now()) { retained.delete(id); return undefined; }
  return entry.record;
}
