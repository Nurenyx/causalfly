import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { MetaStatus } from "./status-indicator";
import { LiveStateSummary, QuestionCompatibility } from "./live-state-summary";
import { AutonomyPanel } from "./autonomy-panel";
import { DataSourcePanel } from "./data-source-panel";
import { validatedRecording } from "../../lib/sources/validated-recording";
import { disconnectedFruitFly } from "../../lib/sources/contracts";

const forbidden = () => assert.fail("Rendering never requests inference, starts trials or navigates");
test("Meta configured idle is READY; only live explicit inference is PROCESSING", () => {
  assert.match(render(<MetaStatus mode="META LIVE" working={false} />),/META READY/);
  assert.match(render(<MetaStatus mode="META LIVE" working />),/META PROCESSING/);
  assert.match(render(<MetaStatus mode="META LIVE" working error="Previous request failed" />),/META PROCESSING/);
  for (const html of [render(<MetaStatus mode={null} working={false} />),render(<MetaStatus mode="FAKE META CLIENT" working />),render(<MetaStatus mode="META LIVE" disabled working />)]) assert.doesNotMatch(html,/META PROCESSING/);
  assert.match(render(<MetaStatus mode="META LIVE" error="Request failed" working={false} />),/META ERROR/);
});
test("retained evidence and no-ESCAPE question are explicit without triggering analysis", () => {
  const frame=validatedRecording()[0];
  const snapshot={...disconnectedFruitFly(),evidence:frame};
  const html=render(<><LiveStateSummary snapshot={snapshot} now={Date.parse(frame.receivedAt)} /><QuestionCompatibility question="Before ESCAPE?" snapshot={snapshot} frames={[frame]} onEvidence={forbidden} onReplay={forbidden} /></>);
  for (const label of ["SERVER","DISCONNECTED","STREAM","INACTIVE","EVIDENCE","RETAINED SNAPSHOT","ESCAPE was not observed in the retained window.","Observed decoder states: IDLE","INSPECT OBSERVED DECODER STATES","Replay available evidence"]) assert.ok(html.includes(label),label);
});
test("procedural movement always discloses the decoder/controller execution boundary", () => {
  const html=render(<AutonomyPanel model="lightweight" />);
  assert.match(html,/PROCEDURAL EMBODIMENT/);
  assert.match(html,/Decoder selects supported states; CausalFly executes movement\./);
});

test("sidebar agrees with retained stream status even when the last transport message carried data", () => {
  const frame=validatedRecording()[0];
  const snapshot={...disconnectedFruitFly(),state:"DATA RECEIVED" as const,evidence:frame};
  const html=render(<DataSourcePanel source="FRUITFLY_XR" snapshot={snapshot} now={Date.parse(frame.receivedAt)+5000} disabled={false} onSelect={forbidden} onConnect={forbidden} onDisconnect={forbidden} />);
  for (const label of ["SERVER CONNECTED","STREAM INACTIVE","EVIDENCE RETAINED SNAPSHOT"]) assert.ok(html.includes(label),label);
  assert.doesNotMatch(html,/>DATA RECEIVED</);
});
