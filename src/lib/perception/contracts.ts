import type { VideoSegmentationSnapshot } from "@meta-sam/parser";

export const SAM_MODEL = "sam-3.1" as const;
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 15;
export const MAX_VIDEO_FRAMES = 900;
export const MAPPING_RULE = "box-expansion-v1: clamp(max(0, lastArea - firstArea) / 0.5, 0, 1)";

export interface VideoMetadata {
  width: number; height: number; durationSeconds: number;
  /** Presentation-order timestamps from the file, not estimated FPS. */
  frameTimes: readonly number[];
}
export interface TrackedBox {
  frameIndex: number; left: number; top: number; right: number; bottom: number;
}
export interface FrameFeature extends TrackedBox {
  timeSeconds: number; area: number; centroidX: number; centroidY: number;
  areaChange: number; areaGrowthPerSecond: number;
}
export interface PerceptionMeasurement {
  objectId: string;
  selectionRule: "longest-track-then-numeric-id";
  frames: readonly FrameFeature[];
  firstArea: number; lastArea: number; netAreaChange: number;
  expansion: number; amplitude: number; mappingRule: typeof MAPPING_RULE;
}
/** Input provenance, explicitly separate from neural causal evidence. */
export interface PerceptionRecord {
  id: string; model: typeof SAM_MODEL;
  mode: "SAM LIVE" | "OFFLINE SAM FIXTURE";
  concept: string; media: VideoMetadata;
  measurement: PerceptionMeasurement;
  provenance: {
    requestedAt: string; completedAt: string; mediaSha256: string;
    responseId?: string; requestId?: string;
    cleanup: "deleted" | "delete-failed-expires-in-1h" | "not-uploaded";
    parser: "@meta-sam/parser@0.1.0" | "offline-geometry-fixture";
    warnings: readonly string[];
  };
}
export type PerceptionResponse =
  | { ok: true; perception: PerceptionRecord; receipt?: string; overlay?: VideoSegmentationSnapshot }
  | { ok: false; error: string; kind: "validation" | "configuration" | "provider" };
