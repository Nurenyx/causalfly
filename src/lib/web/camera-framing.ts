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

/** Fit actual soma positions, not empty AABB corners. Fill the viewport's short
 * axis to 78%, with an unclipped 4% edge margin when the other axis constrains it.
 * Derived solely from structure and viewport; never from incoming activity. */
export function fitPerspectivePositions(positions: Float32Array, fov: number, aspect: number, coverage = .78) {
  const bounds = positionBounds(positions);
  if (!positions.length) return { ...fitPerspectiveBounds(bounds, fov, aspect), shortAxisCoverage: 0 };
  const origin = bounds.getCenter(new Vector3());
  const toward = new Vector3(1.1, .5, 2.3).normalize();
  const right = new Vector3(0, 1, 0).cross(toward).normalize(), up = toward.clone().cross(right).normalize();
  const coordinates = new Float64Array(positions.length);
  let nearDepth = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const p = new Vector3(positions[i], positions[i + 1], positions[i + 2]).sub(origin);
    coordinates[i] = p.dot(right); coordinates[i + 1] = p.dot(up); coordinates[i + 2] = p.dot(toward);
    nearDepth = Math.max(nearDepth, coordinates[i + 2]);
  }
  const safeAspect = Math.max(aspect, .01), tanY = Math.tan(fov * Math.PI / 360), tanX = tanY * safeAspect;
  let shiftX = 0, shiftY = 0;
  function projected(distance: number) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < coordinates.length; i += 3) {
      const depth = distance - coordinates[i + 2];
      const x = (coordinates[i] - shiftX) / (depth * tanX), y = (coordinates[i + 1] - shiftY) / (depth * tanY);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY, shortAxisCoverage: safeAspect >= 1 ? (maxY - minY) / 2 : (maxX - minX) / 2 };
  }
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, .01);
  let distance = radius * 10;
  for (let recenter = 0; recenter < 6; recenter++) {
    let low = Math.max(.01, nearDepth + .01), high = Math.max(low + 1, radius * 20);
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2, p = projected(mid);
      if (p.shortAxisCoverage <= coverage && Math.max(Math.abs(p.minX), Math.abs(p.maxX), Math.abs(p.minY), Math.abs(p.maxY)) <= .96) high = mid;
      else low = mid;
    }
    distance = high;
    if (recenter < 5) {
      const p = projected(distance);
      shiftX += (p.minX + p.maxX) / 2 * distance * tanX;
      shiftY += (p.minY + p.maxY) / 2 * distance * tanY;
    }
  }
  const center = origin.clone().addScaledVector(right, shiftX).addScaledVector(up, shiftY);
  return { center, radius, distance, position: center.clone().addScaledVector(toward, distance), near: Math.max(.001, distance - radius * 2), far: distance + radius * 4, shortAxisCoverage: projected(distance).shortAxisCoverage };
}
