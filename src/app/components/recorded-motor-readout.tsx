import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { trialAmplitude } from "@/lib/experiment/semantics";
import { recordedMotorFrame } from "@/lib/web/embodiment";
import { signalValue } from "@/lib/web/display-labels";

export function RecordedMotorReadout({trial,step,label,index}:{trial:CompactTrialSummary;step:number;label:string;index:number}) {
  const frame=recordedMotorFrame(trial,step),previous=recordedMotorFrame(trial,Math.max(0,step-1));
  const amplitude=trialAmplitude(trial);
  const output=frame.output ?? frame.retainedOutput;
  const movement=frame.phase === "TAKEOFF_ESCAPE" ? "TAKEOFF" : frame.phase === "RECOVERY" ? "RECOVERY" : frame.decoder === "WALK" ? "GROUNDED WALK" : "GROUNDED";
  return <article className={`compare-overlay ${index===2 ? "intervention-overlay" : "control-overlay"}`} aria-label={`${label} Organism State`} data-decoder={frame.decoder ?? "UNOBSERVED"} data-motor={frame.phase} data-step={step}>
    <div className="overlay-badge"><span className={`overlay-dot ${index===2 ? "magenta-dot" : "cyan-dot"}`} aria-hidden="true"/><strong>{index===1 ? "01" : "02"} / {label.toUpperCase()}</strong><small>STEP {step}</small></div>
    <div className="overlay-metrics recorded-state-chain">
      <div><span>STIMULUS</span><b>{amplitude.toFixed(1)}</b><small>{amplitude===0 ? "No input pulse" : step===0 ? "Input pulse" : "Step 0 pulse"}</small></div>
      <div><span>NEURAL OUTPUT</span><b>{signalValue(output)}</b><small>{output===null ? "No retained sample" : `Threshold ${trial.provenance.experiment.outputThreshold}`}</small></div>
      <div data-changed={step>0&&frame.decoder!==previous.decoder}><span>DECODER</span><b>{frame.decoder ?? "UNOBSERVED"}</b><small>Source step {frame.decoderStep ?? "—"}</small></div>
      <div data-changed={step>0&&frame.phase!==previous.phase}><span>PROCEDURAL BODY</span><b>{movement}</b><small>{frame.onset===null ? "No escape command" : `Triggered at step ${frame.onset}`}</small></div>
    </div>
    <p className="procedural-trajectory-note">Rendered displacement {frame.displacement.toFixed(2)} scene units · not a body measurement</p>
  </article>;
}
