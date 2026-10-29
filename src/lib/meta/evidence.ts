import { runExperiment } from "../experiment/compare";
import { freezeRecord } from "../experiment/engine";
import type { ExperimentComparison, ExperimentSpec, NetworkDefinition } from "../experiment/types";
import { researchQuestionSchema, validateExperimentProposal } from "./schemas";
import type { PerceptionRecord } from "../perception/contracts";

export interface EvidencePayload {
  readonly perceptionInput?: PerceptionRecord;
  readonly researchQuestion: string;
  readonly experimentSpec: ExperimentSpec;
  readonly comparison: ExperimentComparison;
  readonly provenance: {
    readonly source: "deterministic-engine";
    readonly control: ExperimentComparison["control"]["provenance"];
    readonly perturbed: ExperimentComparison["perturbed"]["provenance"];
    readonly comparison: ExperimentComparison["provenance"];
  };
}

// Only locally engine-produced payloads pass the interpretation gate.
const issuedEvidence = new WeakSet<EvidencePayload>();

export function createEvidencePayload(input: {
  researchQuestion: string;
  networkDefinition: NetworkDefinition;
  experimentSpec: ExperimentSpec;
  perceptionInput?: PerceptionRecord;
}): EvidencePayload {
  const researchQuestion = researchQuestionSchema.parse(input.researchQuestion);
  const network = structuredClone(input.networkDefinition);
  const { spec } = validateExperimentProposal(input.experimentSpec, network);
  if (input.perceptionInput && input.perceptionInput.measurement.amplitude !== spec.stimulus.amplitude) throw new Error("Perception mapping must match the approved stimulus.");
  // Sprint 1 still performs its own validation before any simulation.
  const comparison = runExperiment(network, spec);
  const evidence: EvidencePayload = freezeRecord({
    ...(input.perceptionInput ? { perceptionInput: structuredClone(input.perceptionInput) } : {}),
    researchQuestion,
    experimentSpec: spec,
    comparison,
    provenance: {
      source: "deterministic-engine" as const,
      control: comparison.control.provenance,
      perturbed: comparison.perturbed.provenance,
      comparison: comparison.provenance,
    },
  });
  issuedEvidence.add(evidence);
  return evidence;
}

export function assertEngineEvidence(evidence: EvidencePayload): void {
  if (!issuedEvidence.has(evidence)) {
    throw new Error("Interpretation requires an immutable payload from createEvidencePayload; arbitrary or deserialized evidence is not accepted.");
  }
}
