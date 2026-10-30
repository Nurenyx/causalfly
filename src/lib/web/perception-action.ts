import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { analyzeSamVideo, SamError, samConfiguration } from "../meta/sam-client";
import { assertMetaEnabled, readMetaEnvironment } from "../meta/client";
import { SAM_MODEL, type PerceptionResponse } from "../perception/contracts";
import { offlinePerceptionFixture } from "../perception/fixture";
import { inspectVideo } from "../perception/media";
import { perceptionReceipt, retainPerception } from "../perception/store";
import { FlightRecorder, retainedRecorder } from "./flight-recorder";
import { samConceptSchema, type SceneProvenance } from "../perception/scene";
import { retainedScene } from "../perception/scene-store";

import { MediaError, resolveMedia } from "../perception/blob-media";
import { mediaReference } from "../perception/blob-contract";

const conceptSchema = samConceptSchema;
// UI request token suppresses duplicate in-flight uploads, with no retained media or masks.
const inFlight = new Set<string>();
const recent = new Map<string, number>();

export async function perceptionAction(request: Request, deps: { analyze?: typeof analyzeSamVideo; inspect?: typeof inspectVideo; resolve?: typeof resolveMedia } = {}): Promise<Response> {
  let recorder: FlightRecorder | undefined = undefined;
  const reply = (body: PerceptionResponse, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const fail = (error: string, status = 400, kind: "validation" | "configuration" | "provider" = "validation") => {
    recorder?.event("error.recorded", { code: `perception.${kind}` });
    return reply({ ok: false, error, kind, ...(recorder ? { run_id: recorder.run_id, diagnostics: recorder.snapshot() } : {}) }, status);
  };
  const origin = request.headers.get("origin");
  // Next can use localhost in Request.url while preserving 127.0.0.1 in Host.
  const externalUrl = new URL(request.url);
  externalUrl.host = request.headers.get("host") ?? externalUrl.host;
  if (origin && origin !== externalUrl.origin) return fail("Submit perception from this CausalFly instance.", 403);
  const token = request.headers.get("X-Perception-Request");
  if (!token || !z.string().uuid().safeParse(token).success) return fail("A valid explicit analysis request token is required.");
  for (const [id, expires] of recent) if (expires < Date.now()) recent.delete(id);
  if (inFlight.has(token) || recent.has(token)) return fail("This analysis request was already submitted. Use Retry for a new attempt.", 409);
  if (inFlight.size >= 2) return fail("Perception is busy. Try again when the current request finishes.", 429);
  inFlight.add(token);
  recorder = new FlightRecorder();
  let samRequested = false;
  function selection(sceneId: unknown, candidate: unknown, concept: string, mediaHash?: string): SceneProvenance | undefined {
    if (!sceneId) return;
    if (typeof sceneId !== "string") throw new Error("Choose another Meta suggestion or discover the scene again.");
    const scene = retainedScene(sceneId);
    if (!scene) throw new Error("Choose Discover with Meta again: this scene result expired or the server restarted. Manual concept entry is also available.");
    recorder = retainedRecorder(scene.run_id) ?? recorder;
    if (mediaHash ? scene.mediaSha256 !== mediaHash : scene.mode !== "OFFLINE SCENE-UNDERSTANDING FIXTURE") throw new Error("Choose Discover with Meta again for the selected video. This suggestion belongs to a different clip.");
    const manual = candidate === "manual";
    if (!manual && (!/^\d$/.test(String(candidate)) || scene.result.candidates[Number(candidate)]?.samPrompt !== concept)) throw new Error("Choose a valid Meta suggestion or enter a different concept manually.");
    recorder!.model("scene", scene.model, scene.mode);
    recorder!.event("meta.scene.selected", { sceneId, concept, provider: scene.provider, selection: manual ? "manual" : "candidate", code: "explicit_user_confirmation" });
    return { id: scene.id, provider: scene.provider, model: scene.model, mode: scene.mode, selection: manual ? "manual" : "candidate", selectedConcept: concept };
  }
  try {
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return fail("Choose secure direct upload; video bytes are not accepted by this endpoint.");
    const input = JSON.parse((await boundedBody(request, 4096)).toString("utf8"));
    if (input.mode === "fixture") {
      const parsed = z.strictObject({ mode: z.literal("fixture"), sceneId: z.string().uuid().optional(), candidate: z.string().optional(), concept: conceptSchema.optional() }).safeParse(input);
      if (!parsed.success) return fail("Choose an explicit offline fixture or upload a video for SAM LIVE.");
      const scene = selection(parsed.data.sceneId, parsed.data.candidate, parsed.data.concept ?? "test object");
      if (scene && (scene.selection !== "candidate" || scene.selectedConcept !== "red square")) return fail("Choose the red square calibration candidate for the offline tracking fixture.");
      const fixture = offlinePerceptionFixture(randomUUID());
      const perception = retainPerception({ ...fixture, run_id: recorder!.run_id, ...(scene ? { concept: scene.selectedConcept, provenance: { ...fixture.provenance, scene } } : {}) });
      recorder.model("perceive", SAM_MODEL, perception.mode);
      recorder.perception(perception);
      recorder.event("stimulus.derived", { perceptionId: perception.id, amplitude: perception.measurement.amplitude, trackedFrames: perception.measurement.frames.length, mode: perception.mode });
      return reply({ ok: true, perception, receipt: perceptionReceipt(perception), diagnostics: recorder.snapshot() });
    }
    assertMetaEnabled();
    if (!deps.analyze) samConfiguration(readMetaEnvironment());
    const parsed = z.strictObject({ mode: z.literal("live"), media: mediaReference, concept: conceptSchema, sceneId: z.string().uuid().optional(), candidate: z.string().optional() }).safeParse(input);
    if (!parsed.success) return fail("Choose an uploaded video and one short concept of at most 80 characters.");
    const resolved = await (deps.resolve ?? resolveMedia)(parsed.data.media);
    const { file: upload, media, identity } = resolved;
    recorder = resolved.recorder;
    const mediaSha256 = identity.sha256;
    const scene = selection(parsed.data.sceneId, parsed.data.candidate, parsed.data.concept, mediaSha256);
    recorder.media(identity);
    if (!scene) recorder.event("meta.scene.selected", { concept: parsed.data.concept, selection: "manual", code: "explicit_user_confirmation" });
    recorder.model("perceive", SAM_MODEL, "SAM LIVE");
    recorder!.event("sam.requested", { model: SAM_MODEL, mode: "SAM LIVE", concept: parsed.data.concept, code: "explicit_user_request" }); samRequested = true;
    const result = await (deps.analyze ?? analyzeSamVideo)(upload, parsed.data.concept, media);
    const perception = retainPerception({ run_id: recorder.run_id, id: randomUUID(), model: SAM_MODEL, mode: "SAM LIVE", concept: parsed.data.concept, media, measurement: result.measurement,
      provenance: { ...result.provenance, mediaSha256, storage: identity, ...(scene ? { scene } : {}) } });
    recorder.perception(perception);
    recorder.event("sam.completed", { perceptionId: perception.id, trackedFrames: perception.measurement.frames.length, samResultId: perception.provenance.responseId ?? perception.id });
    recorder.event("stimulus.derived", { amplitude: perception.measurement.amplitude });
    return reply({ ok: true, perception, receipt: perceptionReceipt(perception), overlay: result.overlay, diagnostics: recorder.snapshot() });
  } catch (error) {
    if (samRequested) recorder.event(error instanceof Error && /no matching object/i.test(error.message) ? "sam.no_match" : "sam.failed", { code: "perception.unsuccessful" });
    if (error instanceof Error && /Live Meta is disabled/.test(error.message)) return fail(error.message, 503, "configuration");
    if (error instanceof MediaError) return fail(error.message);
    if (error instanceof SamError) return fail(error.message, error.kind === "configuration" ? 503 : 502, error.kind);
    if (error instanceof Error && /Choose|Use a clip|distinct video|Unable to read|Body too large/.test(error.message)) return fail(error.message);
    return fail("Unable to read the video request. Choose a short MP4/MOV and try again.");
  } finally {
    inFlight.delete(token);
    if (recent.size >= 200) recent.delete(recent.keys().next().value!);
    recent.set(token, Date.now() + 10 * 60 * 1000);
  }
}

export async function boundedBody(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get("Content-Length")) > limit) throw new Error("Body too large. Use a video of at most 20 MiB.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error("Body too large. Use a video of at most 20 MiB."); }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally { reader.releaseLock(); }
}
