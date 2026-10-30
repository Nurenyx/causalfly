"use client";

import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";

export function RunDiagnosticsDetails({ diagnostics }: { diagnostics: RunDiagnostics }) {
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(diagnostics, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${diagnostics.manifest.run_id}-diagnostics.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="run-diagnostics"><summary>Run diagnostics</summary>
    <p>Run: <code>{diagnostics.manifest.run_id}</code></p>
    <button type="button" className="secondary-button" onClick={download}>EXPORT RUN DIAGNOSTICS</button>
    <p className="trace-note">Local JSON · includes your question, evidence and AI text. Review before sharing.</p>
    <details><summary>Inspect manifest & event ledger ({diagnostics.events.length})</summary><pre>{JSON.stringify(diagnostics, null, 2)}</pre></details>
  </details>;
}

export function ExperimentTrust({ diagnostics }: { diagnostics?: RunDiagnostics }) {
  if (!diagnostics?.manifest.measurements) return null;
  const m = diagnostics.manifest;
  const v = m.validation;
  const checks: [string, boolean | undefined][] = [
    ["Same input conditions", v?.sameInputs], ["Same experiment parameters", v?.sameParameters],
    ["Intervention applied", v?.interventionApplied], ["Control result present", v?.controlPresent],
    ["Intervention result present", v?.interventionPresent], ["Measurements immutable on server", v?.measurementsImmutable],
    ...(m.perception ? [["Track returned", v?.trackReturned], ["Derived stimulus valid", v?.derivedStimulusValid]] as [string, boolean | undefined][] : []),
  ];
  const matched = v?.sameInputs && v.sameParameters && v.interventionApplied;
  return <section className="experiment-trust" aria-label="Experiment trust">
    <header><strong>EXPERIMENT TRUST</strong><span>DETERMINISTIC MODEL RESULT</span></header>
    <ul>
      {m.perception && <li>{v?.trackReturned ? "✓" : "⚠"} Perception · {m.perception.mode === "SAM LIVE" ? "SAM track retained" : "Offline geometry retained"}</li>}
      <li>{!m.perception || v?.derivedStimulusValid ? "✓" : "⚠"} Input · {m.perception ? v?.derivedStimulusValid ? "Deterministically derived" : "Derivation invalid" : "Approved synthetic stimulus"}</li>
      <li>{matched ? "✓ Matched conditions" : "⚠ Check conditions"}</li>
      <li>{v?.measurementsImmutable ? "✓" : "⚠"} Measurement · Engine-owned</li>
      <li>◇ AI · {m.interpretation.state === "completed" ? "Downstream of evidence" : m.interpretation.state === "failed" ? "Interpretation failed" : m.interpretation.state === "requested" ? "Interpretation requested" : "Not requested"}</li>
      <li>⚠ REAL-FLY VALIDATION — Not established</li>
    </ul>
    <p>{v?.replayableInputs ? "REPLAYABLE INPUTS ✓" : "⚠ Replay inputs incomplete"}</p>
    <details><summary>Validation & scientific boundaries</summary>
      <ul>{checks.map(([label, passed]) => <li key={label}>{passed === true ? "✓" : "⚠"} {label}</li>)}</ul>
      <p>AI proposes and interprets. CausalFly measures. SAM perceives; CausalFly derives the stimulus. These are deterministic synthetic model results, not validated biological predictions. Replay inputs include the exact network and parameters; this run was not rerun to verify equality.</p>
      <p>Immutability describes the engine-issued server snapshot. The download is an inspectable copy, not a signed attestation.</p>
      {m.warnings.length > 0 && <ul>{m.warnings.map((warning, i) => <li key={i}>⚠ {warning}</li>)}</ul>}
    </details>
    <RunDiagnosticsDetails diagnostics={diagnostics} />
  </section>;
}
