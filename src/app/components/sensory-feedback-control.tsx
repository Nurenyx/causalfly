import type { ChangeEvent } from "react";
export type FeedbackReceipt = "ARMED" | "SENDING" | "ACCEPTED" | "REJECTED";
export function SensoryFeedbackControl({ armed, available, receipt, detail, onChange, disabled = false, decoderChangedAfterAcceptance = false }: { armed: boolean; available: boolean; receipt: FeedbackReceipt; detail: string; onChange: (value: boolean) => void; disabled?: boolean; decoderChangedAfterAcceptance?: boolean }) {
  const state = !armed ? (available ? "OFF" : "UNAVAILABLE") : receipt === "REJECTED" ? "REJECTED" : !available ? "UNAVAILABLE" : receipt;
  return <section className="sensory-feedback" aria-label="Sensory feedback to connectome" data-feedback={state}>
    <div className="feedback-heading"><label><input type="checkbox" checked={armed} disabled={disabled || (!available && !armed)} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)} /> SENSORY FEEDBACK TO CONNECTOME</label><strong role="status">{state === "REJECTED" ? "FEEDBACK REJECTED" : state}</strong></div>
    <p>Send experimental environment stimuli to the connected brain simulation.</p>
    <div className="feedback-status" aria-live="polite"><strong>{state === "ACCEPTED" ? "Last stimulus referenced by validated server telemetry." : state === "REJECTED" ? "Feedback was rejected; no acceptance claimed." : state === "SENDING" ? "Stimulus sent; awaiting validated server acceptance." : state === "ARMED" ? "Armed; no stimulus acceptance yet." : state === "OFF" ? "Feedback off; no sensor messages sent." : "Feedback unavailable; telemetry observation remains available."}</strong><span>{detail || "No server receipt yet."}</span></div>
    <p className="feedback-path"><span data-emphasis={state === "ACCEPTED"}>VIRTUAL ENVIRONMENT → SENSORY INPUT → BRAIN SERVER</span> → CONNECTOME DYNAMICS → <span data-emphasis={decoderChangedAfterAcceptance}>DECODER → PROCEDURAL EMBODIMENT</span></p>
    <small>Experimental proxy, not biological sensory equivalence. Acceptance does not establish successful closed-loop behavior.</small>
  </section>;
}
