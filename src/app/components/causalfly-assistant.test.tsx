import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CausalFlyAssistant } from "./causalfly-assistant";
import { disconnectedFruitFly } from "../../lib/sources/contracts";
import { workspaceLabels } from "../../lib/web/assistant";
import type { Workspace } from "../../lib/web/dashboard";

const noop = () => {};
test("launcher and accessible closed drawer exist across both sources and all five primary workspaces", () => {
  for (const source of ["FRUITFLY_XR", "SYNTHETIC_FIXTURE"] as const) for (const workspace of Object.keys(workspaceLabels) as Workspace[]) {
    const html = renderToStaticMarkup(<CausalFlyAssistant source={source} workspace={workspace} snapshot={disconnectedFruitFly()} frames={[]} now={null} result={null} mode="FAKE META CLIENT" meta={{ pending: false }} busy={false} onAnalyze={async () => { throw new Error("Rendering must never call Meta"); }} onNavigate={noop} onSynthetic={noop} onDesign={noop} onFullAnalysis={noop} />);
    assert.match(html, /aria-label="Ask CausalFly"/);
    assert.match(html, /aria-expanded="false"/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /<dialog[^>]*aria-labelledby="assistant-title"/);
    assert.doesNotMatch(html, /<dialog[^>]* open/);
    assert.match(html, /aria-label="Close CausalFly Assistant"/);
    assert.ok(html.includes(`<dd>${workspaceLabels[workspace]}</dd>`));
    assert.ok(html.includes(`<dd>${source === "FRUITFLY_XR" ? "LIVE CONNECTOME SIMULATION" : "Synthetic Fixture"}</dd>`));
    assert.match(html, source === "FRUITFLY_XR" ? /0 retained frames/ : /No experiment retained/);
    assert.match(html, /Offline \/ fake client/);
    assert.match(html, /Submitting never calls Meta/);
    if (source === "FRUITFLY_XR" && workspace === "compare") assert.match(html, /Controlled comparison requires matched trials/);
    if (source === "FRUITFLY_XR") assert.doesNotMatch(html, /primary_a|THRESHOLD_REACHED/);
  }
});

test("the retained investigation question reaches the assistant without starting local or Meta analysis", () => {
  const question = "  What changed before ESCAPE?\nKeep exact.  ";
  const html = renderToStaticMarkup(<CausalFlyAssistant investigationQuestion={question} source="FRUITFLY_XR" workspace="live" snapshot={disconnectedFruitFly()} frames={[]} now={null} result={null} mode="FAKE META CLIENT" meta={{ pending: false }} busy={false} onAnalyze={async () => assert.fail("Setting context must not call Meta")} onNavigate={noop} onSynthetic={noop} onDesign={noop} onFullAnalysis={noop} />);
  assert.ok(html.includes(question));
  assert.match(html, /INVESTIGATION QUESTION/);
  assert.match(html, /Ask about my investigation question/);
  assert.doesNotMatch(html, /QUESTION \/ FROZEN AT SUBMISSION/);
});
