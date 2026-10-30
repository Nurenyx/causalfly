import type { FruitFlySnapshot } from "@/lib/sources/contracts";
import { Badge, EvidenceFlow, SectionTitle } from "./workspace-ui";

export function FruitFlyEvidenceView({ snapshot, question }: { snapshot: FruitFlySnapshot; question?: string }) {
  const evidence = snapshot.evidence;
  return <div className="evidence-view">
    <header className="evidence-purpose"><h2>Verify what happened.</h2><p>Simulation measurements, source provenance and AI interpretation remain separate.</p></header>
    {question && <p className="workflow-investigation"><span className="eyebrow">INVESTIGATION QUESTION / RETAINED SESSION</span><span>{question}</span></p>}
    <div className="evidence-heading"><div><span className="eyebrow">FRUITFLY XR / CHAIN OF CUSTODY</span><h2>Trace the simulation evidence.</h2></div><Badge tone="muted">READ-ONLY TELEMETRY</Badge></div>
    {evidence && <EvidenceFlow stages={[{ label: "PUBLISHED CONNECTOME", detail: evidence.provenance.structuralSource }, { label: "FRUITFLY XR SIMULATION", detail: "Simulated neural dynamics" }, { label: "TELEMETRY FRAME", detail: `Sequence ${evidence.telemetry.sequence} · ${evidence.telemetry.simulationMs} model ms` }, { label: "CAUSALFLY EVIDENCE", detail: "Validated received snapshot" }]} />}
    <section className="panel"><SectionTitle index="01" title="FruitFly XR evidence"><Badge tone={snapshot.state === "DATA RECEIVED" ? "green" : "muted"}>{snapshot.state}</Badge></SectionTitle>
      <p className="source-message">{snapshot.message}</p>
      <p>Connectome-backed simulation telemetry. Neural dynamics are simulated by the FruitFly XR brain server. These data are not experimental recordings from a living fly.</p>
      {!evidence && <p>No validated simulation frame has been received. Start a trial in FruitFly XR, then connect using the Data Source panel.</p>}
      {evidence && <><p className="trace-note">Last received snapshot · CausalFly receipt time: {evidence.receivedAt}. This is not a claim of current activity.</p>
        <dl className="network-provenance"><div><dt>Data source</dt><dd>FruitFly XR</dd></div><div><dt>Structural source</dt><dd>{evidence.provenance.structuralSource}</dd></div><div><dt>Dynamics</dt><dd>Simulated · not biological recordings</dd></div><div><dt>Session</dt><dd>{evidence.telemetry.sessionId}</dd></div><div><dt>Sequence</dt><dd>{evidence.telemetry.sequence}</dd></div><div><dt>Simulation time</dt><dd>{evidence.telemetry.simulationMs} ms (model time)</dd></div><div><dt>Neural tick</dt><dd>{evidence.telemetry.neuralTick}</dd></div><div><dt>Motor decoder mode</dt><dd>{evidence.telemetry.motorMode}</dd></div></dl>
      </>}
    </section>
    {evidence && <details className="panel evidence-methodology"><summary>How this result was produced</summary>
      <dl className="audit-readouts"><div><dt>Simulated events / tick</dt><dd>{evidence.telemetry.totalSpikeEvents}</dd></div><div><dt>Supplied display events</dt><dd>{evidence.telemetry.displaySpikeEvents}</dd></div><div><dt>Dropped display frames</dt><dd>{evidence.telemetry.droppedDisplayFrames}</dd></div><div><dt>Dropped subscriber messages</dt><dd>{evidence.telemetry.droppedSubscriberMessages}</dd></div></dl>
      <p>The published connectome supplies structure. FruitFly XR generates the neural dynamics. Decoder channels describe simulated outputs; they do not establish actual movement or a causal intervention effect.</p>
      <p>{evidence.telemetry.totalSpikeEvents} simulated spike events in this tick; {evidence.telemetry.displaySpikeEvents} events displayed{evidence.telemetry.displayTruncated ? " (truncated)" : ""}. Active neuron count ({evidence.telemetry.activeNeuronCount}) includes neurons that did not spike.</p>
      <p>Stream drop counters: {evidence.telemetry.droppedDisplayFrames} display frames; {evidence.telemetry.droppedSubscriberMessages} subscriber messages. This latest-only stream is not a complete recording.</p>
      <p>Stimulus reference: input sequence {evidence.telemetry.inputSequence}; upstream freshness flag: {String(evidence.telemetry.inputFresh)}. Stimulus values and XR movement are not supplied by this stream.</p>
      <details className="provenance-details"><summary>Inspect received telemetry and source provenance</summary><p>Spike events are the first N filtered exact simulated events. Connected active edges are explicitly non-causal and are not ingested. Static anatomy, membrane potentials and population rates are not ingested.</p><pre>{JSON.stringify(evidence, null, 2)}</pre></details>
    </details>}
  </div>;
}
