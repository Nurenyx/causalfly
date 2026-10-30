/** Synchronous duplicate lock and generation gate for late async responses. */
export class PerceptionRequestGate {
  private generation = 0;
  private pending = false;
  get busy(): boolean { return this.pending; }
  begin(): number | undefined {
    if (this.pending) return;
    this.pending = true;
    return ++this.generation;
  }
  current(generation: number): boolean { return generation === this.generation && this.pending; }
  finish(generation: number): boolean {
    if (!this.current(generation)) return false;
    this.pending = false; return true;
  }
  invalidate() { this.generation++; this.pending = false; }
}
