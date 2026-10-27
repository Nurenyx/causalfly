import type { WebExperimentResult } from "@/lib/web/contracts";
import { propagationTiming, signed } from "@/lib/web/dashboard";

export function PropagationTimeline({ result, step: currentStep }: { result: WebExperimentResult; step: number }) {
  const control = propagationTiming(result.measuredEvidence.control);
  const perturbed = propagationTiming(result.measuredEvidence.perturbed);
  const steps = Array.from(new Set([...control, ...perturbed].flatMap((node) => node.step === null ? [] : [node.step]))).sort((a, b) => a - b);
  const output = result.measuredEvidence.control.provenance.network.outputNodeId;
  const controlOutput = control.find((node) => node.id === output)?.step;
  const perturbedOutput = perturbed.find((node) => node.id === output)?.step;
  const delay = controlOutput != null && perturbedOutput != null ? perturbedOutput - controlOutput : null;
  return <section className="panel propagation-panel" aria-labelledby="propagation-heading">
    <div className="section-title"><h2 id="propagation-heading"><span className="cyan-text" aria-hidden="true">⌁</span> Causal propagation</h2><span className="eyebrow">FIRST NON-ZERO ACTIVITY</span></div>
    <div className="propagation-grid" style={{ gridTemplateColumns: `90px repeat(${steps.length || 1}, minmax(100px, 1fr))` }}>
      <span className="timeline-axis">STEP</span>{steps.map((step) => <span className={`timeline-step${currentStep === step ? " current" : ""}`} key={step}>{String(step).padStart(2, "0")}</span>)}
      {[{ name: "Control", nodes: control, className: "control" }, { name: "Perturbed", nodes: perturbed, className: "perturbed" }].map(({ name, nodes, className }) => <div className={`timeline-row ${className}`} key={name}>
        <strong>{name}<small>{name === "Control" ? "intact" : "intervention"}</small></strong>{steps.map((step) => <div className={`timeline-cell${step === currentStep ? " current" : ""}`} key={step}><i className="timeline-dot" />{nodes.filter((node) => node.step === step).map((node) => <span className={`activation-chip${node.id === output ? " output-chip" : ""}${name === "Perturbed" && node.id.startsWith("alternate") ? " alternate-chip" : ""}`} key={node.id}>{node.id === output && <b aria-hidden="true">◈ </b>}{node.id}</span>)}</div>)}
      </div>)}
    </div>
    <div className="propagation-footnotes"><div>{[{ name: "Control", nodes: control }, { name: "Perturbed", nodes: perturbed }].map(({ name, nodes }) => {
      const inactive = nodes.filter((node) => node.step === null);
      return inactive.length > 0 && <p className="propagation-inactive" key={name}><strong>{name} · </strong>{inactive.map((node) => `${node.silenced ? "⊗ " : ""}${node.id} · ${node.silenced ? "silenced" : "no activation"}`).join(" / ")}</p>;
    })}{steps.length === 0 && <p>No non-zero activity recorded.</p>}</div><span className="propagation-delay">{delay === null ? "Output onset not comparable" : delay > 0 ? `Output onset ${signed(delay)} ${delay === 1 ? "step" : "steps"}` : delay < 0 ? `Output onset ${signed(delay)} steps` : "Output onset unchanged"}</span></div>
  </section>;
}
