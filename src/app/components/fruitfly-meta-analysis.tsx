import type { ObservationalMetaState } from "@/lib/web/observational-contracts";
import { Badge } from "./workspace-ui";
import { MetaRequestLabel } from "./meta-request-label";

export interface FruitFlyMetaProps {
  state: ObservationalMetaState;
  enabled: boolean;
  onAnalyze: () => void;
}

export function FruitFlyMetaAnalysis({ state, enabled, onAnalyze }: FruitFlyMetaProps) {
  const result = state.result;
  const analysis = result?.analysis;
  return <section className="panel xr-meta-runtime" aria-label="Meta observational scientist" aria-busy={state.pending}>
    <header><div><span className="eyebrow amber-text">META MUSE</span><h3>{result?.mode === "META LIVE" ? "LIVE AI ANALYSIS" : result ? "OFFLINE TEMPLATE" : "Ask CausalFly to explain"}</h3></div><Badge tone="amber">{result?.mode ?? "EXPLICIT ACTION ONLY"}</Badge></header>
    <p>Interpret the exact question using a frozen window of retained simulation evidence. Meta also proposes what to test next.</p>
    <button type="button" className="primary-button" disabled={!enabled || state.pending} aria-busy={state.pending} onClick={onAnalyze}><MetaRequestLabel pending={state.pending} task="explain">{state.error ? "RETRY META ANALYSIS" : "EXPLAIN WITH META"}</MetaRequestLabel></button>
    {!enabled && <small>Submit a question and receive a server-retained FruitFly snapshot to enable analysis.</small>}
    {state.error && <p role="alert" className="xr-meta-error">{state.error}</p>}
    {analysis && result && <div className="xr-meta-result">
      <div className="xr-meta-question"><span className="eyebrow">WHAT DID WE ASK?</span><h4>{analysis.exactQuestion}</h4><small>Frozen analysis window · {result.evidence.retainedFrameCount} frames · session {result.evidence.sessionId} · sequences {result.evidence.frames.map(f => f.sequence).join(", ")}</small></div>
      <div className="xr-meta-grid"><section><span className="eyebrow cyan-text">WHAT DID THE EVIDENCE SHOW?</span><p>{result.evidence.localAnswer.summary}</p><ul>{result.evidence.localAnswer.facts.map((fact, i) => <li key={i}>{fact}</li>)}</ul><small>DETERMINISTIC / LOCAL · supplied simulation counts</small></section>
      <section><span className="eyebrow amber-text">META INTERPRETATION</span><p>{analysis.interpretation}</p><span className="eyebrow">EVIDENCE SUFFICIENCY</span><div><Badge tone={analysis.evidenceSufficiency === "INSUFFICIENT" ? "red" : "amber"}>{analysis.evidenceSufficiency}</Badge></div></section></div>
      <div className="xr-meta-grid"><section><span className="eyebrow">LIMITATIONS</span><ul>{analysis.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul><details><summary>Meta observations & potential confounders</summary><small>AI-authored statements; verify against retained evidence.</small><ul>{[...analysis.observations, ...analysis.potentialConfounders].map((item, i) => <li key={i}>{item}</li>)}</ul></details></section>
      <section><span className="eyebrow amber-text">WHAT SHOULD WE TEST NEXT?</span><h4>{analysis.nextExperiment.title}</h4><p>{analysis.nextExperiment.rationale}</p><ul>{analysis.nextExperiment.requiredEvidence.map((item, i) => <li key={i}>{item}</li>)}</ul><Badge tone="muted">SUGGESTION / NOT A FINDING</Badge></section></div>
      <p className="xr-boundary-note">Simulated dynamics over published structure · no living-fly recording or biological validation · no causal intervention effect established.</p>
    </div>}
  </section>;
}
