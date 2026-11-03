import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { FruitFlyScientist } from "./fruitfly-analysis";
import { validatedRecording } from "../../lib/sources/validated-recording";
import { disconnectedFruitFly } from "../../lib/sources/contracts";
import { observationalRequest, createObservationalAction } from "../../lib/web/observational-action";

const question = "What changed before the decoder entered ESCAPE?";
const frames = validatedRecording();
const forbidden = () => assert.fail("Rendering or absent-event handling must not request a provider");
const idleSnapshot = { ...disconnectedFruitFly(), evidence: frames[0], retentionId: "fixture-reference" };
const props = { now: Date.parse(frames[0].receivedAt), question, meta: { state: { pending: false }, enabled: true, onAnalyze: forbidden }, onLive: forbidden, onEvidence: forbidden };

test("absent ESCAPE preserves the original question and IDLE evidence, with inspection instead of a Meta offer", () => {
  const html = render(<FruitFlyScientist {...props} snapshot={idleSnapshot} frames={[frames[0]]} />);
  for (const text of [question, "ESCAPE was not observed in the retained window.", "Observed decoder states: IDLE.", "INSPECT OBSERVED DECODER STATES", "Inspect retained evidence", "Motor decoder state is IDLE."]) assert.ok(html.includes(text), text);
  assert.match(html, /class="primary-button"[^>]*>INSPECT OBSERVED DECODER STATES/);
  assert.doesNotMatch(html, /Ask CausalFly to explain|EXPLAIN WITH META|RETRY META ANALYSIS|xr-meta-runtime/);
  assert.equal(idleSnapshot.evidence, frames[0]);
});

test("absent-event request cannot be constructed or submitted and never rewrites the original question", async () => {
  const before = JSON.stringify(idleSnapshot);
  assert.equal(observationalRequest(question, idleSnapshot, [frames[0]]), null);
  await createObservationalAction(forbidden, forbidden)(question, idleSnapshot, [frames[0]]);
  assert.equal(JSON.stringify(idleSnapshot), before);
  assert.equal(question, "What changed before the decoder entered ESCAPE?");
});

test("genuinely observed ESCAPE retains the existing enabled event interpretation action", () => {
  const snapshot = { ...idleSnapshot, evidence: frames.at(-1)! };
  const html = render(<FruitFlyScientist {...props} snapshot={snapshot} frames={frames} />);
  assert.match(html, /ESCAPE transition observed at tick 2/);
  assert.match(html, /Ask CausalFly to explain/);
  assert.match(html, /class="primary-button" aria-busy="false"[^>]*><span[^>]*>EXPLAIN WITH META/);
  assert.doesNotMatch(html, /ESCAPE was not observed/);
  assert.ok(observationalRequest(question, snapshot, frames));
});
