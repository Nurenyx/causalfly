import type { GuidedDesign } from "./contracts";

/** Draft input is independent of ephemeral design IDs and panel navigation. */
export function stimulusDraft(design: GuidedDesign | undefined, syntheticAmplitude: number) {
  const amplitude = design?.perceptionInput?.measurement.amplitude ?? syntheticAmplitude;
  const stale = Boolean(design && !design.perceptionInput && design.spec.stimulus.amplitude !== amplitude);
  return { amplitude, stale, locked: Boolean(design?.perceptionInput) };
}
