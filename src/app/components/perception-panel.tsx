"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, type PerceptionRecord, type PerceptionResponse } from "@/lib/perception/contracts";
import { conceptForVideo, initialPerceptionSession, type PerceptionSession } from "@/lib/web/perception-session";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";
import { RunDiagnosticsDetails } from "./experiment-trust";

const TrackedVideo = dynamic(() => import("./perception-video"), { ssr: false, loading: () => <p role="status">Preparing tracked video…</p> });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function PerceptionDetails({ perception }: { perception: PerceptionRecord }) {
  return <details className="perception-details"><summary>PERCEPTION DETAILS</summary>
    <p>Visual input segmented by Meta SAM 3.1 and deterministically mapped into a synthetic experiment stimulus.</p>
    <p>Input provenance only. This is not causal evidence or evidence that a biological fruit fly perceived the object.</p>
    <p>Half-open box area / frame area. First and last observed frames of one identity; gaps are not interpolated. Longest track wins, then lowest numeric ID. Net growth of 50 percentage points maps to 1.0. Shrinkage maps to 0. No biological angular expansion is inferred.</p>
    <code>{perception.measurement.mappingRule}</code>
    <pre>{JSON.stringify(perception, null, 2)}</pre>
  </details>;
}

export function PerceptionSummary({ perception }: { perception: PerceptionRecord }) {
  const m = perception.measurement;
  return <dl className="perception-metrics">
    <div><dt>OBJECT TRACKED{perception.mode !== "SAM LIVE" ? " / FIXTURE" : ""}</dt><dd>{perception.concept}<small>ID {m.objectId} · {m.frames.length} frames</small></dd></div>
    <div><dt>APPARENT SIZE</dt><dd>{percent(m.firstArea)} → {percent(m.lastArea)}<small>of the frame · box area</small></dd></div>
    <div><dt>VISUAL EXPANSION PROXY</dt><dd>{m.netAreaChange >= 0 ? "+" : ""}{(m.netAreaChange * 100).toFixed(1)}<small>percentage points</small></dd></div>
    <div><dt>DERIVED STIMULUS</dt><dd>{m.amplitude.toFixed(3)}<small>Computed by CausalFly</small></dd></div>
  </dl>;
}

/** Fixture geometry is drawn on its own diagram, never over user media. */
export function OfflineTrack({ perception }: { perception: PerceptionRecord }) {
  const [index, setIndex] = useState(0);
  const frame = perception.measurement.frames[index];
  return <div className="perception-offline"><strong>OFFLINE SAM FIXTURE · NO LIVE DETECTION</strong><svg viewBox="0 0 640 480" role="img" aria-label="Synthetic geometry fixture, not a SAM detection"><rect width="640" height="480" fill="#071925" /><rect x={frame.left} y={frame.top} width={frame.right - frame.left} height={frame.bottom - frame.top} fill="#ffba4220" stroke="#ffba42" strokeWidth="3" /><text x="20" y="35" fill="#ffba42">TEST OBJECT / GEOMETRY ONLY</text></svg><label>Fixture frame {frame.frameIndex}<input aria-label="Offline fixture frame" type="range" min="0" max={perception.measurement.frames.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} /></label></div>;
}

export function PerceptionPanel({ accepted, hasDesign, busy, accepting, designing = false, measured = false, compact = false, onBusy, onUse, onDesign, onRun, onFailure, workflowError, session: suppliedSession, onSession }: {
  accepted?: PerceptionRecord; hasDesign: boolean; busy: boolean; accepting: boolean;
  designing?: boolean; measured?: boolean;
  compact?: boolean;
  onBusy: (busy: boolean) => void; onUse: (perceptionId: string | null, receipt?: string) => void;
  onDesign?: (perceptionId: string, receipt?: string) => void; onRun?: () => void;
  onFailure?: (message: string, diagnostics?: RunDiagnostics) => void; workflowError?: string;
  session?: PerceptionSession; onSession?: Dispatch<SetStateAction<PerceptionSession>>;
}) {
  const [localSession, setLocalSession] = useState<PerceptionSession>(() => ({ ...initialPerceptionSession(), source: accepted ? "perception" : "synthetic" }));
  const session = suppliedSession ?? localSession;
  const setSession = onSession ?? setLocalSession;
  const { source, file, url, concept, ready, analysis, editing } = session;
  const update = (patch: Partial<PerceptionSession>) => setSession(current => ({ ...current, ...patch }));
  const [pending, setPending] = useState<"live" | "fixture" | "">("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const record = analysis?.perception ?? accepted;
  const acceptedHere = Boolean(record && record.id === accepted?.id);
  const showResult = Boolean(record && !editing);
  const retainedMedia = showResult && record?.mode === "OFFLINE SAM FIXTURE" ? <OfflineTrack key={record.id} perception={record} /> : showResult && analysis?.overlay && session.analyzedFile ? <TrackedVideo key={analysis.perception.id} file={session.analyzedFile} overlay={analysis.overlay} perception={analysis.perception} /> : null;
  function fail(message: string, diagnostics?: RunDiagnostics) { setError(message); onFailure?.(message, diagnostics); }
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    setError("");
    if (!next) return;
    // Keep the authoritative result, but never submit a previous draft file after an invalid selection.
    update({ ready: false, file: undefined, url: "" });
    if (!/\.(mp4|mov)$/i.test(next.name) || !["video/mp4", "video/quicktime", "application/octet-stream", ""].includes(next.type)) { fail("Choose an MP4 or MOV video."); return; }
    if (!next.size || next.size > MAX_VIDEO_BYTES) { fail("Choose a nonempty clip of at most 20 MiB."); return; }
    update({ ready: false, file: next, url: URL.createObjectURL(next), concept: conceptForVideo(next.name, concept) });
  }
  async function analyze(mode: "live" | "fixture") {
    if (lock.current || busy || mode === "live" && (!file || !ready || !concept.trim())) return;
    lock.current = true; setPending(mode); onBusy(true); setError("");
    try {
      const form = new FormData();
      if (file) form.set("video", file);
      form.set("concept", concept.trim());
      const response = await fetch("/api/perception", { method: "POST", headers: { "X-Perception-Request": crypto.randomUUID(), ...(mode === "fixture" ? { "Content-Type": "application/json" } : {}) }, body: mode === "fixture" ? JSON.stringify({ mode: "fixture" }) : form });
      const data = await response.json() as PerceptionResponse;
      if (!data.ok) fail(data.error, data.diagnostics);
      else if (!response.ok) fail("Perception request failed. Retry explicitly.");
      else update({ analysis: data, analyzedFile: mode === "live" ? file : undefined, editing: false });
    } catch { fail("Unable to reach CausalFly perception. Retry the explicit action."); }
    finally { lock.current = false; setPending(""); onBusy(false); }
  }
  return <section className={`perception-panel${compact ? " perception-compact" : ""}`} aria-label="Stimulus source" id="perception-source" tabIndex={-1} data-success={showResult} data-accepted={acceptedHere}>
    <div className="perception-source" role="group" aria-label="Choose stimulus source"><span className="eyebrow">STIMULUS SOURCE</span>
      <button type="button" disabled={busy} aria-pressed={source === "synthetic" && !accepted} onClick={() => { update({ source: "synthetic" }); if (accepted) onUse(null); }}>Synthetic stimulus</button>
      <button type="button" disabled={busy} aria-pressed={source === "perception" || Boolean(accepted)} onClick={() => update({ source: "perception" })}>Real-world perception</button>
      <small>{accepted ? accepted.mode === "SAM LIVE" ? "SAM-derived input accepted" : "OFFLINE fixture input accepted" : "Controlled looming stimulus is the default"}</small>
    </div>
    {source === "perception" && <div className="perception-content"><header className="perception-result-header"><div><span className="eyebrow amber-text">{showResult ? record?.mode === "SAM LIVE" ? "META SAM 3.1 — OBJECT TRACKED ✓" : "OFFLINE SAM FIXTURE — GEOMETRY READY ✓" : "META SAM 3.1 — PERCEPTION"}</span><h3>{showResult ? record?.concept : "Show CausalFly an approaching object."}</h3>{showResult && <small>{record?.measurement.frames.length} frames · META SAM 3.1 — PERCEPTION</small>}</div>{showResult && <button type="button" className="text-button" disabled={busy} onClick={() => { setError(""); update({ editing: true }); }}>CHANGE VIDEO</button>}{editing && record && <button type="button" className="text-button" disabled={busy} onClick={() => { setError(""); update({ editing: false }); }}>Keep retained result</button>}</header>
      {!showResult && <div className="perception-upload"><label className="secondary-button">Choose video<input aria-label="Choose video" type="file" accept=".mp4,.mov,video/mp4,video/quicktime" disabled={busy} onChange={choose} /></label>
        <label>Concept<input aria-label="Object concept" value={concept} maxLength={80} disabled={busy} onChange={e => update({ concept: e.target.value })} placeholder="hand" /></label>
        <button type="button" className="primary-button" disabled={busy || !file || !ready || !concept.trim()} aria-busy={pending === "live"} onClick={() => void analyze("live")}>{pending === "live" ? <span role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /> SAM IS TRACKING…</span> : error ? "Retry with SAM 3.1" : "Analyze with SAM 3.1"}</button>
        <small>MP4 / MOV · ≤15 s · ≤20 MiB · ≤1920 px per side. Sent to Meta only when you analyze.</small>
        {file?.name.toLowerCase() === "perception-calibration.mp4" && <small>Calibration clip · use concept “red square”.</small>}
      </div>}
      {error && <p role="alert" className="perception-error">{error}</p>}
      {workflowError && <p className="perception-error">{workflowError}</p>}
      {compact && acceptedHere && showResult && record ? <details className="perception-retained-media"><summary>VIEW RETAINED MEDIA / TRACK</summary>{retainedMedia}<PerceptionDetails perception={record} />{analysis?.diagnostics && <RunDiagnosticsDetails diagnostics={analysis.diagnostics} />}</details> : retainedMedia}
      {!showResult && url && <div className="perception-preview"><video key={url} src={url} controls preload="metadata" playsInline aria-label="Selected video preview" onLoadedMetadata={event => { const v = event.currentTarget; const valid = Number.isFinite(v.duration) && v.duration > 0 && v.duration <= MAX_VIDEO_SECONDS && v.videoWidth <= 1920 && v.videoHeight <= 1920; update({ ready: valid }); if (!valid) fail("Choose a clip of at most 15 seconds and 1920 pixels per side."); }} onError={() => { update({ ready: false }); fail("This browser cannot preview the clip. Export a short H.264 MP4."); }} /><small>LOCAL PREVIEW · NO SAM DETECTION YET</small></div>}
      {showResult && record && <><span className="eyebrow cyan-text">CAUSALFLY — DETERMINISTIC MEASUREMENT</span><PerceptionSummary perception={record} /><ol className="perception-chain" aria-label="Perception to experiment"><li>{record.mode === "SAM LIVE" ? "REAL VIDEO" : "OFFLINE FIXTURE"}</li><li>{record.mode === "SAM LIVE" ? "META SAM TRACKS OBJECT" : "TRACK GEOMETRY FIXTURE"}</li><li>CAUSALFLY MEASURES EXPANSION</li><li data-active={!hasDesign}>META DESIGNS TEST</li><li data-active={acceptedHere && !measured}>CAUSALFLY RUNS EXPERIMENT</li><li data-active={measured}>META EXPLAINS</li></ol>
        {acceptedHere ? <div className="perception-ready" role="status"><strong>STIMULUS READY ✓ <output>{record.measurement.amplitude.toFixed(3)}</output></strong>{!measured && !compact && <button type="button" className="secondary-button" disabled={busy} onClick={onRun}>APPROVE & RUN EXPERIMENT ↓</button>}</div> : <><button type="button" className="primary-button" disabled={busy} aria-busy={accepting || designing} onClick={() => hasDesign ? onUse(record.id, analysis?.receipt) : onDesign?.(record.id, analysis?.receipt)}>{designing ? <span role="status"><span className="spinner" aria-hidden="true" /> META IS DESIGNING WITH THIS STIMULUS…</span> : accepting ? "Preparing validated stimulus…" : hasDesign ? "USE AS EXPERIMENT STIMULUS" : "DESIGN EXPERIMENT WITH THIS STIMULUS"}</button>{!hasDesign && <small>Meta will design a controlled test using the measured stimulus.</small>}</>}
        {(!compact || !acceptedHere) && <><PerceptionDetails perception={record} />{analysis?.diagnostics && <RunDiagnosticsDetails diagnostics={analysis.diagnostics} />}</>}</>}
      {!showResult && <details className="perception-offline-option"><summary>Offline validation</summary><p>Synthetic geometry only. Never a fallback for live SAM.</p><button type="button" className="secondary-button" disabled={busy} aria-busy={pending === "fixture"} onClick={() => void analyze("fixture")}>{pending === "fixture" ? "Loading offline fixture…" : "Load OFFLINE SAM FIXTURE"}</button></details>}
    </div>}
  </section>;
}
