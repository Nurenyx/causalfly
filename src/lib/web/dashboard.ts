import type { CompactTrialSummary } from "../meta/compact-evidence";
import type { MeasuredExperimentResult as WebExperimentResult } from "./contracts";
import type { GuidedDesign } from "./contracts";
import type { RunDiagnostics } from "./flight-recorder-types";

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
  investigationId?: number;
  history?: readonly { investigationId: number; result: WebExperimentResult; design?: GuidedDesign }[];
  nextFromId?: string;
  observation?: { id: number; startedAt: string; excluded: readonly string[] };
  workspace: Workspace;
  question: string;
  fruitFlyQuestion?: string;
  fruitFlyAskedQuestion?: string;
  fruitFlyQuestionSessionId?: string;
  result: WebExperimentResult | null;
  design?: GuidedDesign;
}

export type WorkspaceAction = (
  | { type: "diagnostics"; diagnostics: RunDiagnostics }
  | { type: "begin"; question: string }
  | { type: "designed"; design: GuidedDesign }
  | { type: "interpreted"; result: WebExperimentResult; workspace?: Workspace }
  | { type: "navigate"; workspace: Workspace }
  | { type: "question"; question: string }
  | { type: "fruitfly-question"; question: string }
  | { type: "fruitfly-ask"; question: string; sessionId?: string; startedAt?: string; excluded?: readonly string[] }
  | { type: "fruitfly-session"; sessionId: string }
  | { type: "completed"; result: WebExperimentResult; design?: GuidedDesign; workspace?: Workspace }
  | { type: "next-question"; question: string }) & { investigationId?: number };

/** UI state transitions cannot submit experiments or mutate evidence. */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  if (action.investigationId !== undefined && action.investigationId !== state.investigationId) return state;
  switch (action.type) {
    case "diagnostics": return state.result?.run_id === action.diagnostics.manifest.run_id ? { ...state, result: { ...state.result, diagnostics: action.diagnostics } } : state;
    case "designed": return { ...state, history: archiveEvidence(state), design: action.design, result: null, workspace: "observatory" };
    case "interpreted": return { ...state, result: action.result, workspace: action.workspace ?? "scientist" };
    case "navigate": return { ...state, workspace: action.workspace };
    case "begin": return { ...startInvestigation(state, action.question), nextFromId: action.question === state.question ? state.nextFromId : undefined };
    case "question": return action.question === state.question ? state : startInvestigation(state, action.question);
    case "fruitfly-question": return { ...state, fruitFlyQuestion: action.question };
    case "fruitfly-ask": return action.question.trim() ? { ...state, fruitFlyQuestion: action.question, fruitFlyAskedQuestion: action.question, fruitFlyQuestionSessionId: action.sessionId, observation: { id: (state.observation?.id ?? 0) + 1, startedAt: action.startedAt ?? new Date().toISOString(), excluded: action.excluded ?? [] }, workspace: "live" } : state;
    case "fruitfly-session": return state.fruitFlyAskedQuestion !== undefined && !state.fruitFlyQuestionSessionId ? { ...state, fruitFlyQuestionSessionId: action.sessionId } : state;
    case "completed": return { ...state, design: action.design ?? state.design, result: action.result, workspace: action.workspace ?? "compare" };
    case "next-question": return { ...startInvestigation(state, action.question), nextFromId: state.result?.analysis?.nextExperiment.researchQuestion === action.question ? state.design?.id : undefined, workspace: "observatory" };
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

/** Archive immutable evidence before releasing active design, result and interpretation. */
function startInvestigation(state: WorkspaceState, question: string): WorkspaceState {
  const history = archiveEvidence(state);
  return { ...state, question, investigationId: (state.investigationId ?? 0) + 1, history, design: undefined, result: null, nextFromId: undefined };
}

function archiveEvidence(state: WorkspaceState) {
  return state.result ? [...(state.history ?? []), { investigationId: state.investigationId ?? 0, result: state.result, design: state.design }] : state.history;
}
