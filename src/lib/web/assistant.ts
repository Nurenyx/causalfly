import type { DataSourceKind, FruitFlySnapshot, FruitFlyEvidence } from "../sources/contracts";
import type { MeasuredExperimentResult as WebExperimentResult } from "./contracts";
import type { Workspace } from "./dashboard";
import { answerObservationalQuestion } from "./observational-question";
import { observationalAnalysis } from "./observational-analysis";
import { freezeRecord } from "../experiment/engine";

export const workspaceLabels: Record<Workspace, string> = { observatory: "Experiment", live: "Live Session", compare: "Compare", scientist: "Interpret / Meta Scientist", evidence: "Evidence" };
export const observationalBoundary = "Observational only · simulated neural dynamics over published connectome structure, not living-fly recordings. CausalFly does not currently send interventions to FruitFly XR. Decoder output does not prove physical movement or successful escape.";

export interface AssistantAction { label: string; question?: string; workspace?: Workspace; synthetic?: boolean; design?: boolean }
export function assistantActions(source: DataSourceKind, workspace: Workspace): AssistantAction[] {
  if (source === "FRUITFLY_XR") {
    if (workspace === "compare") return [
      { label: "Explain what is missing", question: "What is missing for a controlled comparison?" },
      { label: "Open Live Session", workspace: "live" }, { label: "Inspect retained evidence", workspace: "evidence" }, { label: "Use Synthetic Fixture", synthetic: true },
    ];
    if (workspace === "evidence") return [
      { label: "Summarize this evidence", question: "Summarize the retained session" },
      { label: "What changed between retained frames?", question: "How did simulated activity change across retained frames?" },
      { label: "What evidence is missing?", question: "What evidence should we collect in the next session?" },
      { label: "Open observational analysis", workspace: "scientist" },
    ];
    return [
      { label: "What changed in this session?", question: "What changed before the decoder entered ESCAPE?" },
      { label: "Why did the decoder enter ESCAPE?", question: "Why did the decoder enter ESCAPE?" },
      { label: "Inspect the evidence", workspace: "evidence" },
      { label: "What should we test next?", question: "What evidence should we collect in the next session?" },
    ];
  }
  if (workspace === "compare" || workspace === "scientist") return [
    { label: "Explain the measured difference", question: "Explain the measured difference" },
    { label: "What changed under intervention?", question: "What changed under intervention?" },
    { label: "Inspect evidence", workspace: "evidence" }, { label: "Suggest the next experiment", question: "Suggest the next experiment" },
  ];
  return [
    { label: "Design an experiment", design: true },
    { label: "What does this network represent?", question: "What does this network represent?" },
    { label: "What will be measured?", question: "What will be measured?" }, { label: "Show current evidence", workspace: "evidence" },
  ];
}

export interface AssistantAnswer { summary: string; facts: string[]; limitations: string; next: string; provenance: string }
export function syntheticAssistantAnswer(question: string, result: WebExperimentResult | null): AssistantAnswer {
  const answer: AssistantAnswer = {
    summary: "The retained evidence does not support answering that question locally.", facts: [],
    limitations: "Synthetic engineering fixture; not a biological model or Drosophila finding. Local answers do not infer unmeasured results.",
    next: "Review your question in Observatory, then explicitly choose Design & Run Experiment. The existing validated design and deterministic measurement workflow will run.",
    provenance: result ? `Retained experiment ${result.spec.id} · engine ${result.provenance.control.engineVersion}` : "No measured experiment retained",
  };
  if (/network represent/i.test(question)) return { ...answer, summary: "A hand-authored, two-pathway engineering test network.", facts: ["A stimulus feeds primary and alternate paths into the motor output. Node names have no biological identities."] };
  if (/what will be measured/i.test(question)) return { ...answer, summary: "Matched control and single-silence intervention trials measure output peak, threshold-crossing step and threshold outcome.", facts: ["Deltas are perturbed minus control. A missing crossing is not zero latency."] };
  if (!result) return { ...answer, summary: "No measured experiment is retained yet." };
  if (/next experiment/i.test(question)) return { ...answer, summary: "A new experiment needs an explicit, validated design.", next: "Open full analysis to review the existing AI next-experiment suggestion, then load it into Observatory. Suggestions are not findings." };
  if (!/measured difference|under intervention|current evidence|summari[sz]e/i.test(question)) return answer;
  const c = result.measuredEvidence;
  return { ...answer, summary: `Measured control versus silence intervention on ${result.spec.perturbation.targetNodeId}.`, facts: [
    `Output peak: ${c.control.outputPeakActivity} → ${c.perturbed.outputPeakActivity}; delta ${c.deltas.outputPeakActivity}.`,
    `Threshold crossing: ${c.control.outputThresholdCrossingStep === null ? "not reached" : `step ${c.control.outputThresholdCrossingStep}`} → ${c.perturbed.outputThresholdCrossingStep === null ? "not reached" : `step ${c.perturbed.outputThresholdCrossingStep}`}.`,
    `Outcome: ${c.control.outcome} → ${c.perturbed.outcome}.`,
  ], next: "Inspect the matched conditions and full provenance in Compare and Evidence before interpreting this fixture result." };
}

/** Capture at submission, never on render or provider completion. Incoming frames cannot alter this answer/window. */
export function captureAssistantQuestion(question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[], now: number) {
  const history = observationalAnalysis(snapshot, frames, now).history;
  const frozenSnapshot = structuredClone(snapshot);
  const frozenFrames = structuredClone(history);
  return freezeRecord({ question, snapshot: frozenSnapshot, frames: frozenFrames, answer: answerObservationalQuestion(question, frozenSnapshot, frozenFrames, now) });
}
export type AssistantQuestion = ReturnType<typeof captureAssistantQuestion>;
