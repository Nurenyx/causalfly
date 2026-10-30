import "server-only";
import OpenAI from "openai";
import type { Stream } from "openai/core/streaming";
import { parseVideoStream, recordsOfKind, type VideoSegmentationResult } from "@meta-sam/parser";
import { assertMetaEnabled, readLiveConfiguration, readMetaEnvironment, type MetaEnvironment } from "./client";
import { SAM_MODEL, type VideoMetadata } from "../perception/contracts";
import { extractFeatures, selectTrack } from "../perception/features";
import type { TrackedBox } from "../perception/contracts";

export class SamError extends Error {
  constructor(message: string, readonly kind: "configuration" | "provider" = "provider") { super(message); }
}
export function samConfiguration(env: MetaEnvironment) {
  try {
    const config = readLiveConfiguration({ ...env, META_BASE_URL: env.META_BASE_URL || "https://api.meta.ai/v1", META_MODEL: SAM_MODEL });
    if (config.baseURL.replace(/\/$/, "") !== "https://api.meta.ai/v1") throw new Error();
    return { ...config, timeoutMs: Math.min(config.timeoutMs, 180_000) };
  } catch { throw new SamError("SAM LIVE requires the server META_API_KEY and the official https://api.meta.ai/v1 base URL. No offline fallback was used.", "configuration"); }
}

export function measurementFromSam(result: VideoSegmentationResult, media: VideoMetadata) {
  if (result.outcome.status !== "completed") throw new SamError("SAM stream ended incomplete. No stimulus was accepted. Retry explicitly.");
  if (result.diagnostics.some(d => d.severity === "error")) throw new SamError("SAM returned malformed tracking data. No stimulus was accepted.");
  const tracks = new Map<string, TrackedBox[]>();
  for (const box of recordsOfKind(result.records, "box")) {
    if (box.frame === undefined) throw new SamError("SAM returned tracking data without frame indices.");
    const track = tracks.get(box.objectId) ?? [];
    track.push({ frameIndex: box.frame.frameIndex, left: box.left, top: box.top, right: box.right, bottom: box.bottom });
    tracks.set(box.objectId, track);
  }
  try { const [id, boxes] = selectTrack(tracks); return extractFeatures(id, boxes, media); }
  catch (error) { throw new SamError(error instanceof Error ? error.message : "Invalid SAM geometry."); }
}

/** One provider attempt. The SDK handles SSE framing; Meta's parser handles its wire grammar. */
export async function analyzeSamVideo(file: File, concept: string, media: VideoMetadata, options: { env?: MetaEnvironment; fetch?: typeof fetch } = {}) {
  try { assertMetaEnabled(options.env); } catch { throw new SamError("Live Meta is disabled. Use the explicit offline fixture.", "configuration"); }
  const config = samConfiguration(options.env ?? readMetaEnvironment());
  const sdk = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: config.timeoutMs, maxRetries: 0, logLevel: "off", ...(options.fetch ? { fetch: options.fetch } : {}) });
  const requestedAt = new Date().toISOString();
  const deadline = AbortSignal.timeout(config.timeoutMs);
  let fileId: string | undefined;
  let cleanup: "deleted" | "delete-failed-expires-in-1h" | "not-uploaded" = "not-uploaded";
  let responseId: string | undefined;
  let requestId: string | undefined;
  try {
    const uploaded = await sdk.files.create({ file, purpose: "user_data", expires_after: { anchor: "created_at", seconds: 3600 } }, { signal: deadline });
    if (!/^file-[A-Za-z0-9_-]+$/.test(uploaded.id)) throw new SamError("Meta Files returned an invalid upload identifier.");
    fileId = uploaded.id;
    // input_video is Meta's Responses extension; use the SDK's public transport without a false OpenAI type assertion.
    const response = await sdk.post<Stream<{ type: string; [key: string]: unknown }>>("/responses", {
      body: { model: SAM_MODEL, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_video", file_id: fileId }] }], stream: true, metadata: { mask_encoding: "one_bit" } },
      stream: true,
      signal: deadline,
    }).withResponse();
    requestId = response.request_id ?? undefined;
    async function* limitedEvents() {
      let bytes = 0;
      for await (const event of response.data) {
        bytes += Buffer.byteLength(JSON.stringify(event));
        if (bytes > 16 * 1024 * 1024) throw new SamError("SAM response exceeded the short-clip limit. Try a smaller clip.");
        if (event.response && typeof event.response === "object" && "id" in event.response && typeof event.response.id === "string") responseId = event.response.id;
        yield event;
      }
    }
    const result = await parseVideoStream(limitedEvents()).finalResult;
    const measurement = measurementFromSam(result, media);
    // Only the selected identity is rendered. No raw text or provider diagnostic text is sent to the browser.
    const overlay = { ...result, rawOutput: "", diagnostics: [], records: result.records.filter(r => r.kind !== "text" && r.objectId === measurement.objectId) };
    return { measurement, overlay, provenance: { requestedAt, completedAt: new Date().toISOString(), responseId, requestId, parser: "@meta-sam/parser@0.1.0" as const,
      warnings: result.diagnostics.map(d => d.code), get cleanup() { return cleanup; } } };
  } catch (error) {
    if (error instanceof SamError) throw error;
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "response_refusal") throw new SamError("SAM refused this media or concept. Choose another clip or concept and retry explicitly.");
    if (code.startsWith("response_") || code === "parser_error" || code === "invalid_mask_payload") throw new SamError(`SAM could not accept its response (${code}). No stimulus was accepted.`);
    if (error instanceof OpenAI.APIError) {
      // Do not echo provider bodies: they can contain credentials or user media.
      throw new SamError(`Meta SAM API failed${error.status ? ` (HTTP ${error.status})` : ""}. ${error.status === 401 || error.status === 403 ? "Check the server key and model access." : "Retry the explicit analysis action."}`);
    }
    throw new SamError("SAM connection or parsing failed. No stimulus was accepted; retry explicitly.");
  } finally {
    if (fileId) {
      try { const deleted = await sdk.files.delete(fileId, { timeout: 10_000 }); cleanup = deleted.deleted ? "deleted" : "delete-failed-expires-in-1h"; }
      catch { cleanup = "delete-failed-expires-in-1h"; }
    }
  }
}
