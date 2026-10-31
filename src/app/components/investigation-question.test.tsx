import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestigationQuestion } from "./investigation-question";
import { WorkflowProgress } from "./guided-workflow";
import { FruitFlyEvidenceView } from "./fruitfly-evidence";
import { FruitFlyMetaAnalysis } from "./fruitfly-meta-analysis";
import { disconnectedFruitFly } from "../../lib/sources/contracts";
import { workflowProgress } from "../../lib/web/workflow-progress";

const question = "  What changed before the decoder entered ESCAPE?\nKeep exact.  ";
const forbidden = () => assert.fail("Rendering must not submit or call Meta");
const props = { question, hasEvidence: false, onChange: forbidden, onSet: forbidden };

test("one local investigation action confirms success and points to observation", () => {
  const initial = renderToStaticMarkup(<InvestigationQuestion {...props} />);
  assert.match(initial, /What do you want to understand from this simulation/);
  assert.equal((initial.match(/type="submit"/g) ?? []).length, 1);
  assert.match(initial, /Set Investigation Question/);
  assert.match(initial, /Local action · no Meta request/);
  for (const hasEvidence of [false, true]) {
    const set = renderToStaticMarkup(<InvestigationQuestion {...props} hasEvidence={hasEvidence} setQuestion={question} />);
    assert.match(set, /<button[^>]*disabled=""[^>]*>Question Set ✓/);
    assert.match(set, /role="status" aria-live="polite"/);
    assert.match(set, /data-set="true"/);
    assert.doesNotMatch(set, /<textarea/);
    assert.match(set, />Change question<\/button>/);
    assert.equal((set.match(/type="submit"/g) ?? []).length, 1);
    assert.match(set, hasEvidence ? /Next: observe the received activity/ : /Next: wait for relevant simulation data/);
  }
  const edited = renderToStaticMarkup(<InvestigationQuestion {...props} question="Changed draft" setQuestion={question} />);
  assert.match(edited, /<button[^>]*type="submit">Set Investigation Question/);
  assert.match(edited, /<textarea/);
  assert.match(edited, /Draft changed\. Set the question to update your investigation/);
  const empty = renderToStaticMarkup(<InvestigationQuestion {...props} question=" " />);
  assert.match(empty, /<button[^>]*disabled=""[^>]*>Set Investigation Question/);
});

test("Stage 01 visibly completes and Evidence retains the exact investigation question", () => {
  const stages = workflowProgress({ external: true, workspace: "live", question: "Synthetic", result: null, hasTelemetry: false, hasQuestion: true, hasMeta: false, pending: "" });
  const progress = renderToStaticMarkup(<WorkflowProgress external stages={stages} phase="TEST" onNavigate={forbidden} />);
  assert.match(progress, /aria-label="Stage 01: QUESTION: COMPLETE"/);
  assert.match(progress, /<em>COMPLETE<\/em>/);
  const evidence = renderToStaticMarkup(<FruitFlyEvidenceView snapshot={disconnectedFruitFly()} question={question} />);
  assert.match(evidence, /Verify what happened\./);
  assert.ok(evidence.includes(question));
});

test("observational Meta explanation shows inline accessible progress and disables resubmission", () => {
  const html = renderToStaticMarkup(<FruitFlyMetaAnalysis enabled state={{ pending: true }} onAnalyze={forbidden} />);
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /class="spinner"/);
  assert.match(html, /META IS EXPLAINING YOUR EVIDENCE/);
});
