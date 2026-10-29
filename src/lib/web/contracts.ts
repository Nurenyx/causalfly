import type { ExperimentSpec } from "../experiment/types";
import type { CompactEvidencePayload } from "../meta/compact-evidence";
import type { ScientificAnalysis } from "../meta/schemas";
import type { PerceptionRecord } from "../perception/contracts";

export type ExecutionMode = "META LIVE" | "FAKE META CLIENT";

/** Model-authored text stays separate from engine-produced evidence. */
export interface WebExperimentResult {
  researchQuestion: string;
  mode: ExecutionMode;
  spec: ExperimentSpec;
  measuredEvidence: CompactEvidencePayload["comparison"];
  provenance: CompactEvidencePayload["provenance"];
  analysis: ScientificAnalysis;
}

export type WebExperimentResponse =
  | { ok: true; result: WebExperimentResult }
  | { ok: false; error: string; kind: "validation" | "configuration" | "provider" };

export interface WebStatus {
  mode: ExecutionMode | null;
  error?: string;
}

export interface RuntimeCall {
  task: "design" | "interpret";
  mode: ExecutionMode;
  model: string;
  requestedAt: string;
  completedAt: string;
}
export type MeasuredExperimentResult = Omit<WebExperimentResult, "analysis"> & {
  perceptionInput?: PerceptionRecord;
  analysis?: ScientificAnalysis;
  runtimeCalls?: readonly RuntimeCall[];
  stimulusOverride?: StimulusOverride;
};
export interface StimulusOverride {
  sourceDesignId: string;
  originalAmplitude: number;
  amplitude: number;
}
export interface GuidedDesign {
  perceptionInput?: PerceptionRecord;
  id: string;
  researchQuestion: string;
  mode: ExecutionMode;
  spec: ExperimentSpec;
  runtimeCalls: readonly RuntimeCall[];
  stimulusOverride?: StimulusOverride;
}
export type GuidedResponse = { ok: true; design: GuidedDesign; result?: MeasuredExperimentResult } |
  { ok: false; kind: "validation" | "configuration" | "provider"; error: string };
