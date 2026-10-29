import type { GuidedDesign, MeasuredExperimentResult } from "./contracts";
import type { Workspace } from "./dashboard";
export type StageState = "LOCKED" | "READY" | "ACTIVE" | "COMPLETE" | "NOT APPLICABLE";
export interface WorkflowStage { id: string; label: string; state: StageState; reason: string; workspace: Workspace }
export interface Requirement { label: string; status: "satisfied" | "missing" | "unknown" }

export function comparisonRequirements(external: boolean, design?: GuidedDesign, result?: MeasuredExperimentResult | null): Requirement[] {
  if (external) return [
    { label: "Matched control session", status: "missing" },
    { label: "Matched intervention session", status: "missing" },
    { label: "Comparable source / configuration", status: "unknown" },
    { label: "Intervention provenance", status: "missing" },
    { label: "Matched stimulus conditions", status: "unknown" },
  ];
  const checks = result?.measuredEvidence.provenance.matchedConditions;
  return [
    { label: "Validated ExperimentSpec", status: design || result ? "satisfied" : "missing" },
    { label: "Control result", status: result ? "satisfied" : "missing" },
    { label: "Intervention result", status: result ? "satisfied" : "missing" },
    ...["engine", "network", "experiment", "stimulus", "seed", "maxSteps", "outputThreshold", "onlyDeclaredPerturbationDiffers"].map(key => ({ label: `Matched ${key}`, status: checks ? checks[key as keyof typeof checks] ? "satisfied" as const : "missing" as const : "unknown" as const })),
  ];
}

/** Presentation only: derives status from retained records, never starts work. */
export function workflowProgress({ external, workspace, question, design, result, hasTelemetry, hasQuestion, hasMeta, pending }: {
  external: boolean; workspace: Workspace; question: string; design?: GuidedDesign; result: MeasuredExperimentResult | null;
  hasTelemetry: boolean; hasQuestion: boolean; hasMeta: boolean; pending: string;
}): WorkflowStage[] {
  if (external) return [
    { id: "ask", label: "QUESTION", state: hasQuestion ? "COMPLETE" : ["observatory", "live"].includes(workspace) ? "ACTIVE" : "READY", reason: hasQuestion ? "Investigation question set." : "Set a question to guide observation.", workspace: "live" },
    { id: "observe", label: "OBSERVE", state: hasTelemetry ? "COMPLETE" : workspace === "live" ? "ACTIVE" : "READY", reason: hasTelemetry ? "Received simulation evidence is retained." : "Connect FruitFly XR and start a trial in its client.", workspace: "live" },
    { id: "trace", label: "TRACE / EVIDENCE", state: !hasTelemetry ? "LOCKED" : workspace === "evidence" ? "ACTIVE" : "COMPLETE", reason: hasTelemetry ? "Inspect immutable received telemetry and provenance." : "Receive a validated frame first.", workspace: "evidence" },
    { id: "interpret", label: "INTERPRET", state: !hasTelemetry || !hasQuestion ? "LOCKED" : hasMeta ? "COMPLETE" : workspace === "scientist" ? "ACTIVE" : "READY", reason: !hasQuestion ? "Set an investigation question first." : !hasTelemetry ? "Retained telemetry is required." : "Local interpretation first; Meta analysis is explicit.", workspace: "scientist" },
    { id: "next", label: "TEST NEXT", state: hasMeta ? "COMPLETE" : hasTelemetry && hasQuestion ? "READY" : "LOCKED", reason: hasMeta ? "Review the proposed follow-up and its required evidence." : "Analyze retained evidence to request a proposal. Proposals are not measurements.", workspace: "scientist" },
    { id: "compare", label: "COMPARE", state: "LOCKED", reason: "No matched control / intervention pair or intervention provenance. Observation alone cannot unlock Compare.", workspace: "compare" },
  ];
  return [
    { id: "ask", label: "ASK", state: design ? "COMPLETE" : workspace === "observatory" ? "ACTIVE" : "READY", reason: design ? "Research question retained with design." : "Enter a question, then explicitly request a Meta design.", workspace: "observatory" },
    { id: "design", label: "DESIGN", state: pending === "design" ? "ACTIVE" : design ? "COMPLETE" : question.trim() ? "READY" : "LOCKED", reason: design ? "Validated proposal available for review." : "A research question is required. Meta proposes; CausalFly validates.", workspace: "observatory" },
    { id: "run", label: "RUN", state: pending === "run" ? "ACTIVE" : result ? "COMPLETE" : design ? "READY" : "LOCKED", reason: design ? "Explicit approval runs matched control and intervention. No Meta call." : "Validate a design before approving engine execution.", workspace: "observatory" },
    { id: "compare", label: "COMPARE", state: !result ? "LOCKED" : workspace === "compare" ? "ACTIVE" : "COMPLETE", reason: result ? "Engine measurements and matched-condition provenance retained." : "Requires a valid spec, control result, intervention result, and matched conditions.", workspace: "compare" },
    { id: "interpret", label: "INTERPRET", state: !result ? "LOCKED" : result.analysis ? "COMPLETE" : pending === "interpret" || workspace === "scientist" ? "ACTIVE" : "READY", reason: result ? "Meta interprets frozen measurements and proposes the next experiment only on request." : "Run the experiment to obtain immutable comparison evidence.", workspace: "scientist" },
    { id: "evidence", label: "EVIDENCE", state: !result ? "LOCKED" : workspace === "evidence" ? "ACTIVE" : "COMPLETE", reason: result ? "Inspect specification, measurements, provenance and runtime calls." : "Run an approved design to produce evidence.", workspace: "evidence" },
  ];
}
