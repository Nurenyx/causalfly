import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { SourceContext } from "./source-context";
import { validatedRecording } from "../../lib/sources/validated-recording";
test("synthetic source context never displays a live biological/connectome visualization",()=>{const html=render(<SourceContext source="SYNTHETIC_FIXTURE" />);assert.match(html,/ENGINEERING NETWORK/);assert.doesNotMatch(html,/CONNECTOME CONTEXT|<canvas|>LIVE</);assert.match(html,/no male-cns connectome activity is implied/);});
test("connectome source context uses only supplied evidence and distinguishes current, retained and structure-only",()=>{const evidence=validatedRecording()[0];for(const historical of [false,true]){const html=render(<SourceContext source="FRUITFLY_XR" evidence={evidence} historical={historical}/>);assert.match(html,/CONNECTOME CONTEXT/);assert.ok(html.includes(historical?'RETAINED':'LIVE'));assert.ok(html.includes(evidence.telemetry.motorMode));}assert.match(render(<SourceContext source="FRUITFLY_XR"/>),/STRUCTURE ONLY/);});
