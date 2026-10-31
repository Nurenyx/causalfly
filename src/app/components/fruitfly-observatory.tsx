"use client";

import type { FruitFlyEvidence, FruitFlySnapshot } from "@/lib/sources/contracts";
import { number } from "@/lib/sources/live-session";
import { observationalAnalysis } from "@/lib/web/observational-analysis";
import { fruitFlyExampleQuestion, fruitFlySuggestions } from "@/lib/web/observational-question";
import { ConnectomeActivityView } from "./live-visualizations";
import { Badge } from "./workspace-ui";

export function FruitFlyLanding({ snapshot, frames, now, question, onQuestion, onAsk, onConnect, onLive, onEvidence }: {
  snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null; question: string;
  onQuestion: (question: string) => void; onAsk: () => void; onConnect: () => void; onLive: () => void; onEvidence: () => void;
}) {
  const { status, history } = observationalAnalysis(snapshot, frames, now ?? 0);
  const t = snapshot.evidence?.telemetry;
  const active = ["CONNECTING", "CONNECTED", "DATA RECEIVED"].includes(snapshot.state);
  return <div className="xr-observatory">
    <div className="page-intro"><span className="eyebrow cyan-text">ASK THE SIMULATION</span><h2>What do you want to understand?</h2><p>Ask a question about the received Live connectome simulation simulation telemetry.</p></div>
    <ol className="research-workflow xr-question-workflow" aria-label="FruitFly observational workflow">{[
      ["ASK", "Question the session"], ["OBSERVE", "Inspect received telemetry"], ["TRACE", "Follow the evidence"], ["TEST NEXT", "Define the next controlled experiment"],
    ].map(([label, detail], i) => <li key={label}><span className="section-index">0{i + 1}</span><div><strong>{label}</strong><small>{detail}</small></div><span className="workflow-arrow" aria-hidden="true">→</span></li>)}</ol>
    <div className={`xr-observatory-grid${t ? " has-evidence" : ""}`}><div className="xr-question-column">
      <section className="panel xr-question-composer"><form onSubmit={event => { event.preventDefault(); onAsk(); }}><label htmlFor="fruitfly-question">Your analysis question</label><textarea id="fruitfly-question" name="fruitFlyQuestion" value={question} onChange={event => onQuestion(event.target.value)} placeholder={fruitFlyExampleQuestion} rows={3} maxLength={8000} required aria-describedby="xr-question-help" /><div className="form-footer"><p id="xr-question-help">Retained evidence only · local analysis · no intervention</p><button className="primary-button" type="submit" disabled={!question.trim() || !t}>ASK THE SIMULATION ↗</button></div></form>
        <div className="xr-question-suggestions" aria-label="Suggested observational questions">{fruitFlySuggestions.map(prompt => <button type="button" key={prompt} onClick={() => onQuestion(prompt)}>{prompt}<span aria-hidden="true">↗</span></button>)}</div>
      </section>
      {t ? <section className="xr-at-glance" aria-label="Session at a glance"><div className="xr-glance-heading"><span className="eyebrow cyan-text">SESSION AT A GLANCE</span><Badge tone={status.historical ? "amber" : "green"}>{status.historical ? "RETAINED SNAPSHOT" : status.label}</Badge></div><dl>{[
        ["Simulated spike events", number(t.totalSpikeEvents), "cyan"], ["Active simulated neurons", number(t.activeNeuronCount), "cyan"], ["Decoder output", t.motorMode, "magenta"],
        ["Retained received frames", number(history.length), ""], ["Model time", `${number(t.simulationMs)} ms`, ""], ["Simulation tick", number(t.neuralTick), ""],
        ["Dataset / source", snapshot.evidence!.provenance.dataset, "green"], ["Connection state", snapshot.state, ""], ["Display sample", `${number(t.displaySpikeEvents)}${t.displayTruncated ? " / truncated" : " / supplied"}`, ""], ["Input-reference freshness", t.inputSequence < 0 ? "Unavailable" : `#${number(t.inputSequence)} / ${t.inputFresh ? "fresh" : "not fresh"}`, ""],
      ].map(([label, value, tone]) => <div key={label} data-tone={tone}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{status.historical && <p className="trace-note">Last received snapshot retained. No current activity is claimed.</p>}</section> : <section className="xr-no-evidence"><div className="xr-empty-signal" aria-hidden="true">◌</div><div><span className="eyebrow cyan-text">NO SESSION EVIDENCE YET</span><h3>Begin with a received simulation.</h3><p>Connect Live connectome simulation and run a simulation trial to begin asking questions.</p><div className="xr-empty-actions"><button type="button" className="primary-button" onClick={onLive}>Open Live Session ↗</button><button type="button" className="secondary-button" onClick={onConnect} disabled={active}>{active ? "Connection open / awaiting evidence" : "Connect Live connectome simulation"}</button></div></div></section>}
    </div>{t && <aside className="xr-connectome-preview" aria-label="Retained connectome preview"><span className="eyebrow cyan-text">PUBLISHED STRUCTURE / SIMULATED ACTIVITY</span><ConnectomeActivityView frames={history} historical={status.historical} /><p className="trace-note">Published connectome structure; highlights use supplied mapped IDs. No inferred connections.</p></aside>}</div>
    <div className="xr-observatory-footer"><p>Observational simulation telemetry · CausalFly sends no interventions to Live connectome simulation.</p>{t && <nav aria-label="Session details"><button type="button" className="text-button" onClick={onLive}>Live Session ↗</button><button type="button" className="text-button" onClick={onEvidence}>Trace evidence ↗</button></nav>}</div>
  </div>;
}
