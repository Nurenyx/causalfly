import type { WebExperimentResult } from "@/lib/web/contracts";
import { displayObservation } from "@/lib/web/dashboard";
import { Badge, SectionTitle } from "./workspace-ui";
import { ObservationMetrics } from "./observation-metrics";

type ScientistProps = { result: WebExperimentResult; onNext: (question: string) => void };

function AnalysisList({ items }: { items: readonly string[] }) {
  return items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>None identified by the interpreter. This does not establish absence.</p>;
}

function NextExperiment({ result, onNext }: ScientistProps) {
  const next = result.analysis.nextExperiment;
  return <div className="next-experiment"><div><h3>NEXT EXPERIMENT</h3><p className="next-question">{next.researchQuestion}</p><span className="next-target">Proposed silence target: <code>{next.proposedPerturbationTarget ?? "Not specified"}</code></span><p className="next-rationale">{next.rationale}</p></div><button type="button" className="secondary-button" onClick={() => onNext(next.researchQuestion)}>Use as Next Question <span aria-hidden="true">↗</span></button></div>;
}

function ModeNote({ result }: { result: WebExperimentResult }) {
  return <p className="scientist-intro">{result.mode === "FAKE META CLIENT" ? "FAKE META CLIENT · Offline template, not a Meta model response. The fake designer uses the demo specification regardless of the question." : "Meta model interpretation · downstream of measured evidence."} AI-authored conclusions are not measured telemetry.</p>;
}

export function AiScientistRail({ result, onNext, onFullAnalysis }: ScientistProps & { onFullAnalysis: () => void }) {
  const { analysis } = result;
  return <aside className="scientist-rail" aria-label="AI Scientist interpretation">
    <header className="rail-header"><span className="scientist-icon" aria-hidden="true">✧</span><div><h2>AI SCIENTIST</h2><p>Powered by Meta Muse</p></div><Badge tone="amber">{result.mode === "FAKE META CLIENT" ? "FAKE" : "AI"}</Badge></header>
    <p className="rail-mode-note">{result.mode === "FAKE META CLIENT" ? "OFFLINE TEMPLATE · Not a Meta model response" : "AI INTERPRETATION · Downstream of evidence"}</p>
    <section className="rail-section rail-observations"><h3>KEY OBSERVATIONS</h3><AnalysisList items={analysis.observations.slice(0, 4).map(displayObservation)} /></section>
    <section className="rail-section rail-interpretation"><h3>INTERPRETATION</h3><p className="scroll-prose" tabIndex={0} aria-label="Full interpretation, scroll to read">{analysis.interpretation}</p></section>
    <section className="rail-section rail-confounders"><h3>△ POTENTIAL CONFOUNDERS</h3><AnalysisList items={analysis.confounders.slice(0, 3)} /></section>
    <NextExperiment result={result} onNext={onNext} />
    <button type="button" className="text-button full-analysis-link" onClick={onFullAnalysis}>View Full Analysis <span aria-hidden="true">↗</span></button>
  </aside>;
}

export function ScientistView({ result, onNext }: ScientistProps) {
  const { analysis } = result;
  const support = analysis.supportsHypothesis === null ? "INCONCLUSIVE" : analysis.supportsHypothesis ? "SUPPORTED IN THIS FIXTURE" : "NOT SUPPORTED IN THIS FIXTURE";
  return <div className="scientist-workspace" aria-labelledby="scientist-heading">
    <section className="panel finding-panel">
      <SectionTitle index="AI" title="What did we find?" id="scientist-heading"><Badge tone="amber">{result.mode}</Badge></SectionTitle>
      <div className="finding-summary"><div><span className="eyebrow">HYPOTHESIS TESTED</span><h3>{result.spec.hypothesis}</h3></div><div className="support-state" data-support={analysis.supportsHypothesis === null ? "inconclusive" : analysis.supportsHypothesis ? "supported" : "unsupported"}><span className="eyebrow">HYPOTHESIS STATE / AI ASSESSMENT</span><strong>{support}</strong><small>Limited to this synthetic fixture</small></div></div>
      <ModeNote result={result} />
    </section>
    <section className="scientist-observations"><SectionTitle index="01" title="Key measured observations"><Badge tone="cyan">ENGINE EVIDENCE</Badge></SectionTitle><ObservationMetrics result={result} /></section>
    <div className="scientist-analysis-layout"><section className="panel analysis-block interpretation-block"><h3>02 / INTERPRETATION</h3><p>{analysis.interpretation}</p><span className="interpretation-caption">AI-authored interpretation · downstream of measured evidence</span></section><section className="panel analysis-caveats"><div className="analysis-block"><details open><summary>LIMITATIONS <span>{analysis.limitations.length}</span></summary><AnalysisList items={analysis.limitations} /></details></div><div className="analysis-block"><details open><summary>CONFOUNDERS <span>{analysis.confounders.length}</span></summary><AnalysisList items={analysis.confounders} /></details></div></section></div>
    <NextExperiment result={result} onNext={onNext} />
    <details className="panel full-analysis"><summary>View full analysis <span className="eyebrow">QUESTION + ALL AI OBSERVATIONS + ORIGINAL RECORD</span></summary><p className="submitted-question"><span>QUESTION RUN</span>{result.researchQuestion}</p><div className="analysis-block"><h3>ALL AI-AUTHORED OBSERVATIONS</h3><AnalysisList items={analysis.observations.map(displayObservation)} /></div><details className="provenance-details"><summary>Inspect original analysis record</summary><pre>{JSON.stringify(analysis, null, 2)}</pre></details></details>
  </div>;
}
