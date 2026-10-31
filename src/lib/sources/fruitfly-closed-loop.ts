import { z } from "zod";
import { connectomeHash } from "./fruitfly-protocol";
import type { NeuralDrive, SensorFrame, Stimulus } from "../web/autonomy";

const finite = z.number().finite();
const hello = z.object({ version: z.literal(1), type: z.literal("hello"), sessionId: z.uuid(), dataset: z.literal("male-cns:v1.0"), sha256: z.literal(connectomeHash), neurons: z.literal(176422), edges: z.literal(6287749), dtMs: z.literal(.5), tickMs: z.literal(50), gain: z.literal(.65), seed: z.literal(20260903) });
const telemetry = z.object({ version: z.literal(1), type: z.literal("telemetry"), sessionId: z.uuid(), sequence: z.number().int().positive().safe(), inputSequence: z.number().int().min(-1).safe(), capturedMs: finite.nonnegative(), simulationMs: finite.nonnegative(), inputFresh: z.boolean(), inputAgeMs: finite.min(-1), computeMs: finite.nonnegative(), realTimeFactor: finite.nonnegative(), lagMs: finite.nonnegative(), takeoff: finite, activeNeurons: z.number().int().min(0).max(176422), spikes: z.number().int().nonnegative(), totalSpikes: z.number().int().nonnegative(), status: z.enum(["OK", "STALE_INPUT", "SIMULATION_BEHIND"]), motorMode: z.string().max(32), jump: z.boolean(), escape: z.boolean(), sensoryProvenance: z.literal("PROXY"), decisionProvenance: z.literal("CONNECTOME"), embodimentProvenance: z.literal("SCRIPTED"), landingProvenance: z.literal("SCRIPTED"), populations: z.array(z.object({ name: z.string().max(40), count: z.number().int().positive(), hz: finite.nonnegative(), spikes: z.number().int().nonnegative() })).max(32), channels: z.array(z.object({ name: z.string().max(40), value: finite })).max(32) });
export interface BrainStimulus {
  version: 1; type: "stimulus"; sessionId: string; sequence: number; capturedMs: number;
  tracked: boolean; azimuthDeg: number; elevationDeg: number; angularSizeDeg: number; expansionDegPerS: number; sensoryProvenance: "PROXY";
}
/** Existing analytic-object channel only. Scene units map explicitly to 0.1 m.
 * Neither collision distances nor arbitrary neural stimulation are supported upstream. */
export function brainStimulus(sessionId: string, sequence: number, capturedMs: number, sensors: SensorFrame, stimulus: Stimulus | null, previous: { distance: number; capturedMs: number } | null): BrainStimulus {
  const distance = Math.max(.01, (sensors.stimulusDistance ?? 0) * .1), radius = (stimulus?.radius ?? .22) * .1;
  const dt = previous ? (capturedMs - previous.capturedMs) / 1000 : 0;
  const approach = previous && dt > 0 && dt <= .25 ? Math.max(-3, Math.min(3, (previous.distance - distance) / dt)) : 0;
  return { version: 1, type: "stimulus", sessionId, sequence, capturedMs, tracked: stimulus !== null,
    azimuthDeg: -sensors.stimulusDirection * 180 / Math.PI, elevationDeg: 0,
    angularSizeDeg: stimulus ? 2 * Math.atan(radius / distance) * 180 / Math.PI : 0,
    expansionDegPerS: stimulus ? Math.max(-2000, Math.min(2000, 2 * radius * approach / (distance * distance + radius * radius) * 180 / Math.PI)) : 0, sensoryProvenance: "PROXY" };
}
export type BrainSocket = Pick<WebSocket, "send" | "close" | "addEventListener" | "bufferedAmount">;
export interface BrainTransportEvidence {
  endpoint: "ws://127.0.0.1:8765/brain/v1"; sceneUnitsToMetres: .1;
  messages: { direction: "sent" | "received"; atMs: number; json: string }[]; status: string;
}
/** Explicitly opt-in local research client. Independent of the read-only observatory bridge.
 * New instance per reset/reconnect; every callback checks its closed/session boundary. */
export class ExperimentalBrainAdapter {
  private socket: BrainSocket;
  private session: string | null = null;
  private sequence = 0;
  private outputSequence = 0;
  private modelMs = -1;
  private lastSend = -Infinity;
  private previous: { distance: number; capturedMs: number } | null = null;
  private sent = new Map<number, number>();
  private closed = false;
  private started: number;
  private lastReceived: number;
  private record: BrainTransportEvidence = { endpoint: "ws://127.0.0.1:8765/brain/v1", sceneUnitsToMetres: .1, messages: [], status: "Connecting experimental local brain input" };
  constructor(private onDrive: (drive: NeuralDrive | null) => void, private now = () => performance.now(), open: (url: string) => BrainSocket = url => new WebSocket(url), private wallNow = () => Date.now()) {
    this.started = this.lastReceived = now();
    this.socket = open(this.record.endpoint);
    this.socket.addEventListener("message", event => {
      if (this.closed) return;
      try {
        if (typeof event.data !== "string" || event.data.length > 32768 || this.record.messages.length >= 2600) throw new Error("Message bound");
        this.record.messages.push({ direction: "received", atMs: now(), json: event.data });
        const raw = JSON.parse(event.data);
        if (!this.session) { this.session = hello.parse(raw).sessionId; this.record.status = "Experimental brain input connected"; this.lastReceived = now(); return; }
        const t = telemetry.parse(raw);
        if (t.sessionId !== this.session || t.sequence <= this.outputSequence || t.simulationMs <= this.modelMs) throw new Error("Session/order mismatch");
        this.outputSequence = t.sequence; this.modelMs = t.simulationMs; this.lastReceived = now();
        const captured = this.sent.get(t.inputSequence), age = captured === undefined ? Infinity : now() - captured;
        if (t.totalSpikes < t.spikes || !t.inputFresh || t.inputAgeMs < 0 || t.inputAgeMs > 500 || captured !== t.capturedMs || age < 0 || age > 750) { onDrive(null); return; }
        // Match BrainClient's genuine jump criterion; do not treat a latched mode as a new jump.
        const escape = t.motorMode === "ESCAPE" && t.jump && t.escape && t.populations.some(p => p.name === "DNp01" && p.spikes > 0);
        onDrive({ source: "FRUITFLY_XR", activity: null, decoder: escape ? "ESCAPE" : null, reference: { sessionId: t.sessionId, sequence: t.sequence, inputSequence: t.inputSequence, receivedAt: new Date(this.wallNow()).toISOString(), transport: "brain/v1" } });
      } catch { this.close("Experimental brain message rejected"); }
    });
    this.socket.addEventListener("close", () => this.close("Experimental brain disconnected"));
    this.socket.addEventListener("error", () => this.close("Experimental brain unavailable"));
  }
  publish(sensors: SensorFrame, stimulus: Stimulus | null) {
    if (this.closed) return;
    const now = this.now();
    if (now - this.lastReceived > 5000 || now - this.started > 60000) { this.close("Experimental brain session ended; reset to reconnect"); return; }
    if (!this.session || now - this.lastSend < 50) return;
    if (this.socket.bufferedAmount > 4096 || this.record.messages.length >= 2600) { this.close("Experimental brain capacity reached"); return; }
    const input = brainStimulus(this.session, ++this.sequence, now, sensors, stimulus, this.previous);
    this.previous = stimulus ? { distance: Math.max(.01, (sensors.stimulusDistance ?? 0) * .1), capturedMs: now } : null;
    this.lastSend = now; this.sent.set(input.sequence, now);
    for (const [sequence, captured] of this.sent) if (now - captured > 1000) this.sent.delete(sequence);
    const json = JSON.stringify(input);
    try { this.socket.send(json); this.record.messages.push({ direction: "sent", atMs: now, json }); }
    catch { this.close("Experimental brain send failed"); }
  }
  close(status = "Experimental brain disconnected") {
    if (this.closed) return;
    this.closed = true; this.record.status = status; this.onDrive(null); this.socket.close();
  }
  evidence(): BrainTransportEvidence { return structuredClone(this.record); }
  get status() { return this.record.status; }
}
