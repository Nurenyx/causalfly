import type { FruitFlySnapshot } from "@/lib/sources/contracts";
import { Badge, SectionTitle } from "./workspace-ui";

export function FruitFlyEvidenceView({ snapshot }: { snapshot: FruitFlySnapshot }) {
  const evidence = snapshot.evidence;
  return <div className="evidence-view">
    <section className="panel"><SectionTitle index="01" title="FruitFly XR evidence"><Badge tone={snapshot.state === "DATA RECEIVED" ? "green" : "muted"}>{snapshot.state}</Badge></SectionTitle>
      <p>{snapshot.message}</p>
      <p>Connectome-backed simulation telemetry. Neural dynamics are simulated by the FruitFly XR brain server. These data are not experimental recordings from a living fly.</p>
      {!evidence && <p>No validated simulation frame has been received. Start a trial in FruitFly XR, then connect using the Data Source panel.</p>}
      {evidence && <><p className="trace-note">Last received snapshot · CausalFly receipt time: {evidence.receivedAt}. This is not a claim of current activity.</p>
        <dl className="network-provenance"><div><dt>Data source</dt><dd>FruitFly XR</dd></div><div><dt>Structural source</dt><dd>{evidence.provenance.structuralSource}</dd></div><div><dt>Dynamics</dt><dd>Simulated · not biological recordings</dd></div><div><dt>Session</dt><dd>{evidence.telemetry.sessionId}</dd></div><div><dt>Sequence</dt><dd>{evidence.telemetry.sequence}</dd></div><div><dt>Simulation time</dt><dd>{evidence.telemetry.simulationMs} ms (model time)</dd></div><div><dt>Neural tick</dt><dd>{evidence.telemetry.neuralTick}</dd></div><div><dt>Motor decoder mode</dt><dd>{evidence.telemetry.motorMode}</dd></div></dl>
      </>}
    </section>
    {evidence && <section className="panel"><SectionTitle index="02" title="How this result was produced" />
      <p>The published connectome supplies structure. FruitFly XR generates the neural dynamics. Decoder channels describe simulated outputs; they do not establish actual movement or a causal intervention effect.</p>
      <p>{evidence.telemetry.totalSpikeEvents} simulated spike events in this tick; {evidence.telemetry.displaySpikeEvents} events displayed{evidence.telemetry.displayTruncated ? " (truncated)" : ""}. Active neuron count ({evidence.telemetry.activeNeuronCount}) includes neurons that did not spike.</p>
      <p>Stream drop counters: {evidence.telemetry.droppedDisplayFrames} display frames; {evidence.telemetry.droppedSubscriberMessages} subscriber messages. This latest-only stream is not a complete recording.</p>
      <p>Stimulus reference: input sequence {evidence.telemetry.inputSequence}; upstream freshness flag: {String(evidence.telemetry.inputFresh)}. Stimulus values and XR movement are not supplied by this stream.</p>
      <details className="provenance-details"><summary>Inspect received telemetry and source provenance</summary><p>Spike events are the first N filtered exact simulated events. Connected active edges are explicitly non-causal and are not ingested. Static anatomy, membrane potentials and population rates are not ingested.</p><pre>{JSON.stringify(evidence, null, 2)}</pre></details>
    </section>}
  </div>;
}
