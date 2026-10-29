import { extractFeatures } from "./features";
import { SAM_MODEL, type PerceptionRecord } from "./contracts";

/** Explicit offline adapter; never substituted for a failed live request. */
export function offlinePerceptionFixture(id: string): PerceptionRecord {
  const media = { width: 640, height: 480, durationSeconds: 2, frameTimes: [0, .5, 1, 1.5] };
  const boxes = [
    { frameIndex: 0, left: 256, top: 144, right: 384, bottom: 336 },
    { frameIndex: 1, left: 224, top: 120, right: 416, bottom: 360 },
    { frameIndex: 2, left: 192, top: 96, right: 448, bottom: 384 },
    { frameIndex: 3, left: 160, top: 48, right: 480, bottom: 432 },
  ];
  return { id, model: SAM_MODEL, mode: "OFFLINE SAM FIXTURE", concept: "test object", media,
    measurement: extractFeatures("0", boxes, media),
    provenance: { requestedAt: "2026-10-01T00:00:00.000Z", completedAt: "2026-10-01T00:00:00.000Z", mediaSha256: "offline-no-media", cleanup: "not-uploaded", parser: "offline-geometry-fixture", warnings: ["Synthetic geometry fixture. No video, SAM detection, or live Meta request."] } };
}
