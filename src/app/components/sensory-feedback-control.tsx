import type { ChangeEvent } from "react";
export type FeedbackReceipt = "ARMED" | "SENDING" | "ACCEPTED" | "REJECTED";
export type FeedbackCapabilityState =
  | "OFF"
  | "ARMED"
  | "SENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "NOT CONFIGURED"
  | "DISCONNECTED"
  | "UNAVAILABLE"
  | "REPLAY"
  | "PAUSED";

export function SensoryFeedbackControl({
  armed,
  available,
  receipt,
  detail,
  onChange,
  disabled = false,
  decoderChangedAfterAcceptance = false,
  configured = true,
  replay = false,
  paused = false,
  telemetryConnected = false,
  disconnected = false,
}: {
  armed: boolean;
  available: boolean;
  receipt: FeedbackReceipt;
  detail: string;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  decoderChangedAfterAcceptance?: boolean;
  configured?: boolean;
  replay?: boolean;
  paused?: boolean;
  telemetryConnected?: boolean;
  disconnected?: boolean;
}) {
  const state: FeedbackCapabilityState = replay
    ? "REPLAY"
    : !configured
    ? "NOT CONFIGURED"
    : paused && !available
    ? "PAUSED"
    : !armed
    ? available
      ? "OFF"
      : "UNAVAILABLE"
    : receipt === "REJECTED"
    ? "REJECTED"
    : disconnected
    ? "DISCONNECTED"
    : !available
    ? "UNAVAILABLE"
    : receipt;

  const summary =
    state === "ACCEPTED"
      ? "Last stimulus referenced by validated server telemetry."
      : state === "REJECTED"
      ? "Feedback was rejected; no acceptance claimed."
      : state === "SENDING"
      ? "Stimulus sent; awaiting validated server acceptance."
      : state === "ARMED"
      ? "Armed; no stimulus acceptance yet."
      : state === "OFF"
      ? "Feedback off; no sensor messages sent."
      : state === "NOT CONFIGURED"
      ? telemetryConnected
        ? "Read-only telemetry is connected, but the experimental brain-input endpoint is not configured for this deployment."
        : "Experimental brain-input endpoint is not configured for this deployment; telemetry observation remains available."
      : state === "REPLAY"
      ? "Feedback is intentionally disabled during recorded trajectory replay."
      : state === "PAUSED"
      ? "Feedback is intentionally unavailable while autonomous execution is paused."
      : state === "DISCONNECTED"
      ? "Experimental brain input disconnected; read-only telemetry is independent."
      : "Feedback unavailable; telemetry observation remains available.";

  const fallbackDetail =
    state === "NOT CONFIGURED"
      ? telemetryConnected
        ? "READ-ONLY TELEMETRY: CONNECTED · EXPERIMENTAL SENSORY FEEDBACK: NOT CONFIGURED (NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL)."
        : "Configure NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL (/brain/v1) before build to enable opt-in sensory input."
      : state === "REPLAY"
      ? "Replay mode; neural input disconnected."
      : state === "PAUSED"
      ? "Resume autonomy or reset the session to enable experimental sensory input."
      : state === "OFF"
      ? "Configured / standby. Select to open the opt-in /brain/v1 sensory input connection."
      : state === "ARMED"
      ? "Connecting experimental brain input"
      : state === "DISCONNECTED"
      ? "Uncheck feedback, then select it again to start a new experimental input session."
      : "No server receipt yet.";

  return <section className="sensory-feedback" aria-label="Sensory feedback to connectome" data-feedback={state}>
    <div className="feedback-heading"><label><input type="checkbox" checked={armed && configured} disabled={disabled || replay || !configured || (!available && !armed)} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)} /> SENSORY FEEDBACK TO CONNECTOME</label><strong role="status">{state === "REJECTED" ? "FEEDBACK REJECTED" : state}</strong></div>
    <p>Send experimental environment stimuli to the connected brain simulation.</p>
    <div className="feedback-status" aria-live="polite"><strong>{summary}</strong><span>{detail || fallbackDetail}</span></div>
    <p className="feedback-path"><span data-emphasis={state === "ACCEPTED"}>VIRTUAL ENVIRONMENT → SENSORY INPUT → BRAIN SERVER</span> → CONNECTOME DYNAMICS → <span data-emphasis={decoderChangedAfterAcceptance}>DECODER → PROCEDURAL EMBODIMENT</span></p>
    <small>Experimental proxy, not biological sensory equivalence. Acceptance does not establish successful closed-loop behavior.</small>
  </section>;
}
