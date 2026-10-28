import type { Anatomy } from "./anatomy";
import type { FruitFlyEvidence } from "./contracts";

type XYZ = readonly [number, number, number];
export const ACTIVITY_FRAME_COUNT = 4;
export const ACTIVITY_EMPHASIS = [1, 0.48, 0.24, 0.12] as const;

/** Display coordinates only. Uniform scaling and a rigid 180° X rotation.
 * No physical units or anatomical orientation are established by this transform. */
export function anatomyRenderTransform(anatomy: Anatomy) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of anatomy.points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point[axis + 1]);
    max[axis] = Math.max(max[axis], point[axis + 1]);
  }
  const center = min.map((value, axis) => (value + max[axis]) / 2);
  const scale = 2 / Math.max(1, ...max.map((value, axis) => value - min[axis]));
  const apply = ([x, y, z]: XYZ): XYZ => [
    (x - center[0]) * scale, -(y - center[1]) * scale, -(z - center[2]) * scale,
  ];
  return { min, max, center, scale, apply };
}

/** Allocated once per validated anatomy asset, never once per telemetry tick. */
export function buildConnectomeStructure(anatomy: Anatomy) {
  const transform = anatomyRenderTransform(anatomy);
  const positions = new Float32Array(anatomy.count * 3);
  const lookup = new Map<number, number>();
  anatomy.points.forEach(([id, x, y, z], index) => {
    positions.set(transform.apply([x, y, z]), index * 3);
    lookup.set(id, index);
  });
  return { transform, positions, lookup, count: anatomy.count };
}
export type ConnectomeStructure = ReturnType<typeof buildConnectomeStructure>;
type ActivityFrame = { telemetry: Pick<FruitFlyEvidence["telemetry"], "sessionId" | "sequence" | "neuralTick" | "spikeEvents"> };
export interface ActivityPoint {
  id: number;
  index: number;
  sequence: number;
  tick: number;
  age: number;
  emphasis: number;
}

/** Recency means RECEIVED frames, not elapsed time or interpolated model ticks.
 * Current wins over recent; a repeated ID gets only its newest received location.
 * With unchanged frames this output is identical, including after staleness. */
export function classifyConnectomeActivity(structure: ConnectomeStructure, frames: readonly ActivityFrame[]) {
  const latest = frames.at(-1)?.telemetry;
  const retained = frames.filter(f => f.telemetry.sessionId === latest?.sessionId).slice(-ACTIVITY_FRAME_COUNT);
  const current: ActivityPoint[] = [], recent: ActivityPoint[] = [];
  const seen = new Set<number>();
  let mapped = 0, unmapped = 0;
  for (let age = 0; age < retained.length; age++) {
    const t = retained[retained.length - 1 - age].telemetry;
    for (const { neuronId: id } of t.spikeEvents) {
      if (seen.has(id)) continue;
      seen.add(id);
      const index = structure.lookup.get(id);
      if (age === 0) { if (index === undefined) unmapped++; else mapped++; }
      if (index === undefined) continue;
      const point = { id, index, sequence: t.sequence, tick: t.neuralTick, age, emphasis: ACTIVITY_EMPHASIS[age] };
      (age === 0 ? current : recent).push(point);
    }
  }
  return { current, recent, mapped, unmapped, receivedFrames: retained.length };
}
export type ConnectomeActivity = ReturnType<typeof classifyConnectomeActivity>;
