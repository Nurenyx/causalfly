import test from "node:test";
import assert from "node:assert/strict";
import { extractFeatures, selectTrack } from "./features";
import { offlinePerceptionFixture } from "./fixture";

const fixture = offlinePerceptionFixture("test");
const boxes = fixture.measurement.frames;
test("documented box expansion mapping is exact, ordered, deterministic, and does not mutate geometry", () => {
  const input = [...structuredClone(boxes)].reverse();
  const before = JSON.stringify(input);
  const m = extractFeatures("0", input, fixture.media);
  assert.equal(m.firstArea, .08); assert.equal(m.lastArea, .4);
  assert.equal(m.netAreaChange, .32); assert.equal(m.amplitude, .64);
  assert.equal(m.frames[0].centroidX, .5); assert.equal(m.frames[0].centroidY, .5);
  assert.equal(m.frames[0].areaChange, 0); assert.equal(m.frames[0].areaGrowthPerSecond, 0);
  assert.equal(m.frames[1].areaGrowthPerSecond, (m.frames[1].area - m.frames[0].area) / .5);
  assert.deepEqual(m, extractFeatures("0", input, fixture.media));
  assert.equal(JSON.stringify(input), before);
});
test("shrinkage and stillness map to zero; large growth saturates at one", () => {
  const small = { frameIndex: 0, left: 0, top: 0, right: 64, bottom: 48 };
  const full = { frameIndex: 1, left: 0, top: 0, right: 640, bottom: 480 };
  assert.equal(extractFeatures("0", [small, full], fixture.media).amplitude, 1);
  assert.equal(extractFeatures("0", [{ ...full, frameIndex: 0 }, { ...small, frameIndex: 1 }], fixture.media).amplitude, 0);
  assert.equal(extractFeatures("0", [small, { ...small, frameIndex: 1 }], fixture.media).amplitude, 0);
});
test("VFR times and gaps use actual presentation timestamps without fabricated observations", () => {
  const m = extractFeatures("0", [boxes[0], boxes[3]], { ...fixture.media, frameTimes: [0, .1, .2, 1.7] });
  assert.equal(m.frames.length, 2); assert.equal(m.frames[1].timeSeconds, 1.7);
  assert.equal(m.frames[1].areaGrowthPerSecond, .32 / 1.7);
  assert.equal(m.amplitude, .64);
});
test("invalid geometry, missing time, duplicate frames, and insufficient tracks are rejected", () => {
  for (const input of [[], [boxes[0]], [boxes[0], boxes[0]], [boxes[0], { ...boxes[1], left: -1 }], [boxes[0], { ...boxes[1], right: Infinity }], [boxes[0], { ...boxes[1], right: 641 }], [boxes[0], { ...boxes[1], right: boxes[1].left }], [boxes[0], { ...boxes[1], frameIndex: 99 }]]) assert.throws(() => extractFeatures("0", input, fixture.media));
  assert.throws(() => extractFeatures("0", boxes, { ...fixture.media, width: 0 }));
  assert.throws(() => extractFeatures("0", boxes, { ...fixture.media, frameTimes: [0, 0, 1, 1.5] }));
});
test("one identity is selected by longest track then numeric ID; identities are never stitched", () => {
  assert.equal(selectTrack(new Map([["10", boxes], ["2", boxes], ["0", boxes.slice(0, 2)]]))[0], "2");
  assert.throws(() => selectTrack(new Map()), /no matching object/);
});
