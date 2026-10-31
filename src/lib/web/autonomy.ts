import { freezeRecord } from "../experiment/engine";
import { syntheticDemoNetwork } from "../experiment/network";
import type { FruitFlySnapshot } from "../sources/contracts";

export const AUTONOMY_VERSION = "experimental-embodiment-v3";
export const FIXED_DT = .05;
export const MAX_TICKS = 1200;
export type Behaviour = "IDLE" | "EXPLORE" | "WALK" | "TURN_LEFT" | "TURN_RIGHT" | "AVOID" | "ESCAPE";
export type BehaviourSource = "BASELINE_AUTONOMOUS_POLICY" | "SYNTHETIC_NEURAL_MODEL" | "FRUITFLY_DECODER" | "EXPERIMENTAL_NEURAL_DERIVATION";
export const behaviourSourceLabels: Record<BehaviourSource, string> = {
  BASELINE_AUTONOMOUS_POLICY: "Baseline autonomous policy", SYNTHETIC_NEURAL_MODEL: "Synthetic neural model",
  FRUITFLY_DECODER: "Live connectome decoder", EXPERIMENTAL_NEURAL_DERIVATION: "Experimental neural derivation",
};
export interface WorldState { x: number; z: number; heading: number; speed: number; altitude?: number; verticalSpeed?: number; pitch?: number; roll?: number }
export interface Arena { radius: number; bodyRadius: number; obstacles: { x: number; z: number; radius: number }[] }
export const DEFAULT_ARENA: Arena = { radius: 2, bodyRadius: .48, obstacles: [{ x: .6, z: -.7, radius: .24 }] };
export interface Stimulus { x: number; z: number; radius: number; intensity: number }
export interface SensorFrame {
  front: number; left: number; right: number; boundary: number;
  stimulusDistance: number | null; stimulusDirection: number; stimulusIntensity: number;
}
export interface NeuralDrive {
  source: "SYNTHETIC_FIXTURE" | "FRUITFLY_XR" | "NONE";
  activity: number | null; decoder: string | null;
  reference: { sessionId: string; sequence: number; inputSequence: number; receivedAt: string; transport: string } | null;
}
export interface BehaviourDecision { trigger?: NeuralDrive | null; state: Behaviour; source: BehaviourSource; reason: string; duration: number }
export interface MotorCommand { trigger?: NeuralDrive | null; modulationSource?: BehaviourSource; phase?: "TAKEOFF_ESCAPE" | "RECOVERY" | "GROUNDED"; execution?: "CAUSALFLY_PROCEDURAL_CONTROLLER"; verticalTarget?: number; pitchTarget?: number; rollTarget?: number; forwardDrive: number; turnDrive: number; escapeDrive: number; speedTarget: number }
export interface AutonomyFrame {
  tick: number; before: WorldState; after: WorldState; sensors: SensorFrame;
  neural: NeuralDrive; decision: BehaviourDecision; motor: MotorCommand; stimulus: Stimulus | null; collision: boolean;
}
export interface AutonomyConfig { mode: "exploration" | "trial"; seed: number; source: "synthetic" | "fruitfly"; silenced: boolean; arena: Arena; initial: WorldState }
export interface AutonomyInput { cancelEscape?: boolean; stimulus: Stimulus | null; neural: NeuralDrive | null }
export interface AutonomyCheckpoint {
  tick: number; world: WorldState; nodes: Record<string, number>; previous: AutonomyFrame | null;
  escape: { startTick: number; drive: NeuralDrive } | null; recoveryTrigger: NeuralDrive | null; avoidTurn: number | null; decoderWasEscape: boolean;
}
export interface AutonomyEvidence {
  schemaVersion: typeof AUTONOMY_VERSION; config: AutonomyConfig; timestep: number;
  network: typeof syntheticDemoNetwork; syntheticThreshold: number;
  checkpoint: AutonomyCheckpoint; trajectory: AutonomyFrame[]; inputs: AutonomyInput[]; samples: AutonomyFrame[]; ticks: number; droppedWallSeconds: number; disclosure: string;
}
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const angle = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));

/** Analytic rays with obstacles inflated by the collision radius. Heading zero is -Z; positive yaw is left. */
function ray(world: WorldState, yaw: number, arena: Arena) {
  const dx = -Math.sin(yaw), dz = -Math.cos(yaw), b = world.x * dx + world.z * dz;
  const r = arena.radius - arena.bodyRadius;
  let distance = Math.max(0, -b + Math.sqrt(Math.max(0, b * b + r * r - world.x ** 2 - world.z ** 2)));
  for (const obstacle of arena.obstacles) {
    const x = world.x - obstacle.x, z = world.z - obstacle.z, radius = obstacle.radius + arena.bodyRadius;
    if (x * x + z * z <= radius * radius) return 0;
    const projection = x * dx + z * dz, disc = projection ** 2 - (x * x + z * z - radius ** 2);
    if (disc >= 0 && -projection - Math.sqrt(disc) >= 0) distance = Math.min(distance, -projection - Math.sqrt(disc));
  }
  return distance;
}
export function sense(world: WorldState, arena: Arena, stimulus: Stimulus | null): SensorFrame {
  const distance = stimulus ? Math.hypot(stimulus.x - world.x, stimulus.z - world.z) : null;
  return { front: ray(world, world.heading, arena), left: ray(world, world.heading + .65, arena), right: ray(world, world.heading - .65, arena),
    boundary: Math.max(0, arena.radius - arena.bodyRadius - Math.hypot(world.x, world.z)),
    stimulusDistance: distance, stimulusDirection: stimulus ? angle(Math.atan2(-(stimulus.x - world.x), -(stimulus.z - world.z)) - world.heading) : 0,
    stimulusIntensity: stimulus ? clamp(stimulus.intensity / Math.max(1, distance ?? 1)) : 0 };
}
export function decide(sensors: SensorFrame, neural: NeuralDrive, tick: number, seed: number, avoidTurn: number | null = null): { state: Behaviour; source: BehaviourSource; reason: string; motor: MotorCommand } {
  const escape = neural.decoder === "ESCAPE", sign = avoidTurn ?? (sensors.left >= sensors.right ? 1 : -1), avoid = sensors.front < .45 || avoidTurn !== null;
  const turn = avoid ? sign : clamp(-sensors.stimulusDirection * .25 + Math.sin(tick * FIXED_DT * .7 + seed % 97) * .22, -1, 1);
  if (escape) return { state: "ESCAPE", source: neural.source === "FRUITFLY_XR" ? "FRUITFLY_DECODER" : "SYNTHETIC_NEURAL_MODEL", reason: avoid ? "Decoder ESCAPE; local collision avoidance steers execution" : "Available decoder output crossed escape criterion", motor: { forwardDrive: 1, turnDrive: avoid ? sign : sensors.stimulusDistance === null ? .3 : clamp(angle(sensors.stimulusDirection + Math.PI), -1, 1), escapeDrive: 1, speedTarget: avoid ? .12 : 1.4 } };
  if (avoid) return { state: "AVOID", source: "BASELINE_AUTONOMOUS_POLICY", reason: "Forward clearance below 0.45 scene units", motor: { forwardDrive: .1, turnDrive: sign, escapeDrive: 0, speedTarget: .06 } };
  const state = tick < 4 ? "IDLE" : tick < 24 ? "EXPLORE" : Math.abs(turn) > .18 ? turn > 0 ? "TURN_LEFT" : "TURN_RIGHT" : "WALK";
  return { state, source: "BASELINE_AUTONOMOUS_POLICY", reason: (neural.activity ?? 0) > 0 ? "Baseline exploration speed modulated by synthetic output" : state === "IDLE" ? "Initial settling" : "Seeded exploration with geometric steering", motor: { ...((neural.activity ?? 0) > 0 ? { modulationSource: "SYNTHETIC_NEURAL_MODEL" as const } : {}), forwardDrive: state === "IDLE" ? 0 : .5, turnDrive: turn, escapeDrive: 0, speedTarget: state === "IDLE" ? 0 : .4 + .15 * (neural.activity ?? 0) } };
}

/** Pure fixed-step controller. No providers, rendering, or experiment measurement mutations. */
export class AutonomyEngine {
  readonly config: AutonomyConfig;
  private world: WorldState;
  private nodes: Record<string, number> = {};
  private accumulator = 0;
  private inputs: AutonomyInput[] = [];
  private samples: AutonomyFrame[] = [];
  private previous: AutonomyFrame | null = null;
  private trajectoryFrames: AutonomyFrame[] = [];
  private escape: { startTick: number; drive: NeuralDrive } | null = null;
  private decoderWasEscape = false;
  private recoveryTrigger: NeuralDrive | null = null;
  private avoidTurn: number | null = null;
  private checkpoint: AutonomyCheckpoint;
  private external: NeuralDrive | null = null;
  private externalUntil = -1;
  private cancelEscape = false;
  private sourceSession: string | null = null;
  private sequence = -1;
  private startedAt: number;
  private dropped = 0;
  tick = 0;
  paused = false;
  constructor(config: Partial<AutonomyConfig> = {}, startedAt = Date.now(), checkpoint?: AutonomyCheckpoint, droppedWallSeconds = 0) {
    this.config = freezeRecord(structuredClone({ mode: "trial", seed: 12, source: "synthetic", silenced: false, arena: DEFAULT_ARENA, initial: { x: 0, z: .8, heading: 0, speed: 0 }, ...config } as AutonomyConfig));
    if (!Number.isSafeInteger(this.config.seed)) throw new Error("Invalid autonomy seed");
    this.world = structuredClone(this.config.initial); this.startedAt = startedAt;
    if (checkpoint) {
      this.tick = checkpoint.tick; this.world = structuredClone(checkpoint.world); this.nodes = structuredClone(checkpoint.nodes);
      this.previous = structuredClone(checkpoint.previous); this.escape = structuredClone(checkpoint.escape); this.decoderWasEscape = checkpoint.decoderWasEscape; this.recoveryTrigger = structuredClone(checkpoint.recoveryTrigger); this.avoidTurn = checkpoint.avoidTurn;
    }
    this.checkpoint = this.captureCheckpoint(); this.dropped = droppedWallSeconds;
  }
  reset(startedAt = Date.now()) {
    this.world = structuredClone(this.config.initial); this.nodes = {}; this.accumulator = 0;
    this.inputs = []; this.samples = []; this.previous = null; this.disconnect();
    this.sourceSession = null; this.sequence = -1; this.startedAt = startedAt;
    this.dropped = 0; this.tick = 0; this.paused = false; this.trajectoryFrames = []; this.escape = null; this.decoderWasEscape = false; this.recoveryTrigger = null; this.avoidTurn = null; this.cancelEscape = false; this.checkpoint = this.captureCheckpoint();
  }
  private captureCheckpoint(): AutonomyCheckpoint {
    return structuredClone({ tick: this.tick, world: this.world, nodes: this.nodes, previous: this.previous, escape: this.escape, recoveryTrigger: this.recoveryTrigger, avoidTurn: this.avoidTurn, decoderWasEscape: this.decoderWasEscape });
  }
  get complete() { return this.config.mode === "trial" && this.tick >= MAX_TICKS; }
  trajectory() { return freezeRecord(structuredClone(this.trajectoryFrames)); }
  get frame() { return this.previous; }
  get state() { return { ...this.world }; }
  setPaused(paused: boolean) { if (this.paused === paused) return; this.paused = paused; this.accumulator = 0; if (paused) this.disconnect(); }
  disconnect() { this.external = null; this.externalUntil = -1; if (this.escape) this.cancelEscape = true; }
  observe(snapshot: FruitFlySnapshot, now: number) {
    if (this.paused || this.config.source !== "fruitfly") return;
    const e = snapshot.evidence, t = e?.telemetry;
    if (snapshot.state !== "DATA RECEIVED" || !e || !t) { this.disconnect(); return; }
    const receipt = Date.parse(e.receivedAt);
    if (!Number.isFinite(receipt) || receipt <= this.startedAt || now - receipt < 0 || now - receipt > 750 || !t.inputFresh || t.inputSequence < 0) { this.disconnect(); return; }
    if (this.sourceSession && this.sourceSession !== t.sessionId) { this.disconnect(); return; }
    if (t.sequence <= this.sequence) return;
    this.sourceSession = t.sessionId; this.sequence = t.sequence;
    this.external = { source: "FRUITFLY_XR", activity: null, decoder: t.motorMode,
      reference: { sessionId: t.sessionId, sequence: t.sequence, inputSequence: t.inputSequence, receivedAt: e.receivedAt, transport: e.provenance.transport } };
    this.externalUntil = this.tick + Math.max(0, Math.floor((750 - (now - receipt)) / 50));
  }
  /** Separate validated brain adapter boundary; never writes to observatory. */
  acceptBrain(drive: NeuralDrive) {
    if (this.paused || this.config.source !== "fruitfly" || drive.source !== "FRUITFLY_XR" || !drive.reference) return;
    const receipt = Date.parse(drive.reference.receivedAt);
    if (!Number.isFinite(receipt) || receipt <= this.startedAt) return;
    if (this.sourceSession && drive.reference.sessionId !== this.sourceSession || drive.reference.sequence <= this.sequence) return;
    this.sourceSession = drive.reference.sessionId; this.sequence = drive.reference.sequence;
    this.external = structuredClone(drive); this.externalUntil = this.tick + 5;
  }
  advance(seconds: number, input: (tick: number) => Stimulus | null) {
    if (this.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    this.dropped += Math.max(0, seconds - .25);
    this.accumulator += Math.min(.25, seconds);
    while (this.accumulator + 1e-9 >= FIXED_DT && !this.complete) {
      this.accumulator -= FIXED_DT;
      this.step({ stimulus: input(this.tick), neural: this.externalUntil > this.tick ? this.external : null, ...(this.cancelEscape ? { cancelEscape: true } : {}) });
    }
    if (this.complete) this.setPaused(true);
  }
  /** Exact input ledger is the replay boundary; replay never consults transport. */
  step(input: AutonomyInput) {
    if (this.paused || this.complete) return;
    // Exploration continues while scientific retention stays bounded. Each new window
    // begins with a complete deterministic checkpoint rather than an invented reset.
    if (this.config.mode === "exploration" && this.inputs.length >= MAX_TICKS) {
      this.checkpoint = this.captureCheckpoint(); this.inputs = []; this.samples = []; this.trajectoryFrames = [];
    }
    const before = this.state, sensors = sense(before, this.config.arena, input.stimulus);
    let neural: NeuralDrive = { source: "NONE", activity: null, decoder: null, reference: null };
    if (this.config.source === "synthetic") {
      const next: Record<string, number> = Object.fromEntries(syntheticDemoNetwork.nodes.map(n => [n.id, 0]));
      for (const edge of syntheticDemoNetwork.edges) next[edge.to] += (this.nodes[edge.from] ?? 0) * edge.weight;
      for (const id of Object.keys(next)) next[id] = clamp(next[id]);
      next.stimulus = sensors.stimulusIntensity;
      if (this.config.silenced) next.primary_a = 0;
      this.nodes = next;
      neural = { source: "SYNTHETIC_FIXTURE", activity: next.motor, decoder: next.motor >= .75 ? "ESCAPE" : null, reference: null };
    } else if (input.neural) neural = structuredClone(input.neural);
    if (input.cancelEscape) this.escape = null;
    this.cancelEscape = false;
    const risingEscape = neural.decoder === "ESCAPE" && !this.decoderWasEscape;
    this.decoderWasEscape = neural.decoder === "ESCAPE";
    if (!this.escape && (before.altitude ?? 0) <= .001) this.recoveryTrigger = null;
    if (risingEscape && !this.escape && (before.altitude ?? 0) <= .001) {
      this.escape = { startTick: this.tick, drive: structuredClone(neural) }; this.recoveryTrigger = structuredClone(neural);
    }
    if (this.escape && this.tick - this.escape.startTick >= 16) this.escape = null;
    const trigger = this.escape?.drive ?? null;
    // A finite motor response remembers its accepted trigger; it never fabricates
    // current neural activity or repeats indefinitely for a latched decoder label.
    // Keep the selected avoidance side until clearance has recovered. Re-selecting
    // every tick can alternate signs at contact and leave the fly trapped.
    if (sensors.front > .65) this.avoidTurn = null;
    else if (sensors.front < .45 && this.avoidTurn === null) this.avoidTurn = sensors.left >= sensors.right ? 1 : -1;
    const choice = decide(sensors, trigger ?? { ...neural, decoder: null }, this.tick, this.config.seed, this.avoidTurn);
    const motor: MotorCommand = { ...choice.motor, trigger: structuredClone(this.recoveryTrigger), execution: "CAUSALFLY_PROCEDURAL_CONTROLLER", phase: trigger ? "TAKEOFF_ESCAPE" : (before.altitude ?? 0) > .01 ? "RECOVERY" : "GROUNDED", verticalTarget: trigger ? 1.05 : 0, pitchTarget: trigger ? -.28 : 0, rollTarget: trigger ? choice.motor.turnDrive * .16 : 0 };
    const duration = this.previous?.decision.state === choice.state && this.previous.decision.source === choice.source ? this.previous.decision.duration + FIXED_DT : FIXED_DT;
    const heading = angle(before.heading + motor.turnDrive * 2 * FIXED_DT);
    const speed = before.speed + clamp(motor.speedTarget - before.speed, -2 * FIXED_DT, (trigger ? 4.2 : 1.2) * FIXED_DT);
    let x = before.x - Math.sin(heading) * speed * FIXED_DT, z = before.z - Math.cos(heading) * speed * FIXED_DT;
    const arena = this.config.arena;
    const collision = Math.hypot(x, z) > arena.radius - arena.bodyRadius || arena.obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.radius + arena.bodyRadius);
    if (collision) { x = before.x; z = before.z; }
    const height = before.altitude ?? 0;
    const verticalTargetSpeed = clamp(((motor.verticalTarget ?? 0) - height) * 3, -1.2, 2);
    let verticalSpeed = (before.verticalSpeed ?? 0) + clamp(verticalTargetSpeed - (before.verticalSpeed ?? 0), -4 * FIXED_DT, 4 * FIXED_DT);
    const altitude = Math.max(0, height + verticalSpeed * FIXED_DT);
    if (altitude === 0) verticalSpeed = 0;
    this.world = { x, z, heading, speed: collision ? 0 : speed, altitude, verticalSpeed,
      pitch: (before.pitch ?? 0) + ((motor.pitchTarget ?? 0) - (before.pitch ?? 0)) * .25,
      roll: (before.roll ?? 0) + ((motor.rollTarget ?? 0) - (before.roll ?? 0)) * .25 };
    this.tick++;
    const frame = freezeRecord({ tick: this.tick, before, after: this.state, sensors, neural, decision: { state: choice.state, source: choice.source, reason: trigger ? "Finite engineered takeoff/recovery response to retained neural trigger; current available signal is recorded separately" : choice.reason, trigger: structuredClone(trigger), duration }, motor, stimulus: structuredClone(input.stimulus), collision });
    this.inputs.push(structuredClone(input)); this.trajectoryFrames.push(frame);
    if (!this.previous || this.tick % 10 === 0 || this.previous.decision.state !== frame.decision.state || this.previous.decision.source !== frame.decision.source || collision) this.samples.push(frame);
    this.previous = frame;
  }
  evidence(): AutonomyEvidence {
    return freezeRecord(structuredClone({ schemaVersion: AUTONOMY_VERSION, config: this.config, timestep: FIXED_DT,
      checkpoint: this.checkpoint, trajectory: this.trajectoryFrames, network: syntheticDemoNetwork, syntheticThreshold: .75, inputs: this.inputs, samples: this.samples, ticks: this.tick, droppedWallSeconds: this.dropped,
      disclosure: "Autonomous experimental behaviour; not real-fly validated. Synthetic network has no biological identities. Procedural motor execution; separate from approved experiment measurements. Exploration is continuous with checkpointed 60 s recording windows; controlled trials stop at 60 s. Takeoff/recovery is engineered, not wing/body biomechanics." }));
  }
}
export function replayAutonomy(evidence: AutonomyEvidence) {
  if (evidence.schemaVersion !== AUTONOMY_VERSION) throw new Error("Unsupported autonomy version");
  const engine = new AutonomyEngine(evidence.config, 0, evidence.checkpoint, evidence.droppedWallSeconds);
  for (const input of evidence.inputs) engine.step(input);
  return engine;
}
/** Moving environmental object, never a fly route. Matched runs share this schedule. */
export function scheduledStimulus(tick: number, start = 60): Stimulus | null {
  const t = (tick - start) * FIXED_DT;
  return t >= 0 && t < 2.5 ? { x: 0, z: -2.2 + t * .7, radius: .22, intensity: 1 } : null;
}
