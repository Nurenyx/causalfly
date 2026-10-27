"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import type { NetworkDefinition } from "@/lib/experiment/types";
import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import type { WebExperimentResponse, WebExperimentResult, WebStatus } from "@/lib/web/contracts";

const defaultQuestion = "Does silencing primary_a reduce the synthetic output peak and delay threshold crossing?";
const stages = [
  "Designing experiment with Meta",
  "Running deterministic control",
  "Running deterministic perturbation",
  "Comparing measured evidence",
  "Interpreting results with Meta",
];

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}

function SectionTitle({ index, title, id, children }: { index: string; title: string; id?: string; children?: ReactNode }) {
  return <div className="section-title"><div><span className="section-index">{index}</span><h2 id={id}>{title}</h2></div>{children}</div>;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function crossing(value: number | null) {
  return value === null ? "Not reached" : `Step ${value}`;
}

/** Draw the recorded network topology, with no biological or simulated activity claims. */
function Pathway({ network, silenced }: { network: NetworkDefinition; silenced?: string }) {
  const positions: Record<string, [number, number]> = {
    stimulus: [55, 80], primary_a: [190, 35], primary_b: [375, 35],
    alternate_a: [190, 125], alternate_b: [310, 125], alternate_c: [430, 125], motor: [565, 80],
  };
  return <svg className="pathway" viewBox="0 0 620 170" role="img" aria-label={`Synthetic engineering network topology.${silenced ? ` ${silenced} is silenced.` : " Control has no silenced nodes."}`}>
    {network.edges.map(({ from, to, weight }) => {
      const [x1, y1] = positions[from];
      const [x2, y2] = positions[to];
      const blocked = from === silenced || to === silenced;
      return <g key={`${from}-${to}`} className={blocked ? "edge blocked" : "edge"}>
        <path d={`M ${x1 + 10} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2 - 13} ${y2}`} />
        <path d={`M ${x2 - 19} ${y2 - 4} L ${x2 - 13} ${y2} L ${x2 - 19} ${y2 + 4}`} />
        <title>{from} → {to}, weight {weight}{blocked ? ", incident to silenced node" : ""}</title>
      </g>;
    })}
    {network.nodes.map(({ id }) => {
      const [x, y] = positions[id];
      return <g key={id} className={id === silenced ? "network-node silenced" : "network-node"}>
        <circle cx={x} cy={y} r="10" />
        {id === silenced ? <path d={`M ${x - 4} ${y - 4} l 8 8 m 0 -8 l -8 8`} /> : <circle cx={x} cy={y} r="3" className="node-core" />}
        <text x={x} y={y + 28} textAnchor="middle">{id}</text>
        {id === silenced && <text x={x} y={y - 20} textAnchor="middle" className="silenced-label">SILENCED</text>}
      </g>;
    })}
  </svg>;
}

function TrialCard({ trial, target }: { trial: CompactTrialSummary; target?: string }) {
  const perturbed = trial.condition === "PERTURBED";
  return <article className={`trial-card ${perturbed ? "perturbed" : "control"}`}>
    <div className="trial-heading"><h3><span className="status-dot" />{trial.condition}</h3><span>{perturbed ? `silence / ${target}` : "baseline / intact network"}</span></div>
    <dl className="trial-metrics">
      <div><dt>Peak output</dt><dd className="peak-value">{trial.outputPeakActivity}</dd><small>normalized activity</small></div>
      <div><dt>Threshold crossing</dt><dd>{crossing(trial.outputThresholdCrossingStep)}</dd><small>computational step</small></div>
    </dl>
    <div className="outcome"><span>Outcome</span><code>{trial.outcome}</code></div>
    <Pathway network={trial.provenance.network} silenced={target} />
    <div className="pathway-caption">SYNTHETIC TWO-PATHWAY FIXTURE <span>topology only</span></div>
  </article>;
}

function Comparison({ result }: { result: WebExperimentResult }) {
  const { control, perturbed, deltas } = result.measuredEvidence;
  return <section id="comparison" className="comparison-section section-anchor" tabIndex={-1} aria-labelledby="evidence-heading">
    <SectionTitle index="02" title="Control vs perturbation" id="evidence-heading"><Badge tone="cyan">MEASURED EVIDENCE</Badge></SectionTitle>
    <p className="section-description">One intervention. Matched conditions. Deterministic measurements.</p>
    <p className="evidence-trust">Measurements are produced by the deterministic engine. Meta AI proposes and interprets experiments but cannot alter measured results.</p>
    <div className="trial-grid"><TrialCard trial={control} /><TrialCard trial={perturbed} target={result.spec.perturbation.targetNodeId} /></div>
    <div className="delta-strip">
      <div><span className="eyebrow">PEAK</span><p>{control.outputPeakActivity} <span className="arrow">→</span> {perturbed.outputPeakActivity}</p><strong className="cyan-text">Δ {signed(deltas.outputPeakActivity)}</strong></div>
      <div><span className="eyebrow">LATENCY</span><p>{crossing(control.outputThresholdCrossingStep)} <span className="arrow">→</span> {crossing(perturbed.outputThresholdCrossingStep)}</p><strong className="cyan-text">{deltas.outputThresholdCrossingSteps === null ? "Δ Not comparable" : `Δ ${signed(deltas.outputThresholdCrossingSteps)} ${Math.abs(deltas.outputThresholdCrossingSteps) === 1 ? "step" : "steps"}`}</strong></div>
      <div className="outcome-delta"><span className="eyebrow">OUTCOME</span><p><code>{control.outcome}</code> <span className="arrow">→</span> <code>{perturbed.outcome}</code></p><strong className={deltas.outcomeChanged ? "outcome-changed" : "outcome-unchanged"}>{deltas.outcomeChanged ? "CHANGED" : "UNCHANGED"}</strong></div>
    </div>
    <p className="metric-note">Deltas = perturbed − control. Steps are computational transitions, not biological time. A missing crossing is never treated as zero.</p>
  </section>;
}

function Provenance({ result }: { result: WebExperimentResult }) {
  const { control, perturbed, provenance } = result.measuredEvidence;
  const checks = provenance.matchedConditions;
  const labels: [keyof typeof checks, string][] = [
    ["engine", "Same engine"], ["network", "Same network"], ["experiment", "Same experiment spec"],
    ["stimulus", "Same stimulus"], ["seed", "Same seed"], ["maxSteps", "Same observation window"],
    ["outputThreshold", "Same threshold"], ["onlyDeclaredPerturbationDiffers", "Only declared perturbation differs"],
  ];
  return <section className="panel provenance-panel">
    <SectionTitle index="03" title="Evidence provenance"><Badge tone="green">DETERMINISTIC EVIDENCE</Badge></SectionTitle>
    <ul className="check-grid">{labels.map(([key, label]) => <li key={key} className={checks[key] ? "matched" : "mismatched"}><span aria-hidden="true">{checks[key] ? "✓" : "×"}</span><span className="sr-only">{checks[key] ? "Matched: " : "Mismatch: "}</span>{label}</li>)}</ul>
    <div className="trace-summary">{[control, perturbed].map((trial) => <div key={trial.condition}><span className="eyebrow">{trial.condition} TRACE</span><p><strong>{trial.traceSelection.originalStepCount}</strong> raw samples <span className="arrow">→</span> <strong>{trial.activity.length}</strong> retained evidence samples</p><small>{trial.traceSelection.omittedZeroStepCount} zero samples omitted</small></div>)}</div>
    <details className="provenance-details"><summary>Inspect provenance & retained evidence</summary><p>Selection rule: {control.traceSelection.rule}. Measurements are calculated from the full traces before compaction.</p><pre>{JSON.stringify({ source: result.provenance.source, engine: control.provenance.engineVersion, network: control.provenance.network, spec: result.spec, control: { condition: control.condition, appliedPerturbation: control.provenance.appliedPerturbation, traceSelection: control.traceSelection, activity: control.activity }, perturbed: { condition: perturbed.condition, appliedPerturbation: perturbed.provenance.appliedPerturbation, traceSelection: perturbed.traceSelection, activity: perturbed.activity }, comparison: provenance }, null, 2)}</pre></details>
  </section>;
}

// Display-only aliases: preserve the model's statements and every value verbatim.
function displayObservation(observation: string) {
  const labels: Record<string, string> = {
    outputPeakActivity: "Peak output",
    outputThresholdCrossingStep: "Threshold crossing",
    outputThresholdCrossingSteps: "Threshold-crossing delta",
    outcomeChanged: "Outcome changed",
    PERTURBED_MINUS_CONTROL: "Perturbed minus control",
    maxSteps: "Observation window",
  };
  return observation.replace(
    /\b(outputPeakActivity|outputThresholdCrossingStep|outputThresholdCrossingSteps|outcomeChanged|PERTURBED_MINUS_CONTROL|maxSteps)\b/g,
    (field) => labels[field],
  );
}

function AnalysisList({ items }: { items: readonly string[] }) {
  return items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>None identified by the interpreter. This does not establish absence.</p>;
}

function Scientist({ result, onNext }: { result: WebExperimentResult; onNext: (question: string) => void }) {
  const { analysis } = result;
  const support = analysis.supportsHypothesis === null ? "INCONCLUSIVE" : analysis.supportsHypothesis ? "SUPPORTED IN THIS FIXTURE" : "NOT SUPPORTED IN THIS FIXTURE";
  return <section id="ai-scientist" className="panel scientist-panel section-anchor" tabIndex={-1} aria-labelledby="scientist-heading">
    <SectionTitle index="04" title="AI Scientist" id="scientist-heading"><Badge tone="amber">AI INTERPRETATION</Badge></SectionTitle>
    <p className="scientist-intro">{result.mode === "FAKE META CLIENT" ? "Offline template output · not a Meta model response. The fake designer always uses the demo specification, regardless of the question." : "Meta model interpretation · downstream of measured evidence."} AI-authored observations and conclusions are not measured telemetry.</p>
    <div className="analysis-grid">
      <div className="analysis-block observations-block"><h3>OBSERVATIONS</h3><AnalysisList items={analysis.observations.map(displayObservation)} /></div>
      <div className="analysis-block interpretation-block"><h3>INTERPRETATION</h3><p>{analysis.interpretation}</p></div>
      <div className="analysis-block caveat-block"><h3>LIMITATIONS</h3><AnalysisList items={analysis.limitations} /></div>
      <div className="analysis-block caveat-block"><h3>CONFOUNDERS</h3><AnalysisList items={analysis.confounders} /></div>
    </div>
    <div className="hypothesis-verdict"><h3>HYPOTHESIS</h3><p>{result.spec.hypothesis}</p><Badge tone="amber">{support}</Badge></div>
    <div className="next-experiment"><div><h3>NEXT EXPERIMENT</h3><p className="next-question">{analysis.nextExperiment.researchQuestion}</p><p className="next-rationale">{analysis.nextExperiment.rationale}</p><span className="next-target">Proposed silence target: <code>{analysis.nextExperiment.proposedPerturbationTarget ?? "Not specified"}</code></span></div><button type="button" className="secondary-button" onClick={() => onNext(analysis.nextExperiment.researchQuestion)}>Use as Next Question <span aria-hidden="true">↗</span></button></div>
  </section>;
}

export default function Observatory({ initialStatus }: { initialStatus: WebStatus }) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [result, setResult] = useState<WebExperimentResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialStatus.error ?? "");
  const [notice, setNotice] = useState("");
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const mode = result?.mode ?? initialStatus.mode;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setResult(null);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/experiments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchQuestion: question }),
      });
      const data = await response.json() as WebExperimentResponse;
      if (!data.ok) setError(data.error);
      else if (!response.ok) setError("The experiment could not be completed. Please retry.");
      else {
        setResult(data.result);
        setNotice("Experiment complete. Measured evidence and interpretation are available below.");
        requestAnimationFrame(() => resultRef.current?.focus());
      }
    } catch {
      setError("Unable to reach CausalFly. Check your connection and retry.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function useNextQuestion(next: string) {
    setQuestion(next);
    setNotice("Next question loaded. Review it, then choose Design & Run Experiment.");
    questionRef.current?.focus({ preventScroll: true });
    document.getElementById("research")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }

  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to observatory</a>
    <aside className="sidebar" aria-label="CausalFly navigation">
      <Link className="brand" href="/" aria-label="CausalFly home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16 12 5l8 22 8-11M4 16h24M12 5l8 22" /><circle cx="4" cy="16" r="3" /><circle cx="12" cy="5" r="3" /><circle cx="20" cy="27" r="3" /><circle cx="28" cy="16" r="3" /></svg><span>CAUSALFLY<small>causal observatory</small></span></Link>
      <span className="sidebar-caption">WORKSPACE</span>
      <nav aria-label="Experiment sections">
        <a href="#research"><span aria-hidden="true">◉</span>Observatory</a>
        {[
          { name: "Experiments", target: "proposed-experiment", icon: "▤" },
          { name: "Compare", target: "comparison", icon: "⇄" },
          { name: "AI Scientist", target: "ai-scientist", icon: "✧" },
        ].map(({ name, target, icon }) => (
          <a key={target} href={result ? `#${target}` : "#research"}
            title={result ? `Go to ${name}` : "Run an experiment to view this section"}
            onClick={() => { if (!result) setNotice("Run an experiment to view the proposed design, comparison, and AI Scientist."); }}>
            <span aria-hidden="true">{icon}</span>{name}
          </a>
        ))}
      </nav>
      <div className="source-card"><span className="sidebar-caption">DATA SOURCE</span><div className="source-icon" aria-hidden="true">⌘</div><strong>Synthetic Fixture</strong><span className="ready-label"><span className="status-dot" />READY</span><p>Deterministic engineering network</p></div>
      <div className="sidebar-footer"><span className="sidebar-caption">META MODEL API</span><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode === "META LIVE" ? "LIVE CONFIGURED" : mode === "FAKE META CLIENT" ? "OFFLINE / FAKE" : "CONFIGURATION NEEDED"}</Badge><p>{mode === "META LIVE" ? "Connection checked when you submit" : "No provider request on page load"}</p></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div><span className="breadcrumb">OBSERVATORY <span>/</span> WORKSPACE</span><h1>CAUSAL EXPERIMENT</h1></div><div className="header-badges"><Badge tone={mode === "META LIVE" ? "amber" : "muted"}>{mode ?? "META CONFIGURATION NEEDED"}</Badge><Badge tone="cyan">SYNTHETIC FIXTURE</Badge></div></header>
      <main id="main" className="main-content">
        <div className="page-intro"><span className="eyebrow cyan-text">THE CAUSAL OBSERVATORY</span><h2>Ask. Intervene. Understand.</h2><p>From a research question to reproducible evidence, with an AI scientist in the loop.</p></div>
        <section id="research" className="panel question-panel section-anchor" tabIndex={-1} aria-labelledby="question-label">
          <div className="question-heading"><label id="question-label" htmlFor="research-question"><span className="section-index">01</span>Research question</label><span className="eyebrow">START WITH A HYPOTHESIS</span></div>
          <form onSubmit={submit}>
            <textarea ref={questionRef} id="research-question" name="researchQuestion" required maxLength={8000} rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={pending} aria-describedby="question-help" />
            <div className="form-footer"><p id="question-help">A single silence intervention. A matched control. An evidence-based comparison.</p><button className="primary-button" type="submit" disabled={pending || !question.trim()}>{pending ? <><span className="spinner" /> RUNNING EXPERIMENT</> : <>DESIGN & RUN EXPERIMENT <span aria-hidden="true">↗</span></>}</button></div>
          </form>
          {mode === "FAKE META CLIENT" && <p className="fake-note">FAKE META CLIENT · Offline demo specification and template interpretation; arbitrary questions do not change the proposed experiment.</p>}
        </section>
        <div className="sr-only" role="status">{notice}</div>
        {error && <div className="error-panel" role="alert"><strong>Experiment unavailable</strong><p>{error}</p></div>}
        {pending && <section className="panel loading-panel" role="status" aria-live="polite" aria-busy="true"><div><span className="spinner" /><h2>Scientific workflow in progress</h2></div><p>{mode === "FAKE META CLIENT" ? "Using the offline fake client for design and interpretation." : "The server is running the complete experiment. This may take a few minutes."} Results appear together when complete; stage completion is not streamed.</p><ol>{stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span>{mode === "FAKE META CLIENT" ? stage.replace("with Meta", "with fake client") : stage}</li>)}</ol></section>}
        {!pending && !result && <section className="empty-state" aria-label="Awaiting experiment"><div className="empty-orbit" aria-hidden="true"><span>↗</span></div><span className="eyebrow">CURIOSITY IN. EVIDENCE OUT.</span><h2>Your next discovery starts with a question.</h2><p>Run an experiment to inspect the proposed design, compare measured outcomes,<br className="desktop-break" /> and explore what the evidence might mean.</p><div className="empty-legend"><span><i className="cyan-dot" />Measured evidence</span><span><i className="red-dot" />Declared perturbation</span><span><i className="amber-dot" />AI interpretation</span></div></section>}
        {result && <div className="results" ref={resultRef} tabIndex={-1} aria-label="Completed experiment">
          <section id="proposed-experiment" className="panel proposal-panel section-anchor" tabIndex={-1} aria-labelledby="proposal-heading"><SectionTitle index="DESIGN" title="Proposed experiment" id="proposal-heading"><div className="proposal-badges"><Badge tone="amber">AI PROPOSED{result.mode === "FAKE META CLIENT" ? " / FAKE" : ""}</Badge><Badge tone="green">VALIDATED BY CAUSALFLY</Badge></div></SectionTitle><p className="submitted-question"><span>QUESTION RUN</span>{result.researchQuestion}</p><p className="hypothesis"><span className="eyebrow">HYPOTHESIS</span>{result.spec.hypothesis}</p><dl className="spec-grid"><div><dt>Perturbation target</dt><dd className="red-text">{result.spec.perturbation.targetNodeId}<small>SILENCE</small></dd></div><div><dt>Stimulus amplitude</dt><dd>{result.spec.stimulus.amplitude}</dd></div><div><dt>Seed</dt><dd>{result.spec.seed}<small>recorded; no randomness</small></dd></div><div><dt>Max steps</dt><dd>{result.spec.maxSteps}</dd></div><div><dt>Output threshold</dt><dd>{result.spec.outputThreshold}</dd></div></dl></section>
          <Comparison result={result} /><Provenance result={result} /><Scientist result={result} onNext={useNextQuestion} />
        </div>}
      </main>
      <footer className="scientific-disclaimer"><span aria-hidden="true">◇</span> Synthetic engineering fixture — not a biological model or Drosophila finding.</footer>
    </div>
  </div>;
}
