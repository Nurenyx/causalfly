import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { EmbodiedExperiment } from "./embodied-experiment";

test("organism leads the scientist and deeper neural explanation in document order", () => {
  const html = renderToStaticMarkup(<EmbodiedExperiment result={null} busy={false} strength={.5} onStrength={() => {}} onRun={() => {}} scientist={<aside>SCIENTIST RAIL</aside>} />);
  assert.ok(html.indexOf("EMBODIED WORLD") < html.indexOf("SCIENTIST RAIL"));
  assert.ok(html.indexOf("SCIENTIST RAIL") < html.indexOf("NEURAL SYSTEM"));
  assert.match(html, /Autonomous world controls/); assert.match(html, /Stimulus and experiment controls/);
  assert.match(html, /Baseline autonomous policy/); assert.match(html, /Replay recorded experiment/);
  assert.doesNotMatch(html, /Approved signal playback|Recorded output replay|EVIDENCE PLAYBACK/);
  const css = readFileSync("src/app/components/workspace-system.css", "utf8").split("/* Sprint 12A.2:")[1];
  assert.match(css, /2\.5fr/); assert.match(css, /max-width:1100px/); assert.match(css, /grid-row:3/); assert.match(css, /height:390px/);
});
