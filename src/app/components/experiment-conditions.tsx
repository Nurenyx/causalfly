import type { ExperimentSpec } from "@/lib/experiment/types";
import { experimentConditions } from "@/lib/experiment/semantics";
import { nodeLabel } from "@/lib/web/display-labels";

export function ExperimentConditions({spec}:{spec:ExperimentSpec}) {
  const c=experimentConditions(spec);
  return <section className="experiment-conditions" aria-label="Controlled difference" data-experiment-type={c.type}>
    <div><span>ONLY THING CHANGED</span><strong>{c.environment ? "Stimulus" : nodeLabel(spec.perturbation?.targetNodeId ?? "pathway")}</strong></div>
    <div><span>CONTROL</span><strong>{c.control}</strong><small>Stimulus {c.controlAmplitude.toFixed(1)}</small></div>
    <div><span>{c.second}</span><strong>{c.environment ? c.test : `Silence ${nodeLabel(spec.perturbation?.targetNodeId ?? "pathway")}`}</strong><small>Stimulus {c.testAmplitude.toFixed(1)}</small></div>
    <p>{c.held} · synthetic engineering fixture</p>
  </section>;
}
