import test from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import { canonicalFlyTransform, FLY_CANONICAL_SPAN } from "./fly-model";
test("both fly implementations normalize actual rest bounds to identical arena span, center, and floor", () => {
  for (const bounds of [new Box3(new Vector3(-20, -3, 6), new Vector3(30, 15, 16)), new Box3(new Vector3(-1.55, -.78, -1.64), new Vector3(1.55, .8, 1.66))]) {
    const before = bounds.clone(), transform = canonicalFlyTransform(bounds);
    const min = bounds.min.clone().multiplyScalar(transform.scale).add(transform.position), max = bounds.max.clone().multiplyScalar(transform.scale).add(transform.position);
    assert.ok(Math.abs(Math.max(max.x - min.x, max.z - min.z) - FLY_CANONICAL_SPAN) < 1e-12);
    assert.ok(Math.abs(min.x + max.x) < 1e-12 && Math.abs(min.z + max.z) < 1e-12);
    assert.ok(Math.abs(min.y - .025) < 1e-12); assert.deepEqual(bounds, before);
  }
});
