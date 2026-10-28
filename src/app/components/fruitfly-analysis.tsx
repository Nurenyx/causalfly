import type { FruitFlyEvidence, FruitFlySnapshot } from "@/lib/sources/contracts";
import { number } from "@/lib/sources/live-session";
import { observationalAnalysis } from "@/lib/web/observational-analysis";
import { answerObservationalQuestion } from "@/lib/web/observational-question";
import { Badge, SectionTitle } from "./workspace-ui";
import { FruitFlyMetaAnalysis, type FruitFlyMetaProps } from "./fruitfly-meta-analysis";

export function FruitFlyCompare({ onLive, onEvidence, onSynthetic }: { onLive: () => void; onEvidence: () => void; onSynthetic: () => void }) {
  return <div className="xr-compare">
    <div className="page-intro"><span className="eyebrow cyan-text">COMPARE / FRUITFLY XR</span><h2>Controlled comparison requires matched trials.</h2><p>FruitFly XR currently provides observational simulation telemetry.<br />Causal comparison requires matched control and intervention sessions.</p></div>
    <section className="panel xr-comparison-requirements" aria-labelledby="matched-trials-heading">
      <SectionTitle index="01" title="Missing experiment requirements" id="matched-trials-heading"><Badge tone="amber">COMPARISON UNAVAILABLE</Badge></SectionTitle>
      <div className="xr-trial-equation" aria-label="A control session plus an intervention session are required for a matched comparison">
        <div className="xr-trial-condition"><span className="eyebrow cyan-text">CONTROL SESSION</span><strong>No matched control supplied</strong><Badge tone="muted">NOT YET SUPPLIED</Badge></div><span className="xr-equation-symbol" aria-hidden="true">+</span>
        <div className="xr-trial-condition intervention"><span className="eyebrow red-text">INTERVENTION SESSION</span><strong>No intervention session supplied</strong><Badge tone="muted">NOT YET SUPPLIED</Badge></div>
        <span className="xr-equation-arrow" aria-hidden="true">↓</span><div className="xr-comparison-result"><span className="eyebrow">MATCHED COMPARISON</span><strong>Waiting for controlled evidence</strong><p>CausalFly does not currently send interventions to FruitFly XR.</p></div>
      </div>
      <div className="xr-workspace-actions"><button type="button" className="primary-button" onClick={onLive}>Open Live Session ↗</button><button type="button" className="secondary-button" onClick={onEvidence}>Inspect Evidence ↗</button><button type="button" className="text-button" onClick={onSynthetic}>Use Synthetic Fixture ↗</button></div>
    </section>
    <p className="xr-boundary-note">Published connectome structure · simulated neural dynamics · not recordings from a living fly. Observational sessions cannot establish a causal intervention effect.</p>
  </div>;
}

/** Points are received values only. Gaps never acquire interpolated observations. */
function ReceivedWindow({ frames }: { frames: readonly FruitFlyEvidence[] }) {
  const latest = frames.at(-1)?.telemetry;
  const first = frames[0]?.telemetry;
  const maximum = Math.max(1, ...frames.map(({ telemetry }) => telemetry.totalSpikeEvents));
  const extent = Math.max(1, (latest?.neuralTick ?? 0) - (first?.neuralTick ?? 0));
  return <section className="panel xr-received-window"><SectionTitle index="03" title="Received observation window"><span className="eyebrow">{frames.length} RETAINED FRAMES</span></SectionTitle>
    {frames.length ? <><svg viewBox="0 0 650 145" role="img" aria-label="Simulated spike events in received ticks. Points are supplied counts; missing ticks are not filled."><path d="M30 15 V110 H620" fill="none" stroke="var(--cf-border)" />
      {frames.map(({ telemetry: t }) => <circle key={t.sequence} cx={30 + (t.neuralTick - first!.neuralTick) / extent * 590} cy={110 - t.totalSpikeEvents / maximum * 85} r="4" fill="var(--cf-cyan-bright)"><title>{`Tick ${t.neuralTick}: ${t.totalSpikeEvents} simulated spike events`}</title></circle>)}
      <text x="30" y="135">Tick {first?.neuralTick}</text><text x="620" y="135" textAnchor="end">Tick {latest?.neuralTick}</text><text x="620" y="16" textAnchor="end">{number(maximum)} events / scale max</text>
    </svg><p className="trace-note">Supplied spike counts / simulation tick · received frames only · gaps are not filled.</p></> : <p className="xr-waiting-note">No received frames in this session window.</p>}
  </section>;
}

export function FruitFlyScientist({ snapshot, frames, now, question, meta, onLive, onEvidence }: { snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null; question?: string; meta?: FruitFlyMetaProps; onLive: () => void; onEvidence: () => void }) {
  const evidence = snapshot.evidence;
  const t = evidence?.telemetry;
  const { status, history, observations, changes, suggestions } = observationalAnalysis(snapshot, frames, now ?? 0);
  const answer = question === undefined ? null : answerObservationalQuestion(question, snapshot, frames, now ?? 0);
  return <div className="xr-scientist" aria-label="FruitFly XR observational analysis">
    <div className="xr-analysis-heading"><div className="page-intro"><span className="eyebrow cyan-text">FRUITFLY XR / OBSERVATIONAL ANALYSIS</span><h2>What the evidence shows.</h2><p>Local interpretation of received simulation telemetry.</p></div><div className="xr-analysis-badges"><Badge tone="amber">DETERMINISTIC / LOCAL</Badge><Badge tone={status.historical ? "amber" : status.live ? "green" : status.tone}>{status.historical ? "LAST SNAPSHOT" : status.live ? "LIVE" : status.label}</Badge></div></div>
    <section className="xr-question-answer" aria-label="Question and retained evidence answer"><span className="eyebrow cyan-text">QUESTION ASKED</span><h3 className="xr-exact-question">{question ?? "No question submitted yet."}</h3><span className="eyebrow amber-text">WHAT THE EVIDENCE SHOWS</span><p className="xr-answer-summary">{answer?.summary ?? "Ask a question in the Observatory to organize this retained evidence."}</p>{answer && <><ul>{answer.facts.map((fact, i) => <li key={i}>{fact}</li>)}</ul>{answer.missing && <p className="xr-missing-evidence"><strong>Evidence needed:</strong> {answer.missing}</p>}<small>Received frames only · deterministic / local · {answer.intent.replaceAll("_", " ")}</small></>}</section>
    <FruitFlyMetaAnalysis {...(meta ?? { state: { pending: false }, enabled: false, onAnalyze: () => {} })} />
    <section className="panel xr-session-summary"><SectionTitle index="XR" title="Session summary"><Badge tone={evidence ? "green" : "muted"}>{evidence ? "VERIFIED SOURCE" : "AWAITING SOURCE EVIDENCE"}</Badge></SectionTitle><dl>
      <div><dt>Dataset / source</dt><dd>{evidence?.provenance.dataset ?? "Awaiting validated frame"}<small>FruitFly XR · simulated dynamics</small></dd></div><div className="xr-session-id"><dt>Session</dt><dd>{t?.sessionId ?? "—"}</dd></div><div><dt>Sequence</dt><dd>{t ? number(t.sequence) : "—"}</dd></div><div><dt>Model time</dt><dd>{t ? `${number(t.simulationMs)} ms` : "—"}</dd></div><div><dt>Simulation tick</dt><dd>{t ? number(t.neuralTick) : "—"}</dd></div><div><dt>Stream state</dt><dd>{status.label}<small>Transport: {snapshot.state}</small></dd></div>
    </dl>{status.historical && <p className="xr-historical-note" role="status">Last received snapshot retained. No current activity is claimed.</p>}</section>
    <section className="xr-scientific-limit" aria-label="Scientific limit"><span className="eyebrow">SCIENTIFIC LIMIT / OBSERVATIONAL ONLY</span><h3>Observational telemetry does not establish causal effect.</h3><p>CausalFly did not apply an intervention to this FruitFly XR session and currently sends no interventions to FruitFly XR. Neural dynamics are simulated by the FruitFly XR brain server over published connectome structure; these are not recordings from a living fly.</p></section>
    <div className="xr-analysis-grid"><div className="xr-telemetry-column"><section aria-labelledby="xr-what-happened"><SectionTitle index="01" title="What happened?" id="xr-what-happened"><Badge tone="cyan">RECEIVED TELEMETRY</Badge></SectionTitle>
      <dl className="xr-telemetry-readouts"><div><dt>Simulated spike events</dt><dd>{t ? number(t.totalSpikeEvents) : "—"}</dd><small>Reported in latest received tick</small></div><div><dt>Active simulated neurons</dt><dd>{t ? number(t.activeNeuronCount) : "—"}</dd><small>Includes neurons that did not spike</small></div><div><dt>Events supplied for display</dt><dd>{t ? number(t.displaySpikeEvents) : "—"}</dd><small>{t ? t.displayTruncated ? "Truncated display sample" : "Full supplied tick sample" : "Awaiting validated telemetry"}</small></div></dl>
    </section>
    <section className="panel xr-decoder"><SectionTitle index="OUT" title="Decoder output"><span className="eyebrow">SIMULATED OUTPUT</span></SectionTitle><div className="xr-decoder-summary"><strong>{t?.motorMode ?? "AWAITING DATA"}</strong><div><span className="eyebrow">INPUT REFERENCE</span><p>{!t || t.inputSequence < 0 ? "Unavailable" : `#${number(t.inputSequence)} / ${t.inputFresh ? "Fresh" : "Not fresh"}`}</p></div></div>
      {t && <details className="xr-channel-details"><summary>Inspect supplied decoder channels ({t.decodedMotor.length})</summary><dl className="xr-decoder-channels">{t.decodedMotor.map((channel) => <div key={channel.name}><dt>{channel.name}</dt><dd>{channel.value}</dd></div>)}</dl></details>}<p className="trace-note">Channel values as supplied. Decoder output does not establish physical movement or escape success.</p>
    </section>
    <ReceivedWindow frames={history} />
    </div><aside className="panel xr-local-analysis" aria-label="Local observational interpretation"><SectionTitle index="02" title="Observational interpretation"><Badge tone="amber">DETERMINISTIC / LOCAL</Badge></SectionTitle><ul>{observations.map((observation) => <li key={observation}>{observation}</li>)}</ul>{changes.length > 0 && <details className="xr-frame-changes"><summary>Changes between received frames <span>{changes.length}</span></summary><ul>{changes.map((change, index) => <li key={index}>{change}</li>)}</ul></details>}<button type="button" className="text-button" onClick={onEvidence}>Inspect retained evidence ↗</button></aside></div>

    <div className="xr-next-grid"><section className="panel xr-next-investigation"><SectionTitle index="04" title="What should we test next?"><Badge tone="amber">SUGGESTIONS / NOT FINDINGS</Badge></SectionTitle><ol>{suggestions.map((suggestion) => <li key={suggestion.title}><strong>{suggestion.title}</strong><p>{suggestion.rationale}</p></li>)}</ol><button className="text-button" type="button" onClick={onLive}>Open Live Session ↗</button></section></div>
  </div>;
}
