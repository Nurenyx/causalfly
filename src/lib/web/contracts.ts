import type { ExperimentSpec } from "../experiment/types";
import type { CompactEvidencePayload } from "../meta/compact-evidence";
import type { ScientificAnalysis } from "../meta/schemas";

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
