import type { AutonomyEvidence } from "./autonomy";
import type { BrainTransportEvidence } from "../sources/fruitfly-closed-loop";

/** Companion flight-recorder artifact. Browser-generated controller evidence is never
 * accepted as server-retained neural evidence or as approved experiment measurement. */
export interface AutonomyRecording {
  schemaVersion: "causalfly-autonomy-recorder-v1";
  trust: "CLIENT_GENERATED_EXPERIMENTAL_CONTROLLER";
  conditions: readonly AutonomyEvidence[];
  brainTransport: BrainTransportEvidence | null;
}
export function autonomyRecording(conditions: readonly AutonomyEvidence[], brainTransport: BrainTransportEvidence | null): AutonomyRecording {
  return structuredClone({ schemaVersion: "causalfly-autonomy-recorder-v1", trust: "CLIENT_GENERATED_EXPERIMENTAL_CONTROLLER", conditions, brainTransport });
}
