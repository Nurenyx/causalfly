import { freezeRecord } from "../experiment/engine";
import type { AutonomyFrame } from "./autonomy";

/** Plays exact retained poses/decisions. This module never constructs or advances an engine. */
export class AutonomyTrajectoryReplay {
  readonly trajectories: readonly (readonly AutonomyFrame[])[];
  private elapsed = 0;
  cursor = 0;
  playing = false;
  constructor(trajectories: readonly (readonly AutonomyFrame[])[]) {
    this.trajectories = freezeRecord(structuredClone(trajectories));
  }
  get length() { return this.trajectories[0]?.length ?? 0; }
  get available() { return this.length >= 2; }
  get frames() { return this.trajectories.map(frames => frames[Math.min(this.cursor, frames.length - 1)] ?? null); }
  restart() { this.cursor = 0; this.elapsed = 0; this.playing = false; }
  advance(seconds: number) {
    if (!this.playing || !this.available || !Number.isFinite(seconds) || seconds <= 0) return;
    this.elapsed += Math.min(.25, seconds);
    while (this.elapsed + 1e-9 >= .05 && this.cursor < this.length - 1) { this.elapsed -= .05; this.cursor++; }
    if (this.cursor >= this.length - 1) this.playing = false;
  }
}
