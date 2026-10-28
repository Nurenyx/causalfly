import "server-only";
import { randomUUID } from "node:crypto";
import { freezeRecord } from "../experiment/engine";
import type { FruitFlySnapshot } from "./contracts";
import { emptyLiveSession, receiveSnapshot, type LiveSession } from "./live-session";

const TTL = 60 * 60 * 1000;
const LIMIT = 32;
type Entry = { session: LiveSession; touched: number };
// Shared by Next route bundles in this Node process. No browser-supplied evidence.
const runtime = globalThis as typeof globalThis & { causalFlyRetention?: Map<string, Entry> };
const retained = runtime.causalFlyRetention ??= new Map<string, Entry>();

function prune(now: number) {
  for (const [id, entry] of retained) if (now - entry.touched > TTL) retained.delete(id);
}

export function openRetention(now = Date.now()): string {
  prune(now);
  while (retained.size >= LIMIT) retained.delete(retained.keys().next().value!);
  const id = randomUUID();
  retained.set(id, { session: emptyLiveSession(), touched: now });
  return id;
}

/** Called only by the server bridge after protocol normalization. */
export function retainSnapshot(id: string, snapshot: FruitFlySnapshot, now = Date.now()) {
  const entry = retained.get(id);
  if (!entry) return;
  entry.session = freezeRecord(receiveSnapshot(entry.session, structuredClone(snapshot)));
  entry.touched = now;
}

/** Select the exact browser-retained window; no substituted or invented frames. */
export function readRetainedWindow(id: string, sessionId: string, sequences: readonly number[], now = Date.now()): LiveSession {
  prune(now);
  const entry = retained.get(id);
  if (!entry || !sequences.length || new Set(sequences).size !== sequences.length) throw new Error("Evidence unavailable");
  const frames = sequences.map(sequence => entry.session.frames.find(f => f.telemetry.sessionId === sessionId && f.telemetry.sequence === sequence));
  if (frames.some(f => !f)) throw new Error("Evidence window expired");
  const selected = frames.filter(f => f !== undefined).sort((a, b) => a.telemetry.sequence - b.telemetry.sequence);
  return freezeRecord({ snapshot: { ...entry.session.snapshot, evidence: selected.at(-1)! }, frames: selected });
}
