import type { PerceptionResponse } from "../perception/contracts";

export type PerceptionAnalysis = Extract<PerceptionResponse, { ok: true }>;
/** Workspace-owned browser state: navigation and panel unmounts cannot discard the pending stimulus. */
export interface PerceptionSession {
  source: "synthetic" | "perception";
  analysis?: PerceptionAnalysis;
  file?: File;
  analyzedFile?: File;
  url: string;
  concept: string;
  ready: boolean;
  editing: boolean;
}
export function initialPerceptionSession(): PerceptionSession {
  return { source: "synthetic", url: "", concept: "hand", ready: false, editing: false };
}
export function conceptForVideo(name: string, previous: string): string {
  return name.toLowerCase() === "perception-calibration.mp4" ? "red square" : previous;
}
