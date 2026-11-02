import recording from "../../../docs/review/sprint-6b/recorded-evidence.json";
import { FruitFlyNormalizer, connectomeHash } from "./fruitfly-protocol";
import type { FruitFlyEvidence } from "./contracts";

/** A pinned CausalFly capture, not a generated demo. Receipt/model times stay untouched. */
export function validatedRecording(): readonly FruitFlyEvidence[] {
  const normalizer = new FruitFlyNormalizer();
  normalizer.accept({ version: 1, type: "observatoryHello", dataset: "male-cns:v1.0", connectomeSha256: connectomeHash, neurons: 176422, edges: 6287749, neuronIds: true, spikeEventsAvailable: true, synapticTransmissionEvents: false, edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL", maxDisplaySpikes: 512, maxDisplayEdges: 256 }, recording[0].receivedAt);
  return Object.freeze(recording.map(frame => {
    if (!Number.isFinite(Date.parse(frame.receivedAt)) || frame.source !== "FRUITFLY_XR") throw new Error("Invalid recorded source");
    const evidence = normalizer.accept({ ...frame.telemetry, version: 1, type: "observatoryFrame" }, frame.receivedAt)!;
    for (const key of Object.keys(evidence.provenance) as (keyof FruitFlyEvidence["provenance"])[]) {
      if (frame.provenance[key] !== evidence.provenance[key]) throw new Error("Recorded provenance mismatch");
    }
    return evidence;
  }));
}
