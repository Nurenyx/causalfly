/** Static published structure, captured separately; never neural dynamics. */
export interface Anatomy {
  dataset: "male-cns:v1.0";
  connectomeSha256: string;
  coordinateSemantics: "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED";
  capturedAt: string;
  count: number;
  points: [number, number, number, number][]; // ID, raw voxel X, Y, Z
}
export const ANATOMY_HASH = "e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3";
export function parseAnatomy(value: unknown): Anatomy {
  const a = value as Anatomy;
  if (!a || a.dataset !== "male-cns:v1.0" || a.connectomeSha256 !== ANATOMY_HASH || a.coordinateSemantics !== "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED" || !Number.isFinite(Date.parse(a.capturedAt)) || !Number.isSafeInteger(a.count) || a.count <= 0 || a.count > 176422 || !Array.isArray(a.points) || a.points.length !== a.count) throw new Error("Invalid static anatomy");
  const ids = new Set<number>();
  for (const point of a.points) {
    if (!Array.isArray(point) || point.length !== 4 || !Number.isSafeInteger(point[0]) || point[0] <= 0 || !point.slice(1).every(Number.isFinite) || ids.has(point[0])) throw new Error("Invalid coordinate record");
    ids.add(point[0]);
  }
  return a;
}
export function projectAnatomy(anatomy: Anatomy) {
  // Raw X/Y projection. No anatomical orientation or physical scale is inferred.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [, x, y] of anatomy.points) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const scale = Math.min(700 / Math.max(1, maxX - minX), 280 / Math.max(1, maxY - minY));
  const lookup = new Map(anatomy.points.map(([id, x, y, z]) => [id, { id, x: 450 + (x - (minX + maxX) / 2) * scale, y: 165 + (y - (minY + maxY) / 2) * scale, raw: [x, y, z] }]));
  const stride = Math.max(1, Math.ceil(anatomy.count / 8000));
  return { lookup, sample: anatomy.points.filter((_, index) => index % stride === 0).map(([id]) => lookup.get(id)!) };
}
