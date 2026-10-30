import type { CompactEvidencePayload } from "../meta/compact-evidence";
import type { ExperimentSpec } from "../experiment/types";
import type { ScientificAnalysis } from "../meta/schemas";
import type { PerceptionRecord } from "../perception/contracts";

export type RunEventType =
  | "run.created" | "question.submitted"
  | "meta.scene.requested" | "meta.scene.completed" | "meta.scene.failed" | "meta.scene.selected"
  | "sam.requested" | "sam.completed" | "sam.no_match" | "sam.failed"
  | "stimulus.derived" | "stimulus.accepted"
  | "meta.design.requested" | "meta.design.completed" | "meta.design.rejected" | "meta.design.failed"
  | "experiment.approved" | "experiment.control.completed" | "experiment.intervention.completed" | "experiment.comparison.completed"
  | "meta.interpretation.requested" | "meta.interpretation.completed" | "meta.interpretation.failed"
  | "meta.next_experiment.proposed" | "warning.recorded" | "error.recorded";

export interface RunEvent {
  readonly run_id: string;
  readonly sequence: number;
  readonly type: RunEventType;
  readonly at: string;
  /** Allowlisted identifiers and codes only; never provider bodies, errors or media. */
  readonly metadata: Readonly<Partial<Record<"code" | "model" | "mode" | "perceptionId" | "trackedFrames" | "amplitude" | "designId" | "parentRunId" | "sceneId" | "concept" | "provider" | "selection" | "candidateCount" | "samResultId", string | number>>>;
}

export interface RunManifest {
  readonly run_id: string;
  readonly parent_run_id?: string;
  readonly question?: string;
  readonly source: "synthetic" | "SAM perception" | "offline perception fixture";
  readonly createdAt: string;
  readonly measuredAt?: string;
  readonly updatedAt: string;
  readonly models: readonly { task: "design" | "interpret" | "perceive" | "scene"; model: string; mode: string }[];
  readonly perception?: PerceptionRecord;
  /** Exact stable serialized specification, independent of display IDs. */
  readonly spec?: ExperimentSpec;
  readonly specSha256?: string;
  readonly engineVersion?: string;
  readonly measurements?: CompactEvidencePayload["comparison"];
  readonly validation?: Readonly<Record<"sameInputs" | "sameParameters" | "interventionApplied" | "controlPresent" | "interventionPresent" | "measurementsImmutable" | "replayableInputs", boolean> & { trackReturned?: boolean; derivedStimulusValid?: boolean }>;
  readonly interpretation: { readonly state: "not_requested" | "requested" | "completed" | "failed"; readonly analysis?: ScientificAnalysis; readonly sha256?: string };
  readonly warnings: readonly string[];
}

export interface RunDiagnostics {
  readonly schemaVersion: "causalfly-flight-recorder-v1";
  readonly manifest: RunManifest;
  readonly events: readonly RunEvent[];
}
