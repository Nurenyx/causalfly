import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { discoverScene, sceneConfiguration, SceneError } from "../meta/scene-client";
import { MAX_VIDEO_BYTES } from "../perception/contracts";
import { inspectVideo, validateVideoFile } from "../perception/media";
import { offlineScene, parseScene, type SceneResponse } from "../perception/scene";
import { retainScene } from "../perception/scene-store";
import { boundedBody } from "./perception-action";
import { FlightRecorder } from "./flight-recorder";

const active = new Set<string>(), recent = new Map<string, number>();
export async function sceneAction(request: Request, deps: { discover?: typeof discoverScene; inspect?: typeof inspectVideo } = {}): Promise<Response> {
  const recorder = new FlightRecorder();
  const reply = (body: SceneResponse, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const fail = (error: string, kind: Extract<SceneResponse, { ok: false }>["kind"], status = 400) => {
    recorder.event("meta.scene.failed", { code: `scene.${kind}` });
    return reply({ ok: false, error, kind, diagnostics: recorder.snapshot() }, status);
  };
  const url = new URL(request.url); url.host = request.headers.get("host") ?? url.host;
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return fail("Submit discovery from this CausalFly instance.", "request", 403);
  const token = request.headers.get("X-Scene-Request");
  if (!z.string().uuid().safeParse(token).success) return fail("An explicit Discover with Meta request is required.", "request");
  for (const [id, expires] of recent) if (expires < Date.now()) recent.delete(id);
  if (active.has(token!) || recent.has(token!)) return fail("Discovery was already submitted. Retry explicitly for a new request.", "request", 409);
  if (active.size >= 2) return fail("Scene understanding is busy. Retry when the current request finishes.", "request", 429);
  active.add(token!);
  try {
    const body = await boundedBody(request, MAX_VIDEO_BYTES + 16_384);
    const form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("Content-Type") ?? "" }, body: new Uint8Array(body) }).formData();
    const file = form.get("video"), mode = form.get("mode");
    if (!(file instanceof File) || mode !== "live" && mode !== "fixture") return fail("Choose a supported video and an explicit live or offline discovery action.", "media");
    validateVideoFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await (deps.inspect ?? inspectVideo)(bytes);
    const mediaSha256 = createHash("sha256").update(bytes).digest("hex");
    if (mode === "fixture") {
      const calibrationHash = createHash("sha256").update(await readFile("public/perception-calibration.mp4")).digest("hex");
      if (mediaSha256 !== calibrationHash) return fail("The offline scene fixture is for the calibration video only. Choose perception-calibration.mp4 or use manual concept entry.", "media");
    }
    const model = mode === "fixture" ? "calibration-scene-v1" : deps.discover ? "injected-test-model" : sceneConfiguration().model;
    const attribution = mode === "fixture" ? "OFFLINE SCENE-UNDERSTANDING FIXTURE" as const : "META LIVE" as const;
    recorder.model("scene", model, attribution);
    recorder.event("meta.scene.requested", { code: "explicit_user_request", model, mode: attribution, provider: mode === "fixture" ? "CausalFly fixture" : "Meta" });
    let result;
    try { result = mode === "fixture" ? structuredClone(offlineScene) : parseScene(await (deps.discover ?? discoverScene)(new File([bytes], /\.mov$/i.test(file.name) ? "stimulus.mov" : "stimulus.mp4", { type: /\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4" }))); }
    catch (error) {
      if (error instanceof SceneError) throw error;
      return fail("Muse returned an invalid structured scene description. Retry discovery or enter a concept manually.", "malformed", 502);
    }
    if (!result.candidates.length || result.candidates.every(c => c.confidence < .5)) return fail("No confident trackable concept was found. Try manual concept entry or choose another clip.", "no_candidates", 422);
    result.candidates = result.candidates.filter(c => c.confidence >= .5);
    const scene = retainScene({ id: randomUUID(), run_id: recorder.run_id, provider: mode === "fixture" ? "CausalFly fixture" : "Meta", model, mode: attribution, mediaSha256, result });
    recorder.event("meta.scene.completed", { sceneId: scene.id, candidateCount: result.candidates.length });
    return reply({ ok: true, scene, diagnostics: recorder.snapshot() });
  } catch (error) {
    if (error instanceof SceneError) return fail(error.message, error.kind, error.kind === "configuration" ? 503 : 502);
    return fail("Muse could not read this video. Choose an MP4/MOV of at most 15 seconds, 20 MiB and 1920 pixels per side, or enter a concept manually.", "media");
  } finally {
    active.delete(token!);
    if (recent.size >= 200) recent.delete(recent.keys().next().value!);
    recent.set(token!, Date.now() + 10 * 60 * 1000);
  }
}
