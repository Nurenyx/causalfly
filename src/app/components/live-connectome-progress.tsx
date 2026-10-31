export type LiveConnectomeStep = "question" | "observe" | "understand";

export function liveStepAvailable(step: LiveConnectomeStep, questionRetained: boolean, evidenceAvailable: boolean) {
  return step === "question" || questionRetained && (step === "observe" || evidenceAvailable);
}
export function permittedLiveStep(step: LiveConnectomeStep, questionRetained: boolean, evidenceAvailable: boolean): LiveConnectomeStep {
  return !questionRetained ? "question" : step === "understand" && !evidenceAvailable ? "observe" : step;
}
/** Native disabled buttons preserve keyboard semantics; explanations remain visible. */
export function LiveConnectomeProgress({ step: active, questionRetained, evidenceAvailable = false, onStep }: { step: LiveConnectomeStep; questionRetained: boolean; evidenceAvailable?: boolean; onStep: (step: LiveConnectomeStep) => void }) {
  return <nav className="local-live-progress" aria-label="Live Connectome progress">{(["question", "observe", "understand"] as const).map((step, i) => {
    const available = liveStepAvailable(step, questionRetained, evidenceAvailable);
    const reason = !questionRetained ? "Set an investigation question first." : "Receive relevant evidence for this investigation first.";
    return <span key={step} className="live-step" title={available ? undefined : reason}><button type="button" disabled={!available} aria-describedby={!available ? `live-step-${step}-help` : undefined} aria-label={`Stage 0${i + 1}: ${step.toUpperCase()}${step === "question" && questionRetained ? ": COMPLETE" : ""}`} aria-current={active === step ? "step" : undefined} onClick={() => { if (available) onStep(step); }}><span>{step === "question" && questionRetained ? "✓" : `0${i + 1}`}</span> {step.toUpperCase()}</button>{!available && <small id={`live-step-${step}-help`}>{reason}</small>}</span>;
  })}</nav>;
}
