import { z } from "zod";
import { freezeRecord } from "../experiment/engine";
import type { FruitFlyEvidence } from "./contracts";

// Verified against fruitfly-xr ResearchProtocol, ResearchHub and NeuralEngine.
export const connectomeHash = "e33df182bed7a6f3ea279daf4790a82b05706d3d41e819a6a80c0473e8c559f3";
const count = z.number().int().nonnegative().safe();
const finite = z.number().finite();
const time = finite.nonnegative();
const helloSchema = z.object({
  version: z.literal(1), type: z.literal("observatoryHello"),
  dataset: z.literal("male-cns:v1.0"), connectomeSha256: z.literal(connectomeHash),
  neurons: z.literal(176422), edges: z.literal(6287749),
  neuronIds: z.literal(true), spikeEventsAvailable: z.literal(true),
  synapticTransmissionEvents: z.literal(false),
  edgeDisplaySemantics: z.literal("CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL"),
  maxDisplaySpikes: z.literal(512), maxDisplayEdges: z.literal(256),
});
const channelName = z.enum(["forward", "yaw", "backward", "halt", "brake", "jump", "takeoff", "landing", "flightPower", "flightYaw", "wingMotor", "groomAntenna", "groomHead", "groomLeg", "groomAbdomen", "feed", "courtship", "song", "songPulse", "legMotor", "legMotorAsym"]);
const frameSchema = z.object({
  version: z.literal(1), type: z.literal("observatoryFrame"),
  sessionId: z.uuid(), sequence: count.positive(), simulationMs: time, neuralTick: count.positive(),
  totalSpikeEvents: count, activeNeuronCount: count.max(176422),
  displaySpikeEvents: count.max(512), displayTruncated: z.boolean(),
  droppedDisplayFrames: count, droppedSubscriberMessages: count,
  spikeDisplaySemantics: z.literal("EXACT_SPIKES_FIRST_N_FILTERED"),
  edgeDisplaySemantics: z.literal("CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL"),
  spikeEvents: z.array(z.object({ neuronId: count.positive(), spikeTimeMs: time })).max(512),
  decodedMotor: z.array(z.object({ name: channelName, value: finite })).min(1).max(21),
  inputSequence: z.number().int().min(-1).safe(), inputFresh: z.boolean(),
  motorMode: z.enum(["IDLE", "FORWARD", "BACKWARD", "HALT", "BRAKE", "ESCAPE", "FLYING", "LANDING", "GROOM", "FEED", "SONG"]),
}).superRefine((frame, ctx) => {
  if (frame.displaySpikeEvents !== frame.spikeEvents.length || frame.totalSpikeEvents < frame.displaySpikeEvents || frame.displayTruncated !== (frame.totalSpikeEvents > frame.displaySpikeEvents) || frame.spikeEvents.some((event) => event.spikeTimeMs > frame.simulationMs) || new Set(frame.decodedMotor.map((channel) => channel.name)).size !== frame.decodedMotor.length) {
    ctx.addIssue({ code: "custom", message: "Inconsistent telemetry" });
  }
});

export class FruitFlyNormalizer {
  private hello: z.infer<typeof helloSchema> | null = null;
  private previous: FruitFlyEvidence["telemetry"] | null = null;

  accept(message: unknown, receivedAt: string): FruitFlyEvidence | null {
    const envelope = z.object({ version: z.literal(1), type: z.string() }).parse(message);
    if (envelope.type === "observatoryHello") {
      if (this.hello) throw new Error("Unexpected hello");
      this.hello = helloSchema.parse(message);
      return null;
    }
    if (!this.hello) throw new Error("Missing verified source identity");
    // Static anatomy is deliberately not ingested or forwarded in this sprint.
    if (envelope.type === "observatoryScaffoldChunk") return null;
    const parsed = frameSchema.parse(message);
    const telemetry: FruitFlyEvidence["telemetry"] = {
      sessionId: parsed.sessionId, sequence: parsed.sequence, simulationMs: parsed.simulationMs,
      neuralTick: parsed.neuralTick, totalSpikeEvents: parsed.totalSpikeEvents,
      activeNeuronCount: parsed.activeNeuronCount, displaySpikeEvents: parsed.displaySpikeEvents,
      displayTruncated: parsed.displayTruncated, droppedDisplayFrames: parsed.droppedDisplayFrames,
      droppedSubscriberMessages: parsed.droppedSubscriberMessages,
      spikeDisplaySemantics: parsed.spikeDisplaySemantics, edgeDisplaySemantics: parsed.edgeDisplaySemantics,
      spikeEvents: parsed.spikeEvents, decodedMotor: parsed.decodedMotor,
      inputSequence: parsed.inputSequence, inputFresh: parsed.inputFresh, motorMode: parsed.motorMode,
    };
    if (this.previous?.sessionId === telemetry.sessionId && (telemetry.sequence <= this.previous.sequence || telemetry.simulationMs <= this.previous.simulationMs || telemetry.neuralTick <= this.previous.neuralTick)) throw new Error("Out of order telemetry");
    this.previous = telemetry;
    return freezeRecord({
      source: "FRUITFLY_XR" as const, receivedAt,
      provenance: {
        structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0" as const,
        dataset: this.hello.dataset, connectomeSha256: this.hello.connectomeSha256,
        neurons: this.hello.neurons, edges: this.hello.edges,
        dynamics: "SIMULATED" as const, generator: "FruitFly XR brain server" as const,
        experimentalRecording: false as const, transport: "observatory/v1" as const,
      }, telemetry,
    });
  }
}
