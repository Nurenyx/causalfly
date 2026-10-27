import { demoExperimentSpec } from "../experiment/demo";
import type { MetaClient, MetaRequest } from "./client";
import type { CompactEvidencePayload } from "./compact-evidence";
import { eligiblePerturbationTargetIds, type ScientificAnalysis } from "./schemas";

/** Offline template client, not a model and not a general natural-language reasoner. */
export class FakeMetaClient implements MetaClient {
  readonly mode = "FAKE META CLIENT" as const;

  async complete(request: MetaRequest): Promise<string> {
    if (request.task === "design") {
      return JSON.stringify(demoExperimentSpec);
    }
    const evidence = JSON.parse(request.inputJson) as CompactEvidencePayload;
    const { control, perturbed, deltas } = evidence.comparison;
    const eligibleTargets = eligiblePerturbationTargetIds(evidence.provenance.control.network);
    const nextTarget = eligibleTargets.find(
      (id) => id !== evidence.experimentSpec.perturbation.targetNodeId,
    ) ?? eligibleTargets[0];
    const analysis: ScientificAnalysis = {
      observations: [
        `Control output peak: ${control.outputPeakActivity}; perturbed output peak: ${perturbed.outputPeakActivity}.`,
        `Control threshold crossing step: ${control.outputThresholdCrossingStep ?? "not reached"}; perturbed threshold crossing step: ${perturbed.outputThresholdCrossingStep ?? "not reached"}.`,
        `Perturbed minus control peak: ${deltas.outputPeakActivity}; crossing-step delta: ${deltas.outputThresholdCrossingSteps ?? "not comparable"}; outcome changed: ${deltas.outcomeChanged}.`,
      ],
      interpretation: "Offline template: the measured differences describe this synthetic fixture under the declared silence intervention. This fake client does not evaluate arbitrary research questions or biological hypotheses.",
      limitations: [
        "Hand-authored synthetic network; no biological or Drosophila validity.",
        "Deterministic synchronous propagation and a finite observation window; no biological time or noise.",
        "Fake template output, not a real Meta model response; hypothesis support is unassessed.",
      ],
      confounders: ["Threshold and observation window influence the reported crossing metric; matched conditions are recorded in the evidence."],
      supportsHypothesis: null,
      nextExperiment: {
        rationale: "Use another eligible internal node as a synthetic intervention check, keeping other parameters matched.",
        researchQuestion: `How does silencing ${nextTarget} change output in the same synthetic fixture?`,
        proposedPerturbationTarget: nextTarget,
      },
    };
    return JSON.stringify(analysis);
  }
}
