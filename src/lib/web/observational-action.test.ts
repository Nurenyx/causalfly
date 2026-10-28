import assert from "node:assert/strict";
import test from "node:test";
import { createObservationalAction } from "./observational-action";
import { workspaceReducer } from "./dashboard";
import { disconnectedFruitFly, type FruitFlyEvidence } from "../sources/contracts";
import { emptyLiveSession, receiveSnapshot } from "../sources/live-session";
import type { ObservationalMetaState } from "./observational-contracts";

test("question submission and navigation perform zero requests; explicit action is one POST with double-click protection", async () => {
  let calls = 0;
  let release!: () => void;
  const states: ObservationalMetaState[] = [];
  const request: typeof fetch = async (_url, init) => {
    calls++;
    assert.deepEqual(JSON.parse(String(init?.body)), { researchQuestion: " Exact? ", retentionId: "reference", sessionId: "session", sequences: [3] });
    await new Promise<void>(r => { release = r; });
    return Response.json({ ok: false, kind: "provider", error: "raw server error must not render" }, { status: 502 });
  };
  const analyze = createObservationalAction(s => states.push(s), request);
  let state = workspaceReducer({ workspace: "observatory", question: "synthetic", result: null }, { type: "fruitfly-ask", question: " Exact? ", hasEvidence: true });
  state = workspaceReducer(state, { type: "navigate", workspace: "evidence" });
  assert.equal(state.fruitFlyAskedQuestion, " Exact? ");
  assert.equal(calls, 0);
  const frame = { telemetry: { sessionId: "session", sequence: 3, neuralTick: 3, simulationMs: 150, totalSpikeEvents: 0, activeNeuronCount: 0, displaySpikeEvents: 0, inputSequence: -1 } } as FruitFlyEvidence;
  const snapshot = { ...disconnectedFruitFly(), retentionId: "reference", evidence: frame };
  const first = analyze(state.fruitFlyAskedQuestion!, snapshot, [frame]);
  await analyze(state.fruitFlyAskedQuestion!, snapshot, [frame]);
  assert.equal(calls, 1);
  release(); await first;
  assert.equal(states.at(-1)?.pending, false);
  assert.doesNotMatch(states.at(-1)!.error!, /raw server/);
  const retry = analyze(state.fruitFlyAskedQuestion!, snapshot, [frame]);
  release(); await retry;
  assert.equal(calls, 2);
});

test("source disconnect/switch retains reference, frames and evidence without requesting Meta", () => {
  const frame = { telemetry: { sessionId: "session", sequence: 3 } } as FruitFlyEvidence;
  const received = receiveSnapshot(emptyLiveSession(), { ...disconnectedFruitFly(), retentionId: "reference", evidence: frame });
  const disconnected = receiveSnapshot(received, disconnectedFruitFly());
  assert.equal(disconnected.snapshot.retentionId, "reference");
  assert.equal(disconnected.snapshot.evidence, frame);
  assert.equal(disconnected.frames, received.frames);
});
