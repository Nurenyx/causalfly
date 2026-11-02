import type { SceneUnderstanding } from "./scene";

/** Structural observations only: never copy concepts, summaries, reasons or provider envelopes. */
export interface SceneResponseReceipt {
  source: "provider" | "offline_fixture";
  providerResponseAccepted: boolean;
  sceneParsingSucceeded: boolean;
  refusalDetected: false | null;
}
export interface SceneDiscoveryDiagnostics extends SceneResponseReceipt {
  source: "provider" | "offline_fixture";
  parsedCandidateCount: number;
  qualifyingCandidateCount: number;
  confidenceThreshold: 0.5;
  candidateConfidenceValues: number[];
  maximumCandidateConfidence: number | null;
  providerResponseAccepted: boolean;
  sceneParsingSucceeded: true;
  refusalDetected: false | null;
}
export function sceneDiscoveryDiagnostics(result: SceneUnderstanding, live: boolean): SceneDiscoveryDiagnostics {
  const values = result.candidates.map(c => c.confidence);
  const rounded = (value: number) => Number(value.toFixed(3));
  return {
    source: live ? "provider" : "offline_fixture",
    parsedCandidateCount: values.length,
    qualifyingCandidateCount: values.filter(value => value >= 0.5).length,
    confidenceThreshold: 0.5,
    candidateConfidenceValues: values.map(rounded),
    maximumCandidateConfidence: values.length ? rounded(Math.max(...values)) : null,
    providerResponseAccepted: live,
    sceneParsingSucceeded: true,
    refusalDetected: live ? false : null,
  };
}
