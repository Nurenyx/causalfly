import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoTooltip, cockpitHelp } from "./info-tooltip";
import { ResearchQuestion } from "./research-question";
test("optional help exposes a keyboard button, labelled relationship, and initially hidden tooltip", () => {
  for (const [label, help] of Object.entries(cockpitHelp)) {
    const html = renderToStaticMarkup(<InfoTooltip label={label}>{help}</InfoTooltip>);
    assert.match(html, /type="button"/); assert.match(html, /aria-describedby=/); assert.match(html, /role="tooltip"/); assert.match(html, /hidden=""/); assert.match(html, /aria-expanded="false"/);
  }
});
test("retained question has explicit edit entry and cannot submit or request Meta during rendering", () => {
  const html = renderToStaticMarkup(<ResearchQuestion question="Does input change output?" busy={false} underTest={false} onUse={() => assert.fail("Explicit action only")} />);
  assert.match(html, /RETAINED RESEARCH QUESTION/); assert.match(html, /Ask Your Own Question/); assert.doesNotMatch(html, /<textarea|type="submit"/);
});
