import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { DiagnosticVisibilityProvider } from "./diagnostic-visibility";
import { developerDiagnosticsEnabled } from "../../lib/web/diagnostic-policy";
import { ExperimentTrust, RunDiagnosticsDetails } from "./experiment-trust";
import type { RunDiagnostics } from "../../lib/web/flight-recorder-types";
import { createEvidencePayload } from "../../lib/meta/evidence";
import { createCompactEvidence } from "../../lib/meta/compact-evidence";
import { demoExperimentSpec } from "../../lib/experiment/demo";
import { syntheticDemoNetwork } from "../../lib/experiment/network";
import { offlinePerceptionFixture } from "../../lib/perception/fixture";

const measurements = createCompactEvidence(createEvidencePayload({ researchQuestion: "Trust fixture", networkDefinition: syntheticDemoNetwork, experimentSpec: demoExperimentSpec })).comparison;
const diagnostics: RunDiagnostics = {
  schemaVersion: "causalfly-flight-recorder-v1", events: [],
  manifest: { run_id: "run_trust_fixture", source: "synthetic", createdAt: "2026-10-29T12:00:00Z", updatedAt: "2026-10-29T12:00:00Z", models: [], measurements,
    warnings: [], interpretation: { state: "not_requested" },
    validation: { sameInputs: true, sameParameters: true, interventionApplied: true, controlPresent: true, interventionPresent: true, measurementsImmutable: true, replayableInputs: true } },
};

test("trust UI exposes separate signals, local export and honest replay and biological boundaries", () => {
  const before = JSON.stringify(diagnostics);
  const html = renderToStaticMarkup(<DiagnosticVisibilityProvider value={true}><ExperimentTrust diagnostics={diagnostics} /></DiagnosticVisibilityProvider>);
  for (const text of ["EXPERIMENT TRUST", "DETERMINISTIC MODEL RESULT", "REPLAYABLE INPUTS ✓", "REAL-FLY VALIDATION — Not established", "AI · Not requested", "Engine-owned", "EXPORT RUN DIAGNOSTICS", "run_trust_fixture", "not a signed attestation"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /REPLAY VERIFIED|confidence score|100%|Biological validation/);
  assert.equal(JSON.stringify(diagnostics), before);
  assert.equal(renderToStaticMarkup(<ExperimentTrust />), "");
});

test("failed checks and offline fixture are labeled truthfully", () => {
  const failed: RunDiagnostics = { ...diagnostics, manifest: { ...diagnostics.manifest, perception: offlinePerceptionFixture("offline"),
    interpretation: { state: "failed" }, validation: { ...diagnostics.manifest.validation!, sameInputs: false, trackReturned: false, derivedStimulusValid: false } } };
  const html = renderToStaticMarkup(<ExperimentTrust diagnostics={failed} />);
  assert.match(html, /⚠ Check conditions/);
  assert.match(html, /Offline geometry retained/);
  assert.match(html, /Interpretation failed/);
  assert.match(html, /⚠ Derived stimulus valid/);
  assert.doesNotMatch(html, /✓ Matched conditions|SAM track retained|✓ Track returned/);
});

test("a failed run with no measurements still has inspectable diagnostics and an export action", () => {
  const failure: RunDiagnostics = { ...diagnostics, manifest: { ...diagnostics.manifest, measurements: undefined } };
  const html = renderToStaticMarkup(<DiagnosticVisibilityProvider value={true}><RunDiagnosticsDetails diagnostics={failure} /></DiagnosticVisibilityProvider>);
  assert.match(html, /EXPORT RUN DIAGNOSTICS/);
  assert.match(html, /run_trust_fixture/);
});


test("production default hides raw developer export and ledger while scientific evidence stays visible", () => {
  for (const enabled of [false, true]) {
    const html = renderToStaticMarkup(<DiagnosticVisibilityProvider value={enabled}><ExperimentTrust diagnostics={diagnostics} /></DiagnosticVisibilityProvider>);
    for (const text of ["EXPERIMENT TRUST", "Validation &amp; scientific boundaries", "Engine-owned", "REAL-FLY VALIDATION", "Technical details / Flight Recorder", "run_trust_fixture"]) assert.ok(html.includes(text), text);
    assert.equal(html.includes("EXPORT RUN DIAGNOSTICS"), enabled);
    assert.equal(html.includes("Inspect manifest &amp; event ledger"), enabled);
  }
  assert.equal(developerDiagnosticsEnabled({ NODE_ENV: "production" }), false);
  assert.equal(developerDiagnosticsEnabled({ NODE_ENV: "production", CAUSALFLY_DEVELOPER_DIAGNOSTICS: "1" }), true);
  assert.equal(developerDiagnosticsEnabled({ NODE_ENV: "development" }), true);
  assert.equal(developerDiagnosticsEnabled({ NODE_ENV: "development", CAUSALFLY_DEVELOPER_DIAGNOSTICS: "0" }), false);
});
