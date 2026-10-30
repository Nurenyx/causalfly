import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { freezeRecord } from "../experiment/engine";
import { createCompactEvidence } from "../meta/compact-evidence";
import type { EvidencePayload } from "../meta/evidence";
import type { ExperimentSpec } from "../experiment/types";
import type { ScientificAnalysis } from "../meta/schemas";
import type { PerceptionRecord } from "../perception/contracts";
import { extractFeatures } from "../perception/features";
import type { RunDiagnostics, RunEvent, RunEventType, RunManifest } from "./flight-recorder-types";

const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const now = () => new Date().toISOString();
const EVENT_LIMIT = 1000;
const scope = globalThis as typeof globalThis & { __causalflyRecorder?: Map<string, { recorder: FlightRecorder; expires: number }> };
const retained: Map<string, { recorder: FlightRecorder; expires: number }> = scope.__causalflyRecorder ??= new Map();

/** Process-local operational record, never an input to the scientific engine. */
export class FlightRecorder {
  readonly run_id = `run_${randomUUID()}`;
  private events: RunEvent[] = [];
  private manifest: RunManifest;
  private designClaimed = false;

  constructor(parent?: FlightRecorder) {
    const at = now();
    const previous = parent?.snapshot();
    this.events = previous ? [...previous.events] : [];
    this.manifest = {
      run_id: this.run_id, ...(parent ? { parent_run_id: parent.run_id } : {}),
      source: previous?.manifest.source ?? "synthetic", createdAt: at, updatedAt: at,
      models: previous?.manifest.models.filter(m => m.task !== "interpret") ?? [],
      ...(previous?.manifest.media ? { media: previous.manifest.media } : {}),
      ...(previous?.manifest.perception ? { perception: previous.manifest.perception } : {}),
      warnings: previous?.manifest.warnings ?? [], interpretation: { state: "not_requested" },
    };
    this.event("run.created", parent ? { parentRunId: parent.run_id } : {});
    for (const [id, entry] of retained) if (entry.expires < Date.now()) retained.delete(id);
    if (retained.size >= 200) retained.delete(retained.keys().next().value!);
    retained.set(this.run_id, { recorder: this, expires: Date.now() + 2 * 60 * 60 * 1000 });
  }

  event(type: RunEventType, metadata: RunEvent["metadata"] = {}) {
    // Runtime allowlist as well as a typed boundary. No arbitrary object spread.
    const safe: Record<string, string | number> = {};
    for (const key of ["mediaId", "code", "model", "mode", "perceptionId", "trackedFrames", "amplitude", "designId", "parentRunId", "sceneId", "concept", "provider", "selection", "candidateCount", "samResultId"] as const) {
      const value = metadata[key];
      if (typeof value === "string" || typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    }
    const at = now();
    this.events.push(freezeRecord({ run_id: this.run_id, sequence: this.events.length + 1, type, at, metadata: safe }));
    this.manifest = { ...this.manifest, updatedAt: at };
    if (this.events.length > EVENT_LIMIT) {
      this.events = this.events.slice(-EVENT_LIMIT).map((event, i) => ({ ...event, sequence: i + 1 }));
      this.manifest = { ...this.manifest, warnings: [...new Set([...this.manifest.warnings, "Event retention limit reached; oldest events omitted."])] };
    }
  }

  media(identity: import("../perception/blob-contract").BlobMediaIdentity) {
    this.manifest = { ...this.manifest, media: structuredClone(identity) };
  }

  question(question: string) {
    this.manifest = { ...this.manifest, question };
    this.event("question.submitted");
  }

  model(task: "design" | "interpret" | "perceive" | "scene", model: string, mode: string) {
    this.manifest = { ...this.manifest, models: [...this.manifest.models, { task, model, mode }] };
  }

  forDesign(): FlightRecorder {
    if (this.designClaimed || this.manifest.spec) return new FlightRecorder(this);
    this.designClaimed = true;
    return this;
  }

  perception(perception?: PerceptionRecord) {
    if (!perception) {
      const { perception: _removed, media: _removedMedia, ...manifest } = this.manifest;
      void _removed; void _removedMedia;
      this.manifest = { ...manifest, source: "synthetic" };
      return;
    }
    const source = perception.run_id ? retained.get(perception.run_id)?.recorder : undefined;
    if (source && source !== this) {
      const keys = new Set(this.events.map(e => `${e.run_id}:${e.type}:${e.at}`));
      this.events = [...this.events, ...source.snapshot().events.filter(e => !keys.has(`${e.run_id}:${e.type}:${e.at}`))]
        .sort((a, b) => a.at.localeCompare(b.at)).map((event, i) => ({ ...event, sequence: i + 1 }));
    }
    const { media: _previousMedia, ...manifest } = this.manifest;
    void _previousMedia;
    this.manifest = { ...manifest, source: perception.mode === "SAM LIVE" ? "SAM perception" : "offline perception fixture", perception: structuredClone(perception), ...(perception.provenance.storage ? { media: structuredClone(perception.provenance.storage) } : {}) };
    for (const warning of perception.provenance.warnings) this.warning(warning);
  }

  spec(spec: ExperimentSpec) {
    this.manifest = { ...this.manifest, spec: structuredClone(spec), specSha256: sha256(spec) };
  }

  warning(code: string) {
    this.manifest = { ...this.manifest, warnings: [...new Set([...this.manifest.warnings, code])] };
    this.event("warning.recorded", { code });
  }

  measured(evidence: EvidencePayload) {
    const { comparison } = createCompactEvidence(evidence);
    const { control, perturbed, provenance: { matchedConditions: matched } } = evidence.comparison;
    const p = evidence.perceptionInput;
    let derivedStimulusValid = false;
    if (p) {
      try {
        const derived = extractFeatures(p.measurement.objectId, p.measurement.frames, p.media);
        derivedStimulusValid = JSON.stringify(derived) === JSON.stringify(p.measurement) && derived.amplitude === evidence.experimentSpec.stimulus.amplitude;
      } catch { /* Failed validation remains a visible false signal. */ }
    }
    this.manifest = { ...this.manifest, measuredAt: now(), engineVersion: control.provenance.engineVersion, measurements: comparison,
      validation: {
        sameInputs: matched.network && matched.stimulus && matched.seed,
        sameParameters: matched.engine && matched.experiment && matched.maxSteps && matched.outputThreshold,
        interventionApplied: control.provenance.appliedPerturbation === null && JSON.stringify(perturbed.provenance.appliedPerturbation) === JSON.stringify(evidence.experimentSpec.perturbation) && matched.onlyDeclaredPerturbationDiffers,
        controlPresent: control.condition === "CONTROL", interventionPresent: perturbed.condition === "PERTURBED",
        measurementsImmutable: Object.isFrozen(evidence.comparison) && Object.isFrozen(control.activity) && Object.isFrozen(perturbed.activity),
        replayableInputs: Boolean(control.provenance.network && control.provenance.experiment && matched.engine),
        ...(p ? { trackReturned: p.measurement.frames.length >= 2, derivedStimulusValid } : {}),
      } };
    this.event("experiment.control.completed");
    this.event("experiment.intervention.completed");
    this.event("experiment.comparison.completed");
  }

  interpretation(state: RunManifest["interpretation"]["state"], analysis?: ScientificAnalysis) {
    this.manifest = { ...this.manifest, interpretation: { state, ...(analysis ? { analysis: structuredClone(analysis), sha256: sha256(analysis) } : {}) } };
    this.event(`meta.interpretation.${state === "requested" ? "requested" : state === "completed" ? "completed" : "failed"}`);
    if (analysis) this.event("meta.next_experiment.proposed");
  }

  snapshot(): RunDiagnostics {
    return freezeRecord(structuredClone({ schemaVersion: "causalfly-flight-recorder-v1" as const, manifest: this.manifest, events: this.events }));
  }
}

export function retainedRecorder(runId: string): FlightRecorder | undefined {
  const entry = retained.get(runId);
  return entry && entry.expires >= Date.now() ? entry.recorder : undefined;
}

/** Only called with IDs read from server-retained/signed perception records. */
export function perceptionRecorder(perception?: PerceptionRecord): FlightRecorder {
  const existing = perception?.run_id ? retained.get(perception.run_id) : undefined;
  if (existing && existing.expires >= Date.now()) {
    return existing.recorder.forDesign();
  }
  const recorder = new FlightRecorder();
  if (perception) {
    recorder.perception(perception);
    recorder.warning("Perception reused; original event ledger unavailable. Signed geometry retained.");
  }
  return recorder;
}
