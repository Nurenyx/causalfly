import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ANATOMY_HASH, parseAnatomy, projectAnatomy } from "./anatomy";
import { connectomeHash } from "./fruitfly-protocol";

const fixture = () => ({ dataset: "male-cns:v1.0", connectomeSha256: ANATOMY_HASH, coordinateSemantics: "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED", capturedAt: "2026-10-27T12:00:00Z", count: 3, points: [[1, 0, 10, 0], [2, 10, 20, 5], [3, 20, 30, 10]] });

test("anatomy requires the same pinned source identity and complete finite unique coordinate records", () => {
  assert.equal(ANATOMY_HASH, connectomeHash);
  const a = fixture(); assert.equal(parseAnatomy(a), a);
  for (const overrides of [{ dataset: "unknown" }, { connectomeSha256: "other" }, { coordinateSemantics: "invented" }, { capturedAt: "invalid" }, { count: 4 }, { count: 0 }, { points: [[1, 0, 0, 0], [1, 1, 1, 1], [3, 0, 0, 0]] }, { points: [[1, 0, 0, 0], [2, Infinity, 0, 0], [3, 0, 0, 0]] }, { points: [[1, 0, 0], [2, 0, 0, 0], [3, 0, 0, 0]] }]) assert.throws(() => parseAnatomy({ ...a, ...overrides }));
});

test("projection preserves actual ID lookup and raw coordinates with a uniform display scale", () => {
  const a = parseAnatomy(fixture()); const before = JSON.stringify(a);
  const p = projectAnatomy(a);
  assert.deepEqual([...p.lookup.keys()], [1, 2, 3]);
  assert.deepEqual(p.lookup.get(2)?.raw, [10, 20, 5]);
  assert.equal(p.lookup.get(99), undefined); // Missing coordinates never become origin points.
  assert.equal(p.lookup.get(2)!.x, 450);
  assert.equal(p.lookup.get(2)!.y, 165);
  assert.equal((p.lookup.get(3)!.x - p.lookup.get(1)!.x) / 20, (p.lookup.get(3)!.y - p.lookup.get(1)!.y) / 20);
  assert.equal(JSON.stringify(a), before);
});

test("structural rendering is bounded while all coordinates stay available for incoming ID matching", () => {
  const points = Array.from({ length: 20000 }, (_, i) => [i + 1, i, 0, i]);
  const p = projectAnatomy(parseAnatomy({ ...fixture(), count: points.length, points }));
  assert.ok(p.sample.length <= 8000); assert.equal(p.lookup.size, 20000);
  assert.ok(p.lookup.has(20000)); assert.ok(p.sample.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
});

test("a degenerate projection stays finite without inventing additional structure", () => {
  const p = projectAnatomy(parseAnatomy({ ...fixture(), count: 1, points: [[9, 4, 4, 4]] }));
  assert.equal(p.sample.length, 1); assert.equal(p.sample[0].x, 450); assert.equal(p.sample[0].y, 165);
});

test("the captured real static asset validates offline and contains only published coordinate data", () => {
  const a = parseAnatomy(JSON.parse(readFileSync("public/anatomy/male-cns-v1.json", "utf8")));
  assert.equal(a.count, 141781);
  assert.ok(a.points.every(p => p.length === 4));
  assert.deepEqual(Object.keys(a).sort(), ["capturedAt", "connectomeSha256", "coordinateSemantics", "count", "dataset", "points"]);
});
