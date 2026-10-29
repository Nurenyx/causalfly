import { nodeLabel } from "@/lib/web/display-labels";
import type { MeasuredExperimentResult as WebExperimentResult } from "@/lib/web/contracts";
import { syntheticDemoNetwork } from "@/lib/experiment/network";
import { Badge, SectionTitle } from "./workspace-ui";
import { SyntheticNetworkViz } from "./synthetic-network-viz";
import { ObservationMetrics } from "./observation-metrics";

export function ResearchWorkflow() {
  return <ol className="research-workflow" aria-label="Synthetic experiment workflow">{[
    ["ASK", "Research question"], ["INTERVENE", "Declared perturbation"], ["MEASURE", "Matched evidence"], ["UNDERSTAND", "AI-assisted interpretation"],
  ].map(([label, detail], index) => <li key={label}><span className="section-index">0{index + 1}</span><div><strong>{label}</strong><small>{detail}</small></div><span className="workflow-arrow" aria-hidden="true">→</span></li>)}</ol>;
}

export function FixtureTopology() {
  const positions: Record<string, [number, number]> = { stimulus: [55, 115], primary_a: [210, 45], primary_b: [410, 45], alternate_a: [175, 180], alternate_b: [310, 180], alternate_c: [445, 180], motor: [565, 115] };
  return <figure className="fixture-topology"><figcaption className="eyebrow">DECLARED TOPOLOGY / NO ACTIVITY DATA</figcaption><svg viewBox="0 0 620 225" role="img" aria-label="Declared seven-node synthetic fixture topology. No experiment measurements yet.">
    {syntheticDemoNetwork.edges.map(({ from, to, weight }) => <g key={`${from}-${to}`}><path d={`M ${positions[from].join(" ")} L ${positions[to].join(" ")}`} fill="none" stroke="var(--cf-border-strong)" /><text x={(positions[from][0] + positions[to][0]) / 2} y={(positions[from][1] + positions[to][1]) / 2 - 8} textAnchor="middle">{weight}</text></g>)}
    {syntheticDemoNetwork.nodes.map(({ id }) => <g key={id}><circle cx={positions[id][0]} cy={positions[id][1]} r="12" stroke="var(--cyan)" fill="var(--cf-bg-elevated)" /><text x={positions[id][0]} y={positions[id][1] + 29} textAnchor="middle">{nodeLabel(id)}</text></g>)}
  </svg><p>Hand-authored engineering network · schematic layout · edge labels are declared weights.</p></figure>;
}

export function ObservatoryPreview({ result, onCompare }: { result: WebExperimentResult | null; onCompare: () => void }) {
  const control = result?.measuredEvidence.control;
  const step = control?.activity.find((sample) => sample.nodes[control.provenance.network.outputNodeId] === control.outputPeakActivity)?.step ?? control?.activity[0]?.step ?? 0;
  return <section className="panel observatory-preview"><SectionTitle index="02" title={result ? "Latest measured evidence" : "Two routes. One output."}><Badge tone={result ? "green" : "muted"}>{result ? "MEASURED RESULT" : "AWAITING EXPERIMENT"}</Badge></SectionTitle>
    <div className="preview-layout"><div>{control ? <SyntheticNetworkViz trial={control} step={step} /> : <FixtureTopology />}</div><div className="preview-context"><span className="eyebrow cyan-text">SYNTHETIC FIXTURE</span><h3>{result ? "One intervention. A matched comparison." : "What changes when one route is silenced?"}</h3><p>{result ? result.spec.hypothesis : "This small test network sends a signal along two routes. Turn off one part, then measure what reaches the output."}</p><dl className="preview-facts"><div><dt>Network</dt><dd>{control?.provenance.network.nodes.length ?? syntheticDemoNetwork.nodes.length} nodes</dd></div><div><dt>Structure</dt><dd>{control?.provenance.network.edges.length ?? syntheticDemoNetwork.edges.length} edges</dd></div><div><dt>{result ? "Intervention" : "Evidence"}</dt><dd>{result ? `silence / ${result.spec.perturbation.targetNodeId}` : "Not yet measured"}</dd></div></dl>{result ? <button className="text-button" type="button" onClick={onCompare}>Explore Control vs Intervention ↗</button> : <p className="trace-note">Design and run the test to see its measured result. Nothing shown here is a prediction.</p>}</div></div>
    {result && <ObservationMetrics result={result} />}
  </section>;
}

