import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { analyzeSamVideo, SamError, samConfiguration } from "../meta/sam-client";
import { readMetaEnvironment } from "../meta/client";
import { MAX_VIDEO_BYTES, SAM_MODEL, type PerceptionResponse } from "../perception/contracts";
import { offlinePerceptionFixture } from "../perception/fixture";
import { inspectVideo, validateVideoFile } from "../perception/media";
import { perceptionReceipt, retainPerception } from "../perception/store";

const conceptSchema = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} '-]+$/u, "Use one short object concept, such as hand.");
// UI request token suppresses duplicate in-flight uploads, with no retained media or masks.
const inFlight = new Set<string>();
const recent = new Map<string, number>();

export async function perceptionAction(request: Request, deps: { analyze?: typeof analyzeSamVideo; inspect?: typeof inspectVideo } = {}): Promise<Response> {
  const reply = (body: PerceptionResponse, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const fail = (error: string, status = 400, kind: "validation" | "configuration" | "provider" = "validation") => reply({ ok: false, error, kind }, status);
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
  try {
    if (request.headers.get("Content-Type")?.startsWith("application/json")) {
      // Offline fixtures are a separate explicit operation, never a live error fallback.
      const body = await boundedBody(request, 256);
      const parsed = z.strictObject({ mode: z.literal("fixture") }).safeParse(JSON.parse(body.toString("utf8")));
      if (!parsed.success) return fail("Choose an explicit offline fixture or upload a video for SAM LIVE.");
      const perception = retainPerception(offlinePerceptionFixture(randomUUID()));
      return reply({ ok: true, perception, receipt: perceptionReceipt(perception) });
    }
    // Reject invalid configuration before buffering user media.
    if (!deps.analyze) samConfiguration(readMetaEnvironment());
    const body = await boundedBody(request, MAX_VIDEO_BYTES + 16_384);
    const multipart = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("Content-Type") ?? "" }, body: new Uint8Array(body) }).formData();
    const file = multipart.get("video");
    const parsed = conceptSchema.safeParse(multipart.get("concept"));
    if (!(file instanceof File) || !parsed.success) return fail("Choose a video and one short concept of at most 80 characters.");
    validateVideoFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = await (deps.inspect ?? inspectVideo)(bytes);
    // Send a generic name to Meta, not a potentially identifying local filename.
    const isMov = /\.mov$/i.test(file.name);
    const upload = new File([bytes], isMov ? "stimulus.mov" : "stimulus.mp4", { type: isMov ? "video/quicktime" : "video/mp4" });
    const result = await (deps.analyze ?? analyzeSamVideo)(upload, parsed.data, media);
    const perception = retainPerception({ id: randomUUID(), model: SAM_MODEL, mode: "SAM LIVE", concept: parsed.data, media, measurement: result.measurement,
      provenance: { ...result.provenance, mediaSha256: createHash("sha256").update(bytes).digest("hex") } });
    return reply({ ok: true, perception, receipt: perceptionReceipt(perception), overlay: result.overlay });
  } catch (error) {
    if (error instanceof SamError) return fail(error.message, error.kind === "configuration" ? 503 : 502, error.kind);
    if (error instanceof Error && /Choose|Use a clip|distinct video|Unable to read|Body too large/.test(error.message)) return fail(error.message);
    return fail("Unable to read the video request. Choose a short MP4/MOV and try again.");
  } finally {
    inFlight.delete(token);
    if (recent.size >= 200) recent.delete(recent.keys().next().value!);
    recent.set(token, Date.now() + 10 * 60 * 1000);
  }
}

async function boundedBody(request: Request, limit: number): Promise<Buffer> {
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
