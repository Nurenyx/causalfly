import type { DataSourceKind } from "@/lib/sources/contracts";

export type InstrumentMode = "observe" | "perturb" | "compare";

export interface CapabilityReason {
  supported: boolean;
  reason?: string;
  fallbackActionLabel?: string;
  targetMode?: InstrumentMode;
}

/**
 * Checks whether an instrument mode is supported for a given data source.
 *
 * Rules:
 * - SYNTHETIC_FIXTURE:
 *   - Observe: fully supported
 *   - Perturb: supported (Meta design, amplitude, silencing)
 *   - Compare: supported for valid matched experiments (if no result yet, informs user)
 *
 * - FRUITFLY_XR (Live Connectome Simulation):
 *   - Observe: fully supported (telemetry, spikes, somas)
 *   - Perturb: NOT supported for arbitrary neural perturbation
 *   - Compare: NOT supported for matched neural perturbation
 */
export function checkModeCapability(mode: InstrumentMode, source: DataSourceKind, hasResult: boolean = false): CapabilityReason {
  if (source === "FRUITFLY_XR") {
    if (mode === "perturb") {
      return {
        supported: false,
        reason: "Arbitrary neural perturbation is not supported for Live Connectome Simulation. Current source supports observation and experimental sensory proxy only.",
        fallbackActionLabel: "Switch to Synthetic Fixture",
      };
    }
    if (mode === "compare") {
      return {
        supported: false,
        reason: "Matched intervention comparison requires controlled perturbation trials. Live Connectome Simulation does not support arbitrary neural intervention.",
        fallbackActionLabel: "Switch to Synthetic Fixture",
      };
    }
    return { supported: true };
  }

  // SYNTHETIC_FIXTURE
  if (mode === "compare" && !hasResult) {
    return {
      supported: true,
      reason: "No completed experiment result yet. Compare mode will display requirements or previous trial records.",
    };
  }

  return { supported: true };
}
