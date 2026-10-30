import test from "node:test";
import assert from "node:assert/strict";
import { PerceptionRequestGate } from "./perception-request";
test("request gate blocks synchronous duplicate clicks until explicit completion", () => {
  const gate = new PerceptionRequestGate(); const first = gate.begin()!;
  assert.equal(gate.begin(), undefined); assert.equal(gate.finish(first), true);
  assert.equal(typeof gate.begin(), "number");
});
test("new file or unmount invalidates late responses and cannot unlock a newer request", () => {
  const gate = new PerceptionRequestGate(); const first = gate.begin()!;
  gate.invalidate(); const second = gate.begin()!;
  assert.equal(gate.current(first), false); assert.equal(gate.finish(first), false);
  assert.equal(gate.current(second), true); assert.equal(gate.finish(second), true);
});
