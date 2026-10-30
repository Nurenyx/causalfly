import assert from "node:assert/strict";
import test from "node:test";
import { Box3, PerspectiveCamera, Vector3 } from "three";
import { fitPerspectiveBounds, positionBounds } from "./camera-framing";

test("canonical camera targets actual offset bounds and fits every corner at desktop and mobile aspects", () => {
  const bounds = new Box3(new Vector3(4, -7, 12), new Vector3(8, -1, 15));
  for (const aspect of [1920 / 500, 1440 / 500, 390 / 500]) {
    const fit = fitPerspectiveBounds(bounds, 32, aspect);
    assert.deepEqual(fit.center.toArray(), [6, -4, 13.5]);
    const camera = new PerspectiveCamera(32, aspect, fit.near, fit.far);
    camera.position.copy(fit.position); camera.lookAt(fit.center); camera.updateMatrixWorld();
    const target = fit.center.clone().project(camera);
    assert.ok(Math.abs(target.x) < 1e-12 && Math.abs(target.y) < 1e-12);
    for (const x of [4, 8]) for (const y of [-7, -1]) for (const z of [12, 15]) {
      const p = new Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1, `corner inside ${aspect}`);
    }
    assert.deepEqual(fitPerspectiveBounds(bounds, 32, aspect).position, fit.position, "Reset is deterministic");
  }
});

test("structural bounds are derived without mutation, including degenerate data", () => {
  const data = new Float32Array([12, -3, 5, 16, 9, -7]), before = data.slice();
  const box = positionBounds(data);
  assert.deepEqual(box.min.toArray(), [12, -3, -7]); assert.deepEqual(box.max.toArray(), [16, 9, 5]);
  assert.deepEqual(data, before);
  for (const positions of [new Float32Array(), new Float32Array([0, 0, 0])]) {
    const fit = fitPerspectiveBounds(positionBounds(positions), 32, .5);
    assert.ok(Number.isFinite(fit.distance) && fit.near > 0 && fit.far > fit.near);
  }
});

test("polished canonical fit increases projected bounds by about ten percent with the same center and safe margin", () => {
  const bounds = new Box3(new Vector3(-.73, -.52, -1), new Vector3(.73, .52, 1));
  for (const aspect of [1920 / 500, 1440 / 500, 390 / 500]) {
    const previous = fitPerspectiveBounds(bounds, 32, aspect, new Vector3(1.1, .5, 2.3), 1.12);
    const polished = fitPerspectiveBounds(bounds, 32, aspect);
    assert.deepEqual(polished.center, previous.center);
    const extent = (fit: ReturnType<typeof fitPerspectiveBounds>) => {
      const camera = new PerspectiveCamera(32, aspect, fit.near, fit.far);
      camera.position.copy(fit.position); camera.lookAt(fit.center); camera.updateMatrixWorld();
      let largest = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const p = new Vector3(x, y, z).project(camera);
        assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1);
        largest = Math.max(largest, Math.abs(p.x), Math.abs(p.y));
      }
      return largest;
    };
    const before = extent(previous), after = extent(polished);
    assert.ok(after / before > 1.09 && after / before < 1.15);
    assert.ok(after <= 1 / 1.02 + 1e-12, "two-percent fit margin retained");
  }
});
