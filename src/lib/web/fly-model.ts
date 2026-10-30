import { Box3, Vector3 } from "three";

export type FlyModelKind = "anatomical" | "lightweight";
export type FlyModelStatus = "loading" | "ready" | "lightweight" | "fallback";
export const FLY_CANONICAL_SPAN = 3.6;
/** Shared visual normalization; neither model carries biological measurements. */
export function canonicalFlyTransform(bounds: Box3) {
  const size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
  const scale = FLY_CANONICAL_SPAN / Math.max(size.x, size.z, .001);
  return { scale, position: new Vector3(-center.x * scale, -bounds.min.y * scale + .025, -center.z * scale) };
}
