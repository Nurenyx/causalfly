import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { WorkspaceNavigation } from "./workspace-navigation";
import { HomeOverview } from "./home-overview";
import { MetaStatus, FruitFlyStatus } from "./status-indicator";
import { DataSourcePanel } from "./data-source-panel";
import { LiveConnectomeProgress } from "./live-connectome-progress";
import { disconnectedFruitFly } from "../../lib/sources/contracts";
import { workspaceReducer } from "../../lib/web/dashboard";

const forbidden = () => assert.fail("Rendering must not navigate, connect or request inference");
test("Home orients users with exactly three workspace paths and explicit measurement ownership", () => {
  const html = render(<HomeOverview disabled={false} onOpen={forbidden} />);
  for (const label of ["Open Experiment", "Open Live Connectome", "Open Evidence", "Meta reasons. CausalFly measures.", "real-fly validation is not established"]) assert.ok(html.includes(label));
  assert.match(html, /Illustration · no live neural activity shown/);
});
test("one primary navigation has identical order, labels and only the selected destination current", () => {
  for (const active of ["observatory", "live", "evidence", undefined] as const) {
    const html = render(<WorkspaceNavigation active={active} disabled={false} onNavigate={forbidden} />);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, active ? 1 : 0);
    assert.ok(html.indexOf('aria-label="Experiment"') < html.indexOf('aria-label="Live Connectome"'));
    assert.ok(html.indexOf('aria-label="Live Connectome"') < html.indexOf('aria-label="Evidence"'));
    assert.doesNotMatch(html, />Home</);
  }
});
test("Live workflow uses local steps with completion independent of optional Meta", () => {
  const html = render(<LiveConnectomeProgress step="understand" questionRetained evidenceAvailable onStep={forbidden} />);
  assert.match(html, /Stage 01: QUESTION: COMPLETE/);
  assert.match(html, /Stage 03: UNDERSTAND" aria-current="step"/);
  assert.doesNotMatch(html, /Experiment|Evidence|scientist/);
});
test("Meta availability, explicit activity, offline fixtures and missing config have distinct truthful semantics", () => {
  const live = render(<MetaStatus mode="META LIVE" working={false} />);
  assert.match(live, /META LIVE status/); assert.match(live, /META AI AVAILABLE/);
  assert.match(live, /No Meta request occurs until you explicitly choose/);
  assert.doesNotMatch(live, /META WORKING/);
  assert.match(render(<MetaStatus mode="META LIVE" working />), /META WORKING status/);
  const fake = render(<MetaStatus mode="FAKE META CLIENT" working={false} />);
  assert.match(fake, /OFFLINE META MODE/); assert.match(fake, /No live Meta model requests/);
  assert.doesNotMatch(render(<MetaStatus mode="FAKE META CLIENT" working />), /META WORKING/);
  assert.match(render(<MetaStatus mode={null} working={false} />), /META CONFIGURATION NEEDED/);
  for (const html of [live, fake]) {
    assert.match(html, /aria-describedby=/); assert.match(html, /aria-expanded="false"/); assert.match(html, /role="tooltip"/); assert.match(html, /hidden=""/);
  }
});
test("XR status distinguishes source, connection and retained snapshot; connection action always belongs to its source card", () => {
  const snapshot = disconnectedFruitFly();
  const html = render(<FruitFlyStatus snapshot={snapshot} now={null} />);
  for (const label of ["LIVE CONNECTOME SIMULATION SOURCE", "Connection: ", "Disconnected", "Waiting", "Not recordings from a living fly"]) assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Reconnect simulation<\/button>/);
  for (const source of ["SYNTHETIC_FIXTURE", "FRUITFLY_XR"] as const) {
    const card = render(<DataSourcePanel source={source} snapshot={snapshot} disabled={false} onSelect={forbidden} onConnect={forbidden} onDisconnect={forbidden} />);
    assert.equal((card.match(/>Reconnect simulation<\/button>/g) ?? []).length, 1);
    const connected = render(<DataSourcePanel source={source} snapshot={{ ...snapshot, state: "CONNECTED" }} disabled={false} onSelect={forbidden} onConnect={forbidden} onDisconnect={forbidden} />);
    assert.equal((connected.match(/>Disconnect<\/button>/g) ?? []).length, 1);
  }
});
test("workspace navigation retains exact question and result objects", () => {
  const initial = { workspace: "observatory" as const, question: "Retain this question", result: null, fruitFlyAskedQuestion: "Retain observation" };
  let state = initial;
  for (const workspace of ["live", "evidence", "observatory"] as const) state = workspaceReducer(state, { type: "navigate", workspace }) as typeof initial;
  assert.equal(state.question, initial.question); assert.equal(state.fruitFlyAskedQuestion, initial.fruitFlyAskedQuestion); assert.equal(state.result, initial.result);
});

test("Observe is locked before a retained question and Understand requires active investigation evidence", () => {
  const initial = render(<LiveConnectomeProgress step="question" questionRetained={false} onStep={forbidden} />);
  assert.match(initial, /disabled=""[^>]*aria-label="Stage 02: OBSERVE"/);
  assert.match(initial, /disabled=""[^>]*aria-label="Stage 03: UNDERSTAND"/);
  assert.match(initial, /Set an investigation question first/);
  const question = render(<LiveConnectomeProgress step="observe" questionRetained evidenceAvailable={false} onStep={forbidden} />);
  assert.doesNotMatch(question, /disabled=""[^>]*aria-label="Stage 02: OBSERVE"/);
  assert.match(question, /disabled=""[^>]*aria-label="Stage 03: UNDERSTAND"/);
  const active = render(<LiveConnectomeProgress step="observe" questionRetained evidenceAvailable onStep={forbidden} />);
  assert.doesNotMatch(active, /disabled=""/);
});

test("brain service naming discloses simulated dynamics without launching the XR application", () => {
  const html = render(<DataSourcePanel source="FRUITFLY_XR" snapshot={disconnectedFruitFly()} disabled={false} onSelect={forbidden} onConnect={forbidden} onDisconnect={forbidden} />);
  assert.match(html, /LIVE CONNECTOME SIMULATION/); assert.match(html, /Connectome-backed brain server/);
  assert.match(html, /Source implementation: FruitFly XR Brain Server/); assert.match(html, /does not launch the FruitFly XR Quest application/);
  assert.match(html, /not recordings from a living fly/); assert.match(html, /value="FRUITFLY_XR"/);
});
