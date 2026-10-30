export type LiveConnectomeStep = "question" | "observe" | "understand";

/** Local state only: no top-level workspace destinations are accepted here. */
export function LiveConnectomeProgress({ step: active, questionRetained, onStep }: { step: LiveConnectomeStep; questionRetained: boolean; onStep: (step: LiveConnectomeStep) => void }) {
  return <nav className="local-live-progress" aria-label="Live Connectome progress">{(["question", "observe", "understand"] as const).map((step, i) => <button key={step} type="button" aria-label={`Stage 0${i + 1}: ${step.toUpperCase()}${step === "question" && questionRetained ? ": COMPLETE" : ""}`} aria-current={active === step ? "step" : undefined} onClick={() => onStep(step)}><span>{step === "question" && questionRetained ? "✓" : `0${i + 1}`}</span> {step.toUpperCase()}</button>)}</nav>;
}
