import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = "public/models/flyv2/";
const bytes = readFileSync(`${root}FlyVisualV2_Web.glb`);
const manifest = JSON.parse(readFileSync(`${root}web-build.json`, "utf8"));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());

test("delivered FlyV2 binary matches the manifest, LOD1 budget, rig, and embedded PBR textures", () => {
  assert.equal(bytes.toString("ascii", 0, 4), "glTF"); assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.length, manifest.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.sha256);
  const primitives = gltf.meshes.flatMap((mesh: { primitives: { indices: number; attributes: { POSITION: number } }[] }) => mesh.primitives);
  assert.equal(primitives.reduce((sum: number, p: { indices: number }) => sum + gltf.accessors[p.indices].count / 3, 0), 55567);
  assert.equal(primitives.reduce((sum: number, p: { attributes: { POSITION: number } }) => sum + gltf.accessors[p.attributes.POSITION].count, 0), manifest.vertices);
  assert.equal(primitives.length, 3); assert.equal(gltf.skins[0].joints.length, 93);
  assert.ok(gltf.nodes.some((node: { name?: string }) => node.name === "wing_left_phi"));
  assert.ok(gltf.nodes.some((node: { name?: string }) => node.name === "wing_right_phi"));
  assert.equal(gltf.images.length, 3);
  for (const image of gltf.images) {
    assert.equal(image.uri, undefined, "No external image/CDN dependency");
    const start = 28 + jsonLength + (gltf.bufferViews[image.bufferView].byteOffset ?? 0);
    assert.equal(bytes.readUInt32BE(start + 16), 1024); assert.equal(bytes.readUInt32BE(start + 20), 1024);
  }
  const wings = gltf.materials.find((m: { name: string }) => m.name === "FlyV2_Wings");
  assert.equal(wings.alphaMode, "BLEND"); assert.equal(wings.doubleSided, true);
  assert.ok(wings.pbrMetallicRoughness.baseColorFactor[3] < .2);
});

test("FlyBody attribution, pinned source, sex and full upstream license survive web conversion", () => {
  const lock = JSON.parse(readFileSync(`${root}source-lock.json`, "utf8"));
  const source = JSON.parse(readFileSync(`${root}source-build-report.json`, "utf8"));
  const notice = readFileSync(`${root}NOTICE.txt`, "utf8");
  assert.equal(manifest.upstream_repository, lock.repository);
  assert.equal(manifest.upstream_commit, source.source_commit); assert.equal(lock.commit, source.source_commit);
  assert.equal(manifest.source_sex, "female"); assert.equal(source.source_sex, "female");
  assert.deepEqual(manifest.male_modifications, []); assert.deepEqual(source.male_modifications, []);
  assert.equal(manifest.upstream_blend_sha256, source.source_sha256);
  assert.match(notice, /NOT authored from scratch/); assert.match(notice, /predate the/);
  assert.match(notice, /not sex-matched/); assert.match(notice, /NOT\s+measured biological/);
  // Git may convert this text asset to CRLF on Windows; upstream pins canonical LF bytes.
  const licenseHash = createHash("sha256").update(readFileSync(`${root}LICENSE-FlyBody.txt`, "utf8").replace(/\r\n/g, "\n")).digest("hex");
  assert.equal(licenseHash, lock.files.find((file: { path: string }) => file.path === "LICENSE").sha256);
});
