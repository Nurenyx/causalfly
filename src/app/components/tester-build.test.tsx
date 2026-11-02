import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { BrainServerStatus } from "./status-indicator";
import { PageHeader, StatusChip, type StatusChipState } from "./page-header";
import { PerceptionPanel } from "./perception-panel";
import { initialPerceptionSession } from "../../lib/web/perception-session";
import { FruitFlyEvidenceView } from "./fruitfly-evidence";
import { validatedRecording } from "../../lib/sources/validated-recording";

test("all page titles share the same header shell with optional action and status", () => {
  for (const title of ["Experiment", "Live Connectome", "Evidence", "Overview", "Compare"]) {
    const html = render(<PageHeader eyebrow="CAUSALFLY" title={title} subtitle="Source provenance" status={<StatusChip state="READY">Ready</StatusChip>} action={<button>Continue</button>} />);
    assert.match(html, /class="topbar page-header"/); assert.match(html, /class="page-header-copy"/); assert.match(html, /class="header-badges"/); assert.match(html, /Continue/);
  }
  for (const state of ["ACTIVE", "READY", "STANDBY", "OFFLINE", "ERROR", "INFORMATIONAL"] as StatusChipState[]) assert.match(render(<StatusChip state={state}>{state}</StatusChip>), new RegExp(`data-status="${state}"`));
});
test("one persistent video failure renders one alert even when workflow supplies the same failure", () => {
  const message = "Private video upload is not enabled on this server.";
  const html = render(<PerceptionPanel hasDesign={false} busy={false} accepting={false} onBusy={() => {}} onUse={() => {}} session={{ ...initialPerceptionSession(), source: "perception", error: message }} workflowError={message} />);
  assert.equal(html.split(message).length - 1, 1); assert.equal((html.match(/role="alert"/g) ?? []).length, 1);
  assert.ok(!html.includes("OBJECT TRACKED ✓"));
});
test("recorded source stays explicitly recorded in Evidence", () => {
  const snapshot = { source: "FRUITFLY_XR" as const, state: "DISCONNECTED" as const, presentation: "RECORDED_REPLAY" as const, message: "Recorded capture", evidence: validatedRecording()[0] };
  const evidence = render(<FruitFlyEvidenceView snapshot={snapshot} />); assert.match(evidence, /Recorded simulation evidence/); assert.match(evidence, /RECORDED REPLAY/);
});

test("brain status chips distinguish fresh activity, disconnection and errors", () => {
  const evidence = validatedRecording()[0];
  const snapshot = {source:"FRUITFLY_XR" as const,state:"DATA RECEIVED" as const,message:"Validated telemetry",evidence};
  assert.match(render(<BrainServerStatus snapshot={snapshot} now={Date.parse(evidence.receivedAt)} />), /data-status="ACTIVE"/);
  assert.match(render(<BrainServerStatus snapshot={{...snapshot,state:"DISCONNECTED",evidence:null}} now={Date.now()} />), /data-status="OFFLINE"/);
  assert.match(render(<BrainServerStatus snapshot={{...snapshot,state:"ERROR",evidence:null}} now={Date.now()} />), /data-status="ERROR"/);
});

test("configuration error has one alert and no retry; transient error retains selected file and retry", () => {
 const file = new File(["clip"],"clip.mp4");
 for (const kind of ["configuration","transient"] as const) {
  const session={...initialPerceptionSession(),source:"perception" as const,file,ready:true,error:"Video input could not proceed",failure:{kind,retryable:kind==="transient",stage:"upload" as const}};
  const html=render(<PerceptionPanel hasDesign={false} busy={false} accepting={false} onBusy={()=>{}} onUse={()=>{}} session={session} />);
  assert.equal((html.match(/role="alert"/g)??[]).length,1);assert.equal(session.file,file);
  if(kind==="configuration") {assert.match(html,/VIDEO ANALYSIS UNAVAILABLE ON THIS HOST/);assert.match(html,/Your video remains local/);assert.ok(!html.includes("Retry video analysis"));}
  else assert.match(html,/Retry video analysis/);
 }
});


test("a retained valid upload never offers upload again; verified unavailable media does", () => {
 for (const mediaUnavailable of [false, true]) {
  const session={...initialPerceptionSession(),source:"perception" as const,upload:mediaUnavailable?undefined:{ticket:"retained"},mediaUnavailable};
  const html=render(<PerceptionPanel hasDesign={false} busy={false} accepting={false} onBusy={()=>{}} onUse={()=>{}} session={session} />);
  assert.equal(html.includes("Upload again (expired or unavailable media)"),mediaUnavailable);
  if(!mediaUnavailable) assert.match(html,/UPLOAD COMPLETE · ANALYSIS PENDING/);
  assert.ok(!html.includes("SAM IS TRACKING"));
 }
});

test("an unsuccessful scene response retains upload without claiming analysis is still pending", () => {
 const session={...initialPerceptionSession(),source:"perception" as const,upload:{ticket:"retained"},error:"No confident candidate",failure:{kind:"validation" as const,retryable:false,stage:"scene" as const}};
 const html=render(<PerceptionPanel hasDesign={false} busy={false} accepting={false} onBusy={()=>{}} onUse={()=>{}} session={session} />);
 assert.match(html,/UPLOAD RETAINED · Scene analysis did not complete/);
 assert.ok(!html.includes("ANALYSIS PENDING"));assert.ok(!html.includes("Upload again"));
});
