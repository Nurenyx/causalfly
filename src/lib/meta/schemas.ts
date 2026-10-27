import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { freezeRecord } from "../experiment/engine";
import { syntheticDemoNetwork, validateNetwork } from "../experiment/network";
import type { ExperimentSpec, NetworkDefinition } from "../experiment/types";

const supportedNetwork = freezeRecord(structuredClone(syntheticDemoNetwork));
const text = z.string().min(1).max(8000).refine((s) => s.trim().length > 0);

export function validateSyntheticNetwork(network: NetworkDefinition): void {
  validateNetwork(network);
  if (!isDeepStrictEqual(network, supportedNetwork)) {
    throw new Error("Sprint 2 Meta integration supports only the unchanged synthetic demo network.");
  }
}

export const researchQuestionSchema = text;

/** Sprint 2 interventions preserve the experimental input and measured output. */
export function eligiblePerturbationTargetIds(network: NetworkDefinition): string[] {
  validateSyntheticNetwork(network);
  return network.nodes
    .filter(({ id }) => id !== network.inputNodeId && id !== network.outputNodeId)
    .map(({ id }) => id);
}

export function experimentProposalSchema(network: NetworkDefinition) {
  const eligibleTargets = eligiblePerturbationTargetIds(network);
  return z.strictObject({
    id: text,
    hypothesis: text,
    stimulus: z.strictObject({ amplitude: z.number().min(0).max(1) }),
    seed: z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER),
    // A model-facing resource limit; Sprint 1 itself remains unchanged.
    maxSteps: z.number().int().min(0).max(1000),
    outputThreshold: z.number().gt(0).max(1),
    perturbation: z.strictObject({
      type: z.enum(["silence", "SILENCE"]),
      targetNodeId: z.enum(eligibleTargets),
    }),
  });
}

export type ExperimentProposal = z.infer<ReturnType<typeof experimentProposalSchema>>;

export function validateExperimentProposal(
  value: unknown,
  network: NetworkDefinition,
): { proposal: ExperimentProposal; spec: ExperimentSpec } {
  const proposal = experimentProposalSchema(network).parse(value);
  const spec: ExperimentSpec = {
    ...structuredClone(proposal),
    perturbation: { type: "silence", targetNodeId: proposal.perturbation.targetNodeId },
  };
  return freezeRecord({ proposal, spec });
}

export function scientificAnalysisSchema(network: NetworkDefinition) {
  const eligibleTargets = eligiblePerturbationTargetIds(network);
  return z.strictObject({
    observations: z.array(text).min(1).max(30),
    interpretation: text,
    limitations: z.array(text).min(1).max(30),
    confounders: z.array(text).max(30),
    supportsHypothesis: z.boolean().nullable(),
    nextExperiment: z.strictObject({
      rationale: text,
      researchQuestion: text,
      proposedPerturbationTarget: z.enum(eligibleTargets).optional(),
    }),
  });
}

export type ScientificAnalysis = z.infer<ReturnType<typeof scientificAnalysisSchema>>;

export function parseStructuredResponse(response: string): unknown {
  try {
    return JSON.parse(response) as unknown;
  } catch {
    throw new Error("Meta response must be a complete JSON object; no experiment or analysis accepted.");
  }
}

export function responseSchema(schema: z.ZodType): Record<string, unknown> {
  // Text refinements are also enforced locally; JSON mode alone is not validation.
  return z.toJSONSchema(schema);
}
