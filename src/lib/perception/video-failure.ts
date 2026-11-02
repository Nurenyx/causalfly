/** Browser-safe semantics shared by upload transport and perception UI. */
export type VideoFailureKind = "configuration" | "transient" | "validation";
export type VideoStage = "upload" | "scene" | "tracking";
export interface VideoFailure { kind: VideoFailureKind; retryable: boolean; stage: VideoStage; mediaUnavailable?: boolean; retryAction?: "scene" | "tracking" }
export function classifyVideoFailure(stage: VideoStage, details: { code?: string; kind?: string; status?: number; mediaUnavailable?: boolean } = {}): VideoFailure {
  const kind: VideoFailureKind = details.kind === "configuration" || details.code === "UPLOAD_NOT_CONFIGURED" || details.status === 401 || details.status === 403 ? "configuration" : details.code === "UPLOAD_TIMEOUT" || details.code === "STORAGE_UNAVAILABLE" || details.kind === "provider" || details.kind === "malformed" || details.status === 429 || (details.status ?? 0) >= 500 ? "transient" : "validation";
  return { kind, retryable: kind === "transient", stage, ...(details.mediaUnavailable ? { mediaUnavailable: true } : {}) };
}
export class VideoActionError extends Error {
  constructor(message: string, readonly failure: VideoFailure) { super(message); this.name = "VideoActionError"; }
}
export function failureFromError(error: unknown, stage: VideoStage): VideoFailure {
  return error instanceof VideoActionError ? error.failure : { kind: "transient", retryable: true, stage };
}
