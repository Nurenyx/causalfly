import type { CompactTrialSummary } from "../meta/compact-evidence";
import type { WebExperimentResult } from "./contracts";

export type Workspace = "observatory" | "live" | "compare" | "scientist" | "evidence";
export const chartNodes = ["primary_a", "primary_b", "alternate_c", "motor"] as const;

/** Playback visits recorded steps only, preserving the computational step numbers. */
export function playbackSteps(control: CompactTrialSummary, perturbed: CompactTrialSummary) {
  return [...new Set([...control.activity, ...perturbed.activity].map(({ step }) => step))].sort((a, b) => a - b);
}

/** An absent compacted sample is not a new measurement or an interpolated value. */
export function activityAtStep(trial: CompactTrialSummary, step: number) {
  return trial.activity.find((sample) => sample.step === step) ?? null;
}

/** Select recorded values only. Omitted quiescent steps are never interpolated. */
export function activitySeries(trial: CompactTrialSummary) {
  return chartNodes.filter((id) => trial.provenance.network.nodes.some((node) => node.id === id))
    .map((id) => ({ id, points: trial.activity.map((sample) => ({ step: sample.step, value: sample.nodes[id] })) }));
}

/** Compaction retains every non-zero sample, so first activation is exact. */
export function propagationTiming(trial: CompactTrialSummary) {
  return trial.provenance.network.nodes.map(({ id }) => ({
    id,
    step: trial.activity.find((sample) => sample.nodes[id] !== 0)?.step ?? null,
    silenced: trial.provenance.appliedPerturbation?.targetNodeId === id,
  }));
}

export interface WorkspaceState {
  workspace: Workspace;
  question: string;
  result: WebExperimentResult | null;
}

export type WorkspaceAction =
  | { type: "navigate"; workspace: Workspace }
  | { type: "question"; question: string }
  | { type: "completed"; result: WebExperimentResult }
  | { type: "next-question"; question: string };

/** UI state transitions cannot submit experiments or mutate evidence. */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "navigate": return { ...state, workspace: action.workspace };
    case "question": return { ...state, question: action.question };
    case "completed": return { ...state, result: action.result, workspace: "compare" };
    case "next-question": return { ...state, question: action.question, workspace: "observatory" };
  }
}

export function crossing(value: number | null) {
  return value === null ? "Not reached" : `Step ${value}`;
}

export function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

// Display aliases only. ScientificAnalysis itself is never rewritten.
export function displayObservation(observation: string) {
  const labels: Record<string, string> = {
    outputPeakActivity: "Peak output", outputThresholdCrossingStep: "Threshold crossing",
    outputThresholdCrossingSteps: "Threshold-crossing delta", outcomeChanged: "Outcome changed",
    PERTURBED_MINUS_CONTROL: "Perturbed minus control", maxSteps: "Observation window",
  };
  return observation.replace(/\b(outputPeakActivity|outputThresholdCrossingStep|outputThresholdCrossingSteps|outcomeChanged|PERTURBED_MINUS_CONTROL|maxSteps)\b/g, (field) => labels[field]);
}
