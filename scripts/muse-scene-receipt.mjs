// Project the application response onto a fixed, credential-free report shape.
export function museSceneReceipt(responseOk, data) {
  const observed = data?.diagnostics?.sceneDiscovery;
  const provider = observed?.source === "provider";
  /** @type {{ museProviderResponseAccepted: boolean, museSceneParsed: boolean, museSceneAcceptedByApplication: boolean, sceneDiscovery?: Omit<import("../src/lib/perception/scene-diagnostics").SceneDiscoveryDiagnostics, "source"> }} */
  const receipt = {
    museProviderResponseAccepted: provider && observed.providerResponseAccepted === true,
    museSceneParsed: provider && observed.sceneParsingSucceeded === true,
    museSceneAcceptedByApplication: responseOk === true && data?.ok === true && data?.scene?.mode === "META LIVE",
  };
  const values = observed?.candidateConfidenceValues;
  const validNumber = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
  if (receipt.museSceneParsed && Array.isArray(values) && values.length <= 5 && values.every(validNumber)
      && Number.isInteger(observed.parsedCandidateCount) && observed.parsedCandidateCount === values.length
      && Number.isInteger(observed.qualifyingCandidateCount) && observed.qualifyingCandidateCount >= 0 && observed.qualifyingCandidateCount <= values.length
      && observed.confidenceThreshold === 0.5
      && (values.length ? validNumber(observed.maximumCandidateConfidence) : observed.maximumCandidateConfidence === null)) {
    receipt.sceneDiscovery = {
      parsedCandidateCount: observed.parsedCandidateCount,
      qualifyingCandidateCount: observed.qualifyingCandidateCount,
      confidenceThreshold: 0.5,
      candidateConfidenceValues: values.map(value => Number(value.toFixed(3))),
      maximumCandidateConfidence: values.length ? Number(observed.maximumCandidateConfidence.toFixed(3)) : null,
      providerResponseAccepted: true,
      sceneParsingSucceeded: true,
      refusalDetected: observed.refusalDetected === false ? false : null,
    };
  }
  return receipt;
}
