import { Box3, Vector3 } from "three";

/** Camera-only fit. Input coordinates and experiment evidence are never changed. */
export function fitPerspectiveBounds(bounds: Box3, fov: number, aspect: number, direction = new Vector3(1.1, .5, 2.3), margin = 1.02) {
  const center = bounds.getCenter(new Vector3());
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, .01);
  const vertical = fov * Math.PI / 360;
  const tanVertical = Math.tan(vertical), tanHorizontal = tanVertical * Math.max(aspect, .01);
  const towardCamera = direction.clone().normalize();
  const right = new Vector3(0, 1, 0).cross(towardCamera).normalize();
  const up = towardCamera.clone().cross(right).normalize();
  let distance = .01;
  // Fit the eight actual box corners in the canonical camera basis. A sphere
  // alone wastes substantial space for the elongated CNS at wide aspect ratios.
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const relative = new Vector3(x, y, z).sub(center), depth = relative.dot(towardCamera);
    distance = Math.max(distance, Math.abs(relative.dot(right)) * margin / tanHorizontal + depth,
      Math.abs(relative.dot(up)) * margin / tanVertical + depth, depth + .01);
  }
  return {
    center, radius, distance,
    position: center.clone().add(towardCamera.multiplyScalar(distance)),
    near: Math.max(.001, distance - radius * 2), far: distance + radius * 4,
  };
}

/** Derived once per structural buffer, independent of telemetry updates. */
export function positionBounds(positions: Float32Array) {
  const bounds = new Box3();
  for (let i = 0; i < positions.length; i += 3) bounds.expandByPoint(new Vector3(positions[i], positions[i + 1], positions[i + 2]));
  return bounds.isEmpty() ? new Box3(new Vector3(-.01, -.01, -.01), new Vector3(.01, .01, .01)) : bounds;
}
