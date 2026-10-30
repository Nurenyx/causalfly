import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { type get, type head, type list } from "@vercel/blob";
import { authorizeMedia, resolveMedia, verifyMediaReference, cleanupMedia, MEDIA_LIFETIME_MS, CLEANUP_GRACE_MS } from "./blob-media";
import { inspectVideo } from "./media";
import { MAX_VIDEO_BYTES } from "./contracts";
import { offlinePerceptionFixture } from "./fixture";
import { perceptionAction } from "../web/perception-action";
import { sceneAction } from "../web/scene-action";
import { offlineScene } from "./scene";
import { LiveMetaClient } from "../meta/client";
import { analyzeSamVideo } from "../meta/sam-client";
import { discoverScene } from "../meta/scene-client";
import { mediaAuthorization, mediaCleanup } from "../web/media-action";
import { retainedRecorder } from "../web/flight-recorder";

process.env.CAUSALFLY_MEDIA_SIGNING_SECRET = "test-only-signing-secret-at-least-32-characters";
process.env.CAUSALFLY_META_ENABLED = "1";
process.env.CAUSALFLY_FAKE_META = "0";
const input = { originalFilename: "clip.mp4", contentType: "video/mp4" as const, sizeBytes: MAX_VIDEO_BYTES };
const grants: unknown[] = [];
const signing = {
  issueSignedToken: async (options: unknown) => { grants.push(options); return { delegationToken: "PRIVATE_DELEGATION", clientSigningToken: "PRIVATE_SIGNING_TOKEN", validUntil: Date.now() + 300_000 }; },
  presignUrl: async (_token: unknown, options: unknown) => { grants.push(options); return { presignedUrl: "https://blob.example/put?vercel-blob-signature=PRIVATE_SIGNATURE" }; },
};
const forbidden = async () => { assert.fail("No paid provider or real storage calls"); };
async function uploaded(bytes: Uint8Array = new Uint8Array(MAX_VIDEO_BYTES)) {
  const authorization = await authorizeMedia({ ...input, sizeBytes: bytes.length }, signing);
  const ticket = verifyMediaReference(authorization.reference);
  const metadata = { url: `https://test.private.blob.vercel-storage.com/${ticket.blobPathname}`, pathname: ticket.blobPathname, contentType: "video/mp4", size: bytes.length, uploadedAt: new Date(), etag: '"immutable"' } as Awaited<ReturnType<typeof head>>;
  const storage = {
    head: async () => metadata,
    get: async () => ({ statusCode: 200, stream: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } }), headers: new Headers(), blob: metadata }) as unknown as Awaited<ReturnType<typeof get>>,
  };
  return { authorization, ticket, metadata, storage };
}
const request = (path: string, body: unknown, token = randomUUID()) => new Request(`http://localhost${path}`, { method: "POST", headers: { "Content-Type": "application/json", [path.endsWith("scene") ? "X-Scene-Request" : "X-Perception-Request"]: token }, body: JSON.stringify(body) });

test("20 MiB product boundary is allowed; authorization is private, random, write-only, MIME-bound and five minutes", async () => {
  grants.length = 0;
  const first = await authorizeMedia(input, signing), second = await authorizeMedia(input, signing);
  const ticket = verifyMediaReference(first.reference);
  assert.notEqual(ticket.blobPathname, verifyMediaReference(second.reference).blobPathname);
  assert.match(ticket.blobPathname, /^causalfly\/tmp\/v1\/\d+\/[0-9a-f-]+\.mp4$/);
  const [delegation, put] = grants as [Record<string, unknown>, Record<string, unknown>];
  assert.deepEqual(delegation.operations, ["put"]); assert.equal(delegation.maximumSizeInBytes, MAX_VIDEO_BYTES);
  assert.deepEqual(delegation.allowedContentTypes, ["video/mp4"]);
  assert.equal(delegation.validUntil, ticket.issued + 300_000);
  assert.equal(put.operation, "put"); assert.equal(put.access, "private"); assert.equal(put.allowOverwrite, false); assert.equal(put.addRandomSuffix, false);
  assert.equal(put.pathname, ticket.blobPathname);
  assert.doesNotMatch(JSON.stringify(first), /PRIVATE_SIGNING_TOKEN|PRIVATE_DELEGATION/);
});

test("oversize, empty, arbitrary pathname, MIME and extension mismatch fail before storage signing", async () => {
  for (const invalid of [{ ...input, sizeBytes: MAX_VIDEO_BYTES + 1 }, { ...input, sizeBytes: 0 }, { ...input, pathname: "other-owner/movie.mp4" }, { ...input, contentType: "image/png" }, { ...input, originalFilename: "clip.mov" }, { ...input, originalFilename: "https://evil.test/clip.mp4" }]) await assert.rejects(authorizeMedia(invalid, { issueSignedToken: forbidden, presignUrl: forbidden }));
});

test("canonical server reference rejects URL substitution, tampering and expiry without storage calls", async () => {
  const { authorization, ticket } = await uploaded();
  for (const invalid of [{ url: "https://evil.test/video.mp4" }, { ticket: "https://evil.test/video.mp4" }, { ...authorization.reference, url: "https://evil.test" }, { ticket: authorization.reference.ticket + "tampered" }]) {
    await assert.rejects(resolveMedia(invalid, { head: forbidden, get: forbidden }), /invalid or expired/);
  }
  assert.throws(() => verifyMediaReference(authorization.reference, ticket.expires), /invalid or expired/);
  assert.throws(() => verifyMediaReference(authorization.reference, ticket.issued - 1), /invalid or expired/);
});

test("authoritative metadata checks precede download/analysis, including private store and size", async () => {
  const { authorization, metadata } = await uploaded();
  for (const changed of [{ size: MAX_VIDEO_BYTES + 1 }, { contentType: "image/png" }, { pathname: "other/clip.mp4" }, { url: "https://test.public.blob.vercel-storage.com/clip.mp4" }]) await assert.rejects(resolveMedia(authorization.reference, { head: async () => ({ ...metadata, ...changed }), get: forbidden }), /metadata does not match/);
  await assert.rejects(resolveMedia(authorization.reference, { head: async () => { throw new Error("missing Blob"); }, get: forbidden }));
});

test("20 MiB Blob resolves, inspects actual bytes and records immutable identity with no signed URL", async () => {
  const bytes = Buffer.alloc(MAX_VIDEO_BYTES); (await readFile("public/perception-calibration.mp4")).copy(bytes);
  const { authorization, storage } = await uploaded(bytes); let inspected = 0;
  const resolved = await resolveMedia(authorization.reference, storage, async bytes => { inspected = bytes.length; return inspectVideo(bytes); });
  assert.equal(inspected, MAX_VIDEO_BYTES); assert.equal(resolved.file.size, MAX_VIDEO_BYTES);
  assert.equal(resolved.identity.storageAccess, "private"); assert.match(resolved.identity.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(resolved.recorder.snapshot().manifest.media, resolved.identity);
  const diagnostics = JSON.stringify(resolved.recorder.snapshot());
  for (const secret of [authorization.reference.ticket, "PRIVATE_SIGNATURE", "PRIVATE_SIGNING_TOKEN", "vercel-blob-signature", "presignedUrl"]) assert.ok(!diagnostics.includes(secret));
  assert.deepEqual(resolved.recorder.snapshot().events.map(e => e.type), ["run.created", "media.selected", "media.upload.authorized", "media.upload.completed", "media.validated"]);
});

test("invalid video container and changed or truncated downloads fail before provider handoff", async () => {
  const { authorization, storage, metadata } = await uploaded(new Uint8Array([1, 2]));
  await assert.rejects(resolveMedia(authorization.reference, storage), /Unable to read/);
  await assert.rejects(resolveMedia(authorization.reference, { ...storage, get: async () => null }), /unavailable or changed/);
  const short = { ...storage, get: async () => ({ statusCode: 200, blob: metadata, stream: new ReadableStream({ start(c) { c.close(); } }) }) as unknown as Awaited<ReturnType<typeof get>> };
  await assert.rejects(resolveMedia(authorization.reference, short), /incomplete Blob/);
});

test("scene then SAM use the same validated file and correlated recorder; failure permits explicit retry", async () => {
  const bytes = await readFile("public/perception-calibration.mp4");
  const { authorization, storage } = await uploaded(bytes);
  const resolve = (ref: unknown) => resolveMedia(ref, storage);
  const sceneResponse = await sceneAction(request("/api/perception/scene", { mode: "live", media: authorization.reference }), { resolve, discover: async file => { assert.equal(file.size, bytes.length); return JSON.stringify(offlineScene); } });
  const scene = (await sceneResponse.json()).scene; assert.equal(sceneResponse.status, 200);
  let calls = 0;
  const analyze = async () => { calls++; throw new Error("PRIVATE_PROVIDER_ERROR"); };
  const body = { mode: "live", media: authorization.reference, concept: "red square", sceneId: scene.id, candidate: "0" };
  const token = randomUUID();
  const failed = await perceptionAction(request("/api/perception", body, token), { resolve, analyze });
  assert.equal((await failed.json()).ok, false);
  assert.equal((await perceptionAction(request("/api/perception", body, token), { resolve, analyze })).status, 409);
  const fixture = offlinePerceptionFixture("test");
  const success = await perceptionAction(request("/api/perception", body), { resolve, analyze: async file => { calls++; assert.equal(file.size, bytes.length); return { measurement: fixture.measurement, overlay: {} as never, provenance: { ...fixture.provenance, responseId: undefined, requestId: undefined, warnings: [], parser: "@meta-sam/parser@0.1.0" as const } }; } });
  const result = await success.json(); assert.equal(success.status, 200); assert.equal(calls, 2);
  const recorder = retainedRecorder(scene.run_id)!;
  const liveSnapshot = recorder.snapshot();
  recorder.perception(undefined);
  assert.equal(recorder.snapshot().manifest.media, undefined);
  assert.equal(liveSnapshot.manifest.media?.sha256, result.perception.provenance.storage.sha256);
  recorder.perception(offlinePerceptionFixture("offline-next"));
  assert.equal(recorder.snapshot().manifest.media, undefined);
  assert.equal(result.perception.run_id, scene.run_id); assert.equal(result.perception.provenance.storage.sha256, scene.mediaSha256);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /PRIVATE_PROVIDER_ERROR|presignedUrl|vercel-blob-signature/);
});

test("kill switch prevents route resolution and all direct live transport invocations with valid credentials", async () => {
  process.env.CAUSALFLY_META_ENABLED = "0";
  try {
    const env = { CAUSALFLY_META_ENABLED: "0", META_API_KEY: "SECRET_VALID_CONFIG", META_BASE_URL: "https://api.meta.ai/v1", META_MODEL: "muse-wonder-1.0", META_SCENE_MODEL: "muse-spark-1.3" };
    assert.throws(() => new LiveMetaClient(env, forbidden), /disabled/);
    const runtimeEnv = { ...env, CAUSALFLY_META_ENABLED: "1" };
    const client = new LiveMetaClient(runtimeEnv, forbidden);
    runtimeEnv.CAUSALFLY_META_ENABLED = "0";
    for (const task of ["design", "interpret", "observe"] as const) await assert.rejects(client.complete({ task, system: "", inputJson: "{}", responseSchema: {} }), /disabled/);
    await assert.rejects(discoverScene(new File([""], "clip.mp4"), { env, fetch: forbidden }), /disabled/);
    await assert.rejects(analyzeSamVideo(new File([""], "clip.mp4"), "hand", offlinePerceptionFixture("t").media, { env, fetch: forbidden }), /disabled/);
    assert.equal((await perceptionAction(request("/api/perception", { mode: "live", media: { ticket: "invalid" }, concept: "hand" }), { resolve: forbidden, analyze: forbidden })).status, 503);
    assert.equal((await sceneAction(request("/api/perception/scene", { mode: "live", media: { ticket: "invalid" } }), { resolve: forbidden, discover: forbidden })).status, 503);
    const scene = await (await sceneAction(request("/api/perception/scene", { mode: "fixture" }), { discover: forbidden })).json();
    assert.equal(scene.scene.provider, "CausalFly fixture");
    const tracking = await perceptionAction(request("/api/perception", { mode: "fixture", sceneId: scene.scene.id, candidate: "0", concept: "red square" }), { analyze: forbidden });
    assert.equal((await tracking.json()).perception.mode, "OFFLINE SAM FIXTURE");
  } finally { process.env.CAUSALFLY_META_ENABLED = "1"; }
});

test("cleanup deletes only expired namespace objects after execution grace, retaining provenance", async () => {
  const { authorization, ticket } = await uploaded(new Uint8Array([1]));
  const before = JSON.stringify(retainedRecorder(ticket.runId)?.snapshot());
  const now = ticket.issued + MEDIA_LIFETIME_MS + CLEANUP_GRACE_MS + 1, removed: string[] = [];
  const old = { pathname: ticket.blobPathname, url: "https://private.example/old", uploadedAt: new Date(ticket.issued) };
  const active = { ...old, pathname: old.pathname.replace(String(ticket.issued), String(now)), url: "active" };
  await cleanupMedia(undefined, { list: (async () => ({ blobs: [old, active, { ...old, pathname: "results/science.json" }], hasMore: false, cursor: "" }) as Awaited<ReturnType<typeof list>>) as typeof list, del: async url => { removed.push(String(url)); } }, now);
  assert.deepEqual(removed, [old.url]); assert.equal(JSON.stringify(retainedRecorder(ticket.runId)?.snapshot()), before);
  assert.throws(() => verifyMediaReference(authorization.reference, now), /expired/);
});

test("authorization rejects cross-origin requests and cleanup requires an operator secret", async () => {
  assert.equal((await mediaAuthorization(new Request("http://localhost/api/media/authorize", { method: "POST", headers: { Origin: "https://evil.test" } }))).status, 403);
  assert.equal((await mediaCleanup(new Request("http://localhost/api/media/cleanup", { method: "POST" }))).status, 401);
  const form = new FormData(); form.set("video", new File([new Uint8Array(MAX_VIDEO_BYTES)], "clip.mp4"));
  const req = new Request("http://localhost/api/perception", { method: "POST", headers: { "X-Perception-Request": randomUUID() }, body: form });
  assert.equal((await perceptionAction(req, { analyze: forbidden })).status, 400);
});
