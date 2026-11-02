import { validatedRecording } from "@/lib/sources/validated-recording";
import { FruitFlyEvidenceView } from "./fruitfly-evidence";

export function RecordedSimulationEvidence() {
  const frames = validatedRecording();
  return <section aria-label="Recorded simulation provenance"><p className="workflow-notice"><strong>RECORDED VALIDATED SIMULATION</strong> · Partial capture: {frames.length} frames, model time {frames[0].telemetry.simulationMs}–{frames.at(-1)!.telemetry.simulationMs} ms. Protocol/source validation, not biological validation. Separate from the active investigation.</p><FruitFlyEvidenceView snapshot={{source:"FRUITFLY_XR",state:"DISCONNECTED",presentation:"RECORDED_REPLAY",message:"Pinned historical capture. Original receipt and model timestamps are preserved; no new trial or causal conclusion.",evidence:frames.at(-1)!}} /><details className="panel"><summary>Inspect all retained capture frames</summary><pre>{JSON.stringify(frames,null,2)}</pre></details></section>;
}
