import type { WebExperimentResult } from "@/lib/web/contracts";
import { Badge, SectionTitle } from "./workspace-ui";

export function ExperimentMetadata({ result }: { result: WebExperimentResult }) {
  return <dl className="experiment-metadata"><div><dt>Perturbation</dt><dd className="red-text">silence / {result.spec.perturbation.targetNodeId}</dd></div><div><dt>Stimulus amplitude</dt><dd>{result.spec.stimulus.amplitude}</dd></div><div><dt>Seed</dt><dd>{result.spec.seed}</dd></div><div><dt>maxSteps</dt><dd>{result.spec.maxSteps}</dd></div><div><dt>Threshold</dt><dd>{result.spec.outputThreshold}</dd></div></dl>;
}

export function EvidenceView({ result }: { result: WebExperimentResult }) {
  const { control, perturbed, provenance } = result.measuredEvidence;
  const checks = provenance.matchedConditions;
  const labels: [keyof typeof checks, string][] = [
    ["engine", "Same engine"], ["network", "Same network"], ["experiment", "Same experiment spec"],
    ["stimulus", "Same stimulus"], ["seed", "Same seed"], ["maxSteps", "Same observation window"],
    ["outputThreshold", "Same threshold"], ["onlyDeclaredPerturbationDiffers", "Only declared perturbation differs"],
  ];
  return <div className="evidence-view">
    <section className="panel proposal-panel"><SectionTitle index="01" title="Experiment specification"><div className="proposal-badges"><Badge tone="amber">AI PROPOSED{result.mode === "FAKE META CLIENT" ? " / FAKE" : ""}</Badge><Badge tone="green">VALIDATED BY CAUSALFLY</Badge></div></SectionTitle><p className="submitted-question"><span>QUESTION RUN</span>{result.researchQuestion}</p><p className="hypothesis"><span className="eyebrow">HYPOTHESIS</span>{result.spec.hypothesis}</p><ExperimentMetadata result={result} /><p className="trace-note">Specification ID: {result.spec.id} · Seed recorded; engine has no random operations.</p></section>
    <section className="panel provenance-panel">
      <SectionTitle index="02" title="Matched condition provenance"><Badge tone="green">DETERMINISTIC EVIDENCE</Badge></SectionTitle>
      <ul className="check-grid">{labels.map(([key, label]) => <li key={key} className={checks[key] ? "matched" : "mismatched"}><span aria-hidden="true">{checks[key] ? "✓" : "×"}</span><span className="sr-only">{checks[key] ? "Matched: " : "Mismatch: "}</span>{label}</li>)}</ul>
      <div className="trace-summary">{[control, perturbed].map((trial) => <div key={trial.condition}><span className="eyebrow">{trial.condition} TRACE</span><p><strong>{trial.traceSelection.originalStepCount}</strong> raw samples <span className="arrow">→</span> <strong>{trial.activity.length}</strong> retained evidence samples</p><small>{trial.traceSelection.omittedZeroStepCount} zero samples omitted · maxSteps {trial.maxSteps}</small><p>Engine: <code>{trial.provenance.engineVersion}</code></p><p>Applied intervention: <code>{trial.provenance.appliedPerturbation ? `${trial.provenance.appliedPerturbation.type} / ${trial.provenance.appliedPerturbation.targetNodeId}` : "none"}</code></p><details className="provenance-details"><summary>Inspect {trial.condition.toLowerCase()} retained trace</summary><pre>{JSON.stringify({ condition: trial.condition, provenance: trial.provenance, traceSelection: trial.traceSelection, activity: trial.activity }, null, 2)}</pre></details></div>)}</div>
    </section>
    <section className="panel"><SectionTitle index="03" title="Network provenance" /><p className="submitted-question">{control.provenance.network.provenance.description}</p><dl className="network-provenance"><div><dt>Source</dt><dd>{result.provenance.source}</dd></div><div><dt>Network</dt><dd>{control.provenance.network.id}</dd></div><div><dt>Topology</dt><dd>{control.provenance.network.nodes.length} nodes / {control.provenance.network.edges.length} edges</dd></div></dl><details className="provenance-details"><summary>Inspect complete specification, provenance & retained evidence</summary><p>Selection rule: {control.traceSelection.rule}. Measurements are calculated from full traces before compaction.</p><pre>{JSON.stringify({ source: result.provenance.source, spec: result.spec, provenance: result.provenance, comparison: result.measuredEvidence }, null, 2)}</pre></details><p className="trace-note">Full raw trace debug pathway: <code>npm run experiment:ai-demo -- --fake --raw</code> runs a separate offline demo; it does not retrieve this experiment.</p></section>
  </div>;
}
