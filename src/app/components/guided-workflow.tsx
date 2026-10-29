import type { GuidedDesign, MeasuredExperimentResult } from "@/lib/web/contracts";
import type { Workspace } from "@/lib/web/dashboard";
import { comparisonRequirements, type WorkflowStage } from "@/lib/web/workflow-progress";
import { Badge } from "./workspace-ui";

export function WorkflowProgress({ stages, onNavigate }: { stages: WorkflowStage[]; onNavigate: (workspace: Workspace) => void }) {
  return <nav className="workflow-progress" aria-label="Scientific workflow"><ol>{stages.map((stage, i) => <li key={stage.id} data-state={stage.state}><button type="button" onClick={() => onNavigate(stage.workspace)} aria-label={`${stage.label}: ${stage.state}. ${stage.reason}`} aria-current={stage.state === "ACTIVE" ? "step" : undefined}><span className="stage-number">{stage.state === "COMPLETE" ? "✓" : `0${i + 1}`}</span><strong>{stage.label}</strong><small>{stage.state}</small><span className="stage-reason">{stage.reason}</span></button></li>)}</ol></nav>;
}

export function CompareRequirements({ external, design, result, onNext }: { external: boolean; design?: GuidedDesign; result?: MeasuredExperimentResult | null; onNext: () => void }) {
  const requirements = comparisonRequirements(external, design, result);
  return <section className="panel workflow-requirements" aria-label="Compare requirements"><header><div><span className="eyebrow">{external ? "FRUITFLY XR / OBSERVATIONAL" : "SYNTHETIC FIXTURE / CONTROLLED"}</span><h2>{result && !external ? "Matched comparison evidence" : "What Compare needs"}</h2></div><Badge tone={result && !external ? "green" : "amber"}>{result && !external ? "READY" : "LOCKED"}</Badge></header><ul>{requirements.map(r => <li key={r.label} data-status={r.status}><span aria-hidden="true">{r.status === "satisfied" ? "✓" : r.status === "missing" ? "○" : "?"}</span><strong>{r.label}</strong><small>{r.status}</small></li>)}</ul><p>{external ? "CausalFly currently receives read-only simulation telemetry. No controlled intervention is supplied; more observational frames alone cannot establish causal comparison." : "The deterministic engine runs both conditions with the same declared parameters. Only the specified silence intervention differs."}</p><button type="button" className="primary-button" onClick={onNext}>{external ? "Inspect session evidence" : design ? "Review design / approve run" : "Design experiment"} ↗</button></section>;
}

export function DesignReview({ design, busy, onRun }: { design: GuidedDesign; busy: boolean; onRun: () => void }) {
  const s = design.spec;
  return <section className="panel design-review" aria-label="Validated experiment design"><header><div><span className="eyebrow amber-text">META EXPERIMENT DESIGNER</span><h2>Review the proposed intervention.</h2></div><Badge tone="green">✓ VALIDATED SPEC</Badge></header><p className="design-question">{design.researchQuestion}</p><span className="eyebrow">PROPOSED HYPOTHESIS</span><h3>{s.hypothesis}</h3><dl>{[
    ["Intervention", s.perturbation.type], ["Target", s.perturbation.targetNodeId], ["Stimulus amplitude", s.stimulus.amplitude], ["Seed (recorded, unused)", s.seed], ["maxSteps", s.maxSteps], ["Output threshold", s.outputThreshold],
  ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="trace-note">{design.mode === "META LIVE" ? "META GENERATED" : "OFFLINE FAKE TEMPLATE"} · {s.id} · Computational steps, not biological time. The designer contract supplies a hypothesis; no separate rationale is supplied.</p><button type="button" className="primary-button" disabled={busy} onClick={onRun}>{busy ? "Request in progress…" : "Approve & run matched experiment"}</button><small>Runs the deterministic engine only. Interpretation is a separate explicit action.</small></section>;
}
