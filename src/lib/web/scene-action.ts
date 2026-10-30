import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { discoverScene, sceneConfiguration, SceneError } from "../meta/scene-client";
import { assertMetaEnabled } from "../meta/client";
import { MediaError, resolveMedia } from "../perception/blob-media";
import { mediaReference } from "../perception/blob-contract";
import { inspectVideo } from "../perception/media";
import { offlineScene, parseScene, type SceneResponse } from "../perception/scene";
import { retainScene } from "../perception/scene-store";
import { boundedBody } from "./perception-action";
import { FlightRecorder } from "./flight-recorder";

const active = new Set<string>(), recent = new Map<string, number>();
export async function sceneAction(request: Request, deps: { discover?: typeof discoverScene; inspect?: typeof inspectVideo; resolve?: typeof resolveMedia } = {}): Promise<Response> {
  let recorder = new FlightRecorder();
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
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return fail("Choose secure direct upload; video bytes are not accepted here.", "media");
    const input = JSON.parse((await boundedBody(request, 4096)).toString());
    const parsed = z.discriminatedUnion("mode", [z.strictObject({ mode: z.literal("fixture") }), z.strictObject({ mode: z.literal("live"), media: mediaReference })]).parse(input);
    const mode = parsed.mode;
    let file: File, mediaSha256: string;
    if (mode === "fixture") {
      const bytes = await readFile("public/perception-calibration.mp4");
      mediaSha256 = createHash("sha256").update(bytes).digest("hex");
      file = new File([bytes], "stimulus.mp4", { type: "video/mp4" });
    } else {
      assertMetaEnabled();
      const resolved = await (deps.resolve ?? resolveMedia)((parsed as { media: unknown }).media);
      file = resolved.file; mediaSha256 = resolved.identity.sha256; recorder = resolved.recorder;
    }
    const model = mode === "fixture" ? "calibration-scene-v1" : deps.discover ? "injected-test-model" : sceneConfiguration().model;
    const attribution = mode === "fixture" ? "OFFLINE SCENE-UNDERSTANDING FIXTURE" as const : "META LIVE" as const;
    recorder.model("scene", model, attribution);
    recorder.event("meta.scene.requested", { code: "explicit_user_request", model, mode: attribution, provider: mode === "fixture" ? "CausalFly fixture" : "Meta" });
    let result;
    try { result = mode === "fixture" ? structuredClone(offlineScene) : parseScene(await (deps.discover ?? discoverScene)(file)); }
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
    if (error instanceof Error && /Live Meta is disabled/.test(error.message)) return fail(error.message, "configuration", 503);
    if (error instanceof MediaError) return fail(error.message, "media");
    if (error instanceof SceneError) return fail(error.message, error.kind, error.kind === "configuration" ? 503 : 502);
    return fail("Muse could not read this video. Choose an MP4/MOV of at most 15 seconds, 20 MiB and 1920 pixels per side, or enter a concept manually.", "media");
  } finally {
    active.delete(token!);
    if (recent.size >= 200) recent.delete(recent.keys().next().value!);
    recent.set(token!, Date.now() + 10 * 60 * 1000);
  }
}
