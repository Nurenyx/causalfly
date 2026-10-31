import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { InstrumentModeBar } from "./instrument-mode-bar";
import { FirstRunBanner } from "./first-run-banner";
import { QuestStatus, BrainServerStatus, ConnectomeStatus, MetaStatus } from "./status-indicator";
import { disconnectedFruitFly, type FruitFlySnapshot } from "../../lib/sources/contracts";
import { SCIENTIFIC_PROVENANCE } from "../../lib/sources/provenance-constants";
import { checkModeCapability } from "../../lib/web/instrument-mode";
import { AutonomyEngine } from "../../lib/web/autonomy";
import { AutonomyPanel } from "./autonomy-panel";

// ==========================================
// 1. Instrument Mode Navigation Regression Tests
// ==========================================
test("Synthetic Fixture: Observe -> Perturb keeps Perturb active as a real mode", () => {
  const cap = checkModeCapability("perturb", "SYNTHETIC_FIXTURE", false);
  assert.equal(cap.supported, true);

  const html = render(
    <InstrumentModeBar
      currentMode="perturb"
      source="SYNTHETIC_FIXTURE"
      hasResult={false}
      onSelectMode={() => {}}
      onSelectSource={() => {}}
    />
  );
  assert.match(html, /class="instrument-mode-tab perturb-tab active"/);
  assert.match(html, /aria-checked="true"/);
  assert.doesNotMatch(html, /mode-capability-banner/);
});

test("Live Connectome Simulation: Perturb is blocked with scientific explanation", () => {
  const cap = checkModeCapability("perturb", "FRUITFLY_XR", false);
  assert.equal(cap.supported, false);
  assert.match(cap.reason!, /Arbitrary neural perturbation is not supported for Live Connectome Simulation/);

  const html = render(
    <InstrumentModeBar
      currentMode="perturb"
      source="FRUITFLY_XR"
      hasResult={false}
      onSelectMode={() => {}}
      onSelectSource={() => {}}
    />
  );
  assert.match(html, /mode-capability-banner/);
  assert.match(html, /Arbitrary neural perturbation is not supported for Live Connectome Simulation/);
  assert.match(html, /Switch to Synthetic Fixture/);
});

test("Synthetic Fixture: Compare mode is supported", () => {
  const capWithResult = checkModeCapability("compare", "SYNTHETIC_FIXTURE", true);
  assert.equal(capWithResult.supported, true);

  const capWithoutResult = checkModeCapability("compare", "SYNTHETIC_FIXTURE", false);
  assert.equal(capWithoutResult.supported, true);
});

test("Live Connectome Simulation: Compare mode is blocked where unsupported", () => {
  const cap = checkModeCapability("compare", "FRUITFLY_XR", false);
  assert.equal(cap.supported, false);
  assert.match(cap.reason!, /Matched intervention comparison requires controlled perturbation trials/);
});

// ==========================================
// 2. Stimulus and Closed-Loop Trust Tests
// ==========================================
test("Stimulus presentation with no Brain endpoint does not fabricate neural decoder response or escape", () => {
  const engine = new AutonomyEngine({ source: "fruitfly", mode: "exploration" });
  // Advance engine with stimulus
  engine.advance(0.1, () => ({ x: 0, z: -1.5, radius: 0.22, intensity: 1 }));
  const frame = engine.frame;

  assert.ok(frame !== null);
  assert.equal(frame!.stimulus?.intensity, 1);
  assert.equal(frame!.neural.source, "NONE");
  assert.equal(frame!.neural.decoder, null);
  assert.equal(frame!.decision.source, "BASELINE_AUTONOMOUS_POLICY");
  assert.equal(frame!.motor.phase, "GROUNDED");
});

test("Stimulus presentation with valid Brain control endpoint only triggers procedural ESCAPE if eligible decoder ESCAPE arrives", () => {
  const engine = new AutonomyEngine({ source: "fruitfly", mode: "exploration" });
  // Accept non-escape neural drive
  engine.acceptBrain({
    source: "FRUITFLY_XR",
    activity: 0.2,
    decoder: null,
    reference: {
      sessionId: "11111111-1111-1111-1111-111111111111",
      sequence: 1,
      inputSequence: 1,
      receivedAt: new Date().toISOString(),
      transport: "brain/v1",
    },
  });
  engine.advance(0.05, () => ({ x: 0, z: -1.5, radius: 0.22, intensity: 1 }));
  assert.equal(engine.frame?.decision.source, "BASELINE_AUTONOMOUS_POLICY");
  assert.equal(engine.frame?.motor.phase, "GROUNDED");

  // Accept genuine ESCAPE neural drive
  engine.acceptBrain({
    source: "FRUITFLY_XR",
    activity: 0.9,
    decoder: "ESCAPE",
    reference: {
      sessionId: "11111111-1111-1111-1111-111111111111",
      sequence: 2,
      inputSequence: 2,
      receivedAt: new Date().toISOString(),
      transport: "brain/v1",
    },
  });
  engine.advance(0.05, () => ({ x: 0, z: -1.5, radius: 0.22, intensity: 1 }));
  assert.equal(engine.frame?.motor.phase, "TAKEOFF_ESCAPE");
  assert.equal(engine.frame?.motor.execution, "CAUSALFLY_PROCEDURAL_CONTROLLER");
  assert.equal(engine.frame?.motor.trigger?.source, "FRUITFLY_XR");
});

test("AutonomyPanel qualifies Present Stimulus button and displays warning when Brain control is not connected", () => {
  const snapshot: FruitFlySnapshot = {
    source: "FRUITFLY_XR",
    state: "CONNECTED",
    message: "Observatory connected",
    evidence: null,
  };
  const html = render(<AutonomyPanel snapshot={snapshot} />);
  assert.match(html, /Present stimulus \(visual only · no Brain control\)/);
  assert.match(html, /Closed-loop Brain control is not connected/);
});

// ==========================================
// 3. Brain Server 5-State & Channel Separation Tests
// ==========================================
function makeSnapshot(state: FruitFlySnapshot["state"], receivedAt?: number): FruitFlySnapshot {
  return {
    source: "FRUITFLY_XR",
    state,
    message: state === "CONNECTED" ? "Connected waiting" : "Receiving telemetry",
    evidence: receivedAt !== undefined ? {
      source: "FRUITFLY_XR",
      receivedAt: new Date(receivedAt).toISOString(),
      provenance: {
        structuralSource: "Published male Drosophila CNS connectome: male-cns:v1.0",
        dataset: "male-cns:v1.0",
        connectomeSha256: "fixture",
        neurons: 176422,
        edges: 6287749,
        dynamics: "SIMULATED",
        generator: "FruitFly XR brain server",
        experimentalRecording: false,
        transport: "observatory/v1",
      },
      telemetry: {
        sessionId: "test-session",
        sequence: 1,
        neuralTick: 10,
        simulationMs: 50,
        totalSpikeEvents: 20,
        activeNeuronCount: 5,
        displaySpikeEvents: 20,
        displayTruncated: false,
        droppedDisplayFrames: 0,
        droppedSubscriberMessages: 0,
        spikeDisplaySemantics: "EXACT_SPIKES_FIRST_N_FILTERED",
        edgeDisplaySemantics: "CONNECTED_ACTIVE_SUBGRAPH_NON_CAUSAL",
        spikeEvents: [],
        decodedMotor: [],
        inputSequence: 0,
        inputFresh: true,
        motorMode: "EXPLORE",
      },
    } : null,
  };
}

test("BrainServerStatus accurately reflects the 5 operational states", () => {
  const baseTime = 1_000_000;

  // State 1: Disconnected
  const disconnected = disconnectedFruitFly();
  const htmlState1 = render(<BrainServerStatus snapshot={disconnected} now={null} controlAvailable={false} />);
  assert.match(htmlState1, /Brain · Disconnected/);
  assert.match(htmlState1, /• Read-only observatory telemetry: Disconnected/);

  // State 2: Observatory connected, waiting for first frame (no frames received yet)
  const connectedWaiting = makeSnapshot("CONNECTED");
  const htmlState2 = render(<BrainServerStatus snapshot={connectedWaiting} now={baseTime} controlAvailable={false} controlStatus="Configured / standby" />);
  assert.match(htmlState2, /Brain · Telemetry Standby/);
  assert.doesNotMatch(htmlState2, /Telemetry Live/);
  assert.match(htmlState2, /• Read-only observatory telemetry: Connected \/ waiting for first frame/);
  assert.match(htmlState2, /• Closed-loop sensory\/control: Configured \/ standby/);

  // State 3: Retained/last snapshot, no current frames (stale: age > 5000ms)
  const staleSnapshot = makeSnapshot("DATA RECEIVED", baseTime - 10_000);
  const htmlState3 = render(<BrainServerStatus snapshot={staleSnapshot} now={baseTime} controlAvailable={false} />);
  assert.match(htmlState3, /Brain · Telemetry Standby/);
  assert.doesNotMatch(htmlState3, /Telemetry Live/);
  assert.match(htmlState3, /• Read-only observatory telemetry: Last snapshot \/ stale/);

  // State 4: Fresh/current observatory frames (received 500ms ago)
  const freshSnapshot = makeSnapshot("DATA RECEIVED", baseTime - 500);
  const htmlState4 = render(<BrainServerStatus snapshot={freshSnapshot} now={baseTime} controlAvailable={false} />);
  assert.match(htmlState4, /Brain · Telemetry Live/);
  assert.match(htmlState4, /• Read-only observatory telemetry: Current \/ fresh \(streaming\)/);

  // State 5: Fresh telemetry + active closed-loop control
  const htmlState5 = render(<BrainServerStatus snapshot={freshSnapshot} now={baseTime} controlAvailable={true} />);
  assert.match(htmlState5, /Brain · Telemetry \+ Control/);
  assert.match(htmlState5, /• Closed-loop sensory\/control: Connected \/ active/);
});

// ==========================================
// 4. Meta Status Semantics Tests
// ==========================================
test("MetaStatus semantics accurately describe live mode enabled without claiming continuous verification", () => {
  const live = render(<MetaStatus mode="META LIVE" working={false} />);
  assert.match(live, /Meta · Live mode/);
  assert.match(live, /META AI/);
  assert.match(live, /No live provider ping or health check is performed in the background/);
  assert.match(live, /No Meta request occurs until you explicitly choose a Meta AI action/);
  assert.match(live, /Availability\/configuration indicator · no continuous inference/);

  const fake = render(<MetaStatus mode="FAKE META CLIENT" working={false} />);
  assert.match(fake, /Meta · Offline Fixture/);
  assert.match(fake, /No live Meta model requests/);

  const working = render(<MetaStatus mode="META LIVE" working={true} />);
  assert.match(working, /Meta · Working/);

  const authError = render(
    <MetaStatus
      mode="META LIVE"
      working={false}
      error="Meta Model API authentication failed. Check the server configuration."
    />
  );
  assert.match(authError, /Meta · Auth error/);
  assert.match(authError, /authentication failed/);
  assert.doesNotMatch(authError, /Meta · Live mode/);
});

// ==========================================
// 5. Connectome and Quest Truthfulness Tests
// ==========================================
test("QuestStatus is truthful and never shows connected", () => {
  const html = render(<QuestStatus />);
  assert.match(html, /Quest 3 — Not connected/);
  assert.match(html, /Quest 3 streaming is not configured or connected/);
  assert.doesNotMatch(html, />Connected</);
});

test("ConnectomeStatus renders concise male-cns:v1.0 identity and separates published vs internal counts", () => {
  const snapshot = disconnectedFruitFly();
  const html = render(<ConnectomeStatus source="SYNTHETIC_FIXTURE" snapshot={snapshot} />);
  assert.match(html, /Connectome: male-cns:v1.0/);
  assert.match(html, /Berg et al\. \(2026\)/);
  assert.match(html, new RegExp(SCIENTIFIC_PROVENANCE.primaryCounts.publishedCnsNeurons.toLocaleString()));
  assert.match(html, new RegExp(SCIENTIFIC_PROVENANCE.internalCounts.loadedStructuralGraphNodes.toLocaleString()));
  assert.match(html, new RegExp(SCIENTIFIC_PROVENANCE.internalCounts.mappedSomaCoordinates.toLocaleString()));
  assert.match(html, /Female anatomical visual mesh; male CNS neural simulation/);
});

test("FirstRunBanner renders concise orientation without blocking", () => {
  const html = render(<FirstRunBanner />);
  assert.ok(html === "" || html.includes("CausalFly Scientific Instrument"));
});
