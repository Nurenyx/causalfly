import assert from "node:assert/strict";
import Module from "node:module";
import test from "node:test";
import { renderToStaticMarkup as render } from "react-dom/server";
import { disconnectedFruitFly, type FruitFlyEvidence } from "@/lib/sources/contracts";
import { LIVE_FRAME_LIMIT, sessionTimeline } from "@/lib/sources/live-session";
import { validatedRecording } from "@/lib/sources/validated-recording";
import type { TimelineLaneView } from "./live-session";

(Module as unknown as { _extensions: Record<string, (mod: { exports: unknown }) => void> })._extensions[".css"] = mod => {
  mod.exports = {
    timeline: "timeline",
    eventTick: "eventTick",
    eventCategory: "eventCategory",
    eventMarker: "eventMarker",
    eventBaseline: "eventBaseline",
    changed: "changed",
    reconnected: "reconnected",
    staleEvent: "staleEvent",
    recentHistory: "recentHistory",
    historyList: "historyList",
    historyItem: "historyItem",
  };
};

const baseRecordingFrame = validatedRecording()[0];
function makeFrame(overrides: {
  sequence: number;
  neuralTick: number;
  simulationMs: number;
  motorMode?: "IDLE" | "WALK" | "ESCAPE" | "TURN_LEFT" | "TURN_RIGHT" | "TAKEOFF";
  inputSequence?: number;
  receivedAt?: string;
  sessionId?: string;
}): FruitFlyEvidence {
  const frame = structuredClone(baseRecordingFrame);
  return {
    ...frame,
    receivedAt: overrides.receivedAt ?? "2026-03-29T21:07:10.000Z",
    telemetry: {
      ...frame.telemetry,
      sessionId: overrides.sessionId ?? "sprint172-semantic-lanes",
      sequence: overrides.sequence,
      neuralTick: overrides.neuralTick,
      simulationMs: overrides.simulationMs,
      totalSpikeEvents: 620,
      displaySpikeEvents: 512,
      displayTruncated: true,
      activeNeuronCount: 7239,
      motorMode: overrides.motorMode ?? "IDLE",
      inputSequence: overrides.inputSequence ?? 1,
      inputFresh: true,
      droppedDisplayFrames: 0,
      droppedSubscriberMessages: 0,
      spikeEvents: [],
    },
  };
}

const laneSnapshot = (lane: TimelineLaneView) => `${lane.category}|${lane.title}|${lane.value}|${lane.time}|${lane.empty}`;

test("a simultaneous input and decoder transition preserves both facts and the latest received frame", async () => {
  const { createTimelineLaneAccumulator, semanticTimelineLanes } = await import("./live-session");
  const acc = createTimelineLaneAccumulator();
  const frames = [makeFrame({ sequence: 1, neuralTick: 10, simulationMs: 500 })];
  semanticTimelineLanes(frames, { historical: false, reconnectedAt: null }, acc);
  frames.push(makeFrame({ sequence: 2, neuralTick: 11, simulationMs: 550, inputSequence: 2, motorMode: "WALK" }));
  const lanes = semanticTimelineLanes(frames, { historical: false, reconnectedAt: null }, acc);
  assert.equal(lanes[0].value, "Tick 11");
  assert.equal(lanes[1].value, "Tick 11");
  assert.equal(lanes[2].detail, "Input sequence 2");
  assert.equal(lanes[3].value, "IDLE → WALK");
  // A pure receipt (no progression or transitions) changes FRAME alone.
  const previous = lanes.map(laneSnapshot);
  frames.push(makeFrame({ sequence: 3, neuralTick: 11, simulationMs: 600, inputSequence: 2, motorMode: "WALK" }));
  const receipt = semanticTimelineLanes(frames, { historical: false, reconnectedAt: null }, acc);
  assert.deepEqual(receipt.map((lane, i) => laneSnapshot(lane) !== previous[i] ? i : -1).filter(i => i >= 0), [0]);
});

test("independent renders with the same session ID never inherit another timeline's expired events", async () => {
  const { EventTimeline } = await import("./live-session");
  const frames = Array.from({ length: LIVE_FRAME_LIMIT + 1 }, (_, i) => makeFrame({
    sequence: i + 1, neuralTick: i + 1, simulationMs: (i + 1) * 50,
    motorMode: i === 0 ? "IDLE" : "WALK",
  }));
  assert.match(render(<EventTimeline frames={frames.slice(0, LIVE_FRAME_LIMIT)} historical={false} reconnectedAt={null} />), /IDLE → WALK/);
  // Same-sized, overlapping windows defeated the old shared-cache reset check.
  // The second instance has never received the IDLE frame establishing this transition.
  const independent = render(<EventTimeline frames={frames.slice(1)} historical={false} reconnectedAt={null} />);
  assert.doesNotMatch(independent, /IDLE → WALK/);
  assert.match(independent, /data-lane="decoder"[^>]*data-empty="true"/);
});

test("five fixed semantic lanes stay in permanent order and show placeholders before events arrive", async () => {
  const { createTimelineLaneAccumulator, semanticTimelineLanes } = await import("./live-session");
  const acc = createTimelineLaneAccumulator();
  const emptyLanes = semanticTimelineLanes([], { historical: false, reconnectedAt: null }, acc);
  assert.deepEqual(
    emptyLanes.map(l => l.category),
    ["FRAME", "NEURAL", "INPUT", "DECODER", "STREAM"],
  );
  assert.deepEqual(
    emptyLanes.map(l => l.id),
    ["frame", "neural", "input", "decoder", "stream"],
  );
  for (const lane of emptyLanes) {
    assert.equal(lane.empty, true);
    assert.equal(lane.title, "—");
    assert.equal(lane.value, "—");
    assert.equal(lane.time, "—");
  }
});

test("telemetry events update their own semantic lanes without reordering or hiding simultaneous transitions", async () => {
  const { createTimelineLaneAccumulator, EventTimeline, semanticTimelineLanes } = await import("./live-session");
  const acc = createTimelineLaneAccumulator();
  const frames: FruitFlyEvidence[] = [];
  let historical = false;
  let reconnectedAt: number | null = null;
  let receivedAt = "2026-03-29T21:07:10.000Z";

  const step1Frame = makeFrame({
    sequence: 1,
    neuralTick: 284,
    simulationMs: 14200,
    motorMode: "IDLE",
    inputSequence: 1,
    receivedAt,
  });
  frames.push(step1Frame);

  // Step 1: Frame received
  let previous = semanticTimelineLanes(frames, { historical, receivedAt, reconnectedAt }, acc);
  assert.deepEqual(previous.map(l => l.category), ["FRAME", "NEURAL", "INPUT", "DECODER", "STREAM"]);
  assert.equal(previous[0].title, "Frame received");
  assert.equal(previous[0].value, "Tick 284");
  assert.equal(previous[0].time, "14,200 model ms");
  assert.equal(previous[1].title, "—");
  assert.equal(previous[2].title, "—");
  assert.equal(previous[3].title, "—");
  assert.equal(previous[4].title, "Stream live");
  assert.equal(previous[4].time, "Active since 21:07:10 UTC");

  const steps: {
    name: string;
    expectedLaneIndex: number;
    changedLanes: number[];
    expectedTitle: string;
    expectedValue: string;
    expectedTime: string;
    apply: () => void;
  }[] = [
    {
      name: "Neural tick",
      expectedLaneIndex: 1,
      changedLanes: [0, 1],
      expectedTitle: "Neural tick",
      expectedValue: "Tick 285",
      expectedTime: "14,250 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:11.000Z";
        frames.push(makeFrame({ sequence: 2, neuralTick: 285, simulationMs: 14250, motorMode: "IDLE", inputSequence: 1, receivedAt }));
      },
    },
    {
      name: "Input reference changed",
      expectedLaneIndex: 2,
      changedLanes: [0, 1, 2],
      expectedTitle: "Input reference changed",
      expectedValue: "Tick 286",
      expectedTime: "14,300 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:12.000Z";
        frames.push(makeFrame({ sequence: 3, neuralTick: 286, simulationMs: 14300, motorMode: "IDLE", inputSequence: 2, receivedAt }));
      },
    },
    {
      name: "Decoder changed",
      expectedLaneIndex: 3,
      changedLanes: [0, 1, 3],
      expectedTitle: "Decoder changed",
      expectedValue: "IDLE → ESCAPE",
      expectedTime: "Tick 287",
      apply: () => {
        receivedAt = "2026-03-29T21:07:13.000Z";
        frames.push(makeFrame({ sequence: 4, neuralTick: 287, simulationMs: 14350, motorMode: "ESCAPE", inputSequence: 2, receivedAt }));
      },
    },
    {
      name: "Input reference changed (second)",
      expectedLaneIndex: 2,
      changedLanes: [0, 1, 2],
      expectedTitle: "Input reference changed",
      expectedValue: "Tick 288",
      expectedTime: "14,400 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:14.000Z";
        frames.push(makeFrame({ sequence: 5, neuralTick: 288, simulationMs: 14400, motorMode: "ESCAPE", inputSequence: 3, receivedAt }));
      },
    },
    {
      name: "Neural tick (second)",
      expectedLaneIndex: 1,
      changedLanes: [0, 1],
      expectedTitle: "Neural tick",
      expectedValue: "Tick 289",
      expectedTime: "14,450 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:15.000Z";
        frames.push(makeFrame({ sequence: 6, neuralTick: 289, simulationMs: 14450, motorMode: "ESCAPE", inputSequence: 3, receivedAt }));
      },
    },
    {
      name: "Stream reconnected",
      expectedLaneIndex: 4,
      changedLanes: [4],
      expectedTitle: "Stream reconnected",
      expectedValue: "Transport restored",
      expectedTime: "Reconnected at 21:07:20 UTC",
      apply: () => {
        reconnectedAt = Date.parse("2026-03-29T21:07:20.000Z");
      },
    },
    {
      name: "Frame received (post-reconnect)",
      expectedLaneIndex: 0,
      changedLanes: [0, 1],
      expectedTitle: "Frame received",
      expectedValue: "Tick 290",
      expectedTime: "14,500 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:21.000Z";
        frames.push(makeFrame({ sequence: 7, neuralTick: 290, simulationMs: 14500, motorMode: "ESCAPE", inputSequence: 3, receivedAt }));
      },
    },
    {
      name: "Input reference changed (third)",
      expectedLaneIndex: 2,
      changedLanes: [0, 1, 2],
      expectedTitle: "Input reference changed",
      expectedValue: "Tick 291",
      expectedTime: "14,550 model ms",
      apply: () => {
        receivedAt = "2026-03-29T21:07:22.000Z";
        frames.push(makeFrame({ sequence: 8, neuralTick: 291, simulationMs: 14550, motorMode: "ESCAPE", inputSequence: 4, receivedAt }));
      },
    },
    {
      name: "Stream inactive",
      expectedLaneIndex: 4,
      changedLanes: [4],
      expectedTitle: "Stream inactive",
      expectedValue: "Snapshot retained",
      expectedTime: "Last received 21:07:22 UTC",
      apply: () => {
        historical = true;
      },
    },
  ];

  for (const step of steps) {
    step.apply();
    const current = semanticTimelineLanes(frames, { historical, receivedAt, reconnectedAt }, acc);
    assert.deepEqual(
      current.map(l => l.category),
      ["FRAME", "NEURAL", "INPUT", "DECODER", "STREAM"],
      `${step.name}: lane order must remain permanently fixed`,
    );
    const changedIndices = current
      .map((lane, index) => (laneSnapshot(lane) !== laneSnapshot(previous[index]) ? index : -1))
      .filter(index => index >= 0);
    assert.deepEqual(
      changedIndices,
      step.changedLanes,
      `${step.name}: only categories with observed events may update`,
    );
    const updated = current[step.expectedLaneIndex];
    assert.equal(updated.title, step.expectedTitle, `${step.name}: title mismatch`);
    assert.equal(updated.value, step.expectedValue, `${step.name}: value mismatch`);
    assert.equal(updated.time, step.expectedTime, `${step.name}: time mismatch`);
    previous = current;
  }

  // Canonical chronological history via sessionTimeline remains intact (rolling 6-event window)
  const canonical = sessionTimeline(frames);
  assert.equal(frames.length, 8);
  assert.equal(canonical.length, 6);
  assert.deepEqual(
    canonical.map(e => e.tick),
    [286, 287, 288, 289, 290, 291],
  );

  // Rendered HTML exposes both the 5 fixed semantic lanes and the collapsed "Recent event history"
  const html = render(<EventTimeline frames={frames} historical={historical} receivedAt={receivedAt} reconnectedAt={reconnectedAt} />);
  assert.match(html, /data-lane="frame".*data-lane="neural".*data-lane="input".*data-lane="decoder".*data-lane="stream"/);
  assert.match(html, /<summary>Recent event history<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*open[^>]*data-timeline-history/);
});

test("sliding past the 120-frame display buffer retains earlier semantic lane values without resetting FRAME", async () => {
  const { createTimelineLaneAccumulator, semanticTimelineLanes } = await import("./live-session");
  const acc = createTimelineLaneAccumulator();
  let frames: FruitFlyEvidence[] = [];
  for (let i = 1; i <= LIVE_FRAME_LIMIT + 10; i++) {
    frames = [
      ...frames,
      makeFrame({
        sequence: i,
        neuralTick: 1000 + i,
        simulationMs: i * 50,
        motorMode: i === 2 ? "WALK" : i > 2 ? "WALK" : "IDLE",
        inputSequence: i === 3 ? 2 : i > 3 ? 2 : 1,
        receivedAt: "2026-03-29T21:08:00.000Z",
      }),
    ].slice(-LIVE_FRAME_LIMIT);
    const lanes = semanticTimelineLanes(frames, { historical: false, reconnectedAt: null }, acc);
    assert.equal(lanes[0].title, "Frame received");
      assert.equal(lanes[0].value, `Tick ${(1000 + i).toLocaleString("en-US")}`);
    if (i >= 2) {
      assert.equal(lanes[3].title, "Decoder changed");
      assert.equal(lanes[3].value, "IDLE → WALK");
    }
    if (i >= 3) {
      assert.equal(lanes[2].title, "Input reference changed");
      assert.equal(lanes[2].value, "Tick 1,003");
    }
  }
});

test("LiveSessionWorkspace mounts all five semantic lanes with fixed placeholders on cold start before telemetry begins and keeps them mounted across connection, telemetry, and disconnect", async () => {
  const { LiveSessionWorkspace } = await import("./live-session");
  const noop = () => {};
  const coldSnapshot = disconnectedFruitFly();
  const coldHtml = render(
    <LiveSessionWorkspace
      embodimentChoice={false}
      snapshot={coldSnapshot}
      frames={[]}
      now={Date.parse("2026-03-29T21:07:00.000Z")}
      onEvidence={noop}
      onConnect={noop}
      onDisconnect={noop}
    />,
  );
  assert.match(coldHtml, /Waiting for first frame/);
  assert.match(coldHtml, /data-timeline-track/);
  assert.match(coldHtml, /data-lane="frame".*data-lane="neural".*data-lane="input".*data-lane="decoder".*data-lane="stream"/);
  assert.equal((coldHtml.match(/<li[^>]*data-lane="/g) ?? []).length, 5);
  assert.equal((coldHtml.match(/<li[^>]*data-lane="[^"]+"[^>]*data-empty="true"/g) ?? []).length, 5);

  const connectedWaitingHtml = render(
    <LiveSessionWorkspace
      embodimentChoice={false}
      snapshot={{ ...coldSnapshot, state: "CONNECTED", message: "Connected waiting for telemetry" }}
      frames={[]}
      now={Date.parse("2026-03-29T21:07:05.000Z")}
      onEvidence={noop}
      onConnect={noop}
      onDisconnect={noop}
    />,
  );
  assert.equal((connectedWaitingHtml.match(/<li[^>]*data-lane="[^"]+"[^>]*data-empty="true"/g) ?? []).length, 5);

  const f1 = makeFrame({ sequence: 1, neuralTick: 284, simulationMs: 14200, receivedAt: "2026-03-29T21:07:10.000Z" });
  const liveHtml = render(
    <LiveSessionWorkspace
      embodimentChoice={false}
      snapshot={{ source: "FRUITFLY_XR", state: "DATA RECEIVED", message: "Live telemetry", evidence: f1 }}
      frames={[f1]}
      now={Date.parse("2026-03-29T21:07:10.200Z")}
      onEvidence={noop}
      onConnect={noop}
      onDisconnect={noop}
    />,
  );
  assert.match(liveHtml, /Frame received/);
  assert.match(liveHtml, /Stream live/);

  const disconnectedHtml = render(
    <LiveSessionWorkspace
      embodimentChoice={false}
      snapshot={{ source: "FRUITFLY_XR", state: "DISCONNECTED", message: "Disconnected", evidence: f1 }}
      frames={[f1]}
      now={Date.parse("2026-03-29T21:07:16.000Z")}
      onEvidence={noop}
      onConnect={noop}
      onDisconnect={noop}
    />,
  );
  assert.match(disconnectedHtml, /Stream inactive/);
  assert.match(disconnectedHtml, /Snapshot retained/);
});
