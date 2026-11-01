import type { DataSourceKind } from "@/lib/sources/contracts";

export type InstrumentMode = "observe" | "perturb" | "compare";

export interface CapabilityReason {
  supported: boolean;
  available?: boolean;
  reason?: string;
  fallbackActionLabel?: string;
  targetMode?: InstrumentMode;
}

/**
 * Checks whether an instrument mode is supported and available for a given data source and state.
 *
 * Rules:
 * - SYNTHETIC_FIXTURE:
 *   - Observe: fully supported and available
 *   - Perturb: supported and available (Meta design, amplitude, silencing)
 *   - Compare: supported for valid matched experiments (unavailable until matched runs complete)
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
        available: false,
        reason: "Arbitrary neural perturbation is not supported for Live Connectome Simulation. Current source supports observation and experimental sensory proxy only.",
        fallbackActionLabel: "Switch to Synthetic Fixture",
      };
    }
    if (mode === "compare") {
      return {
        supported: false,
        available: false,
        reason: "Matched intervention comparison requires controlled perturbation trials. Live Connectome Simulation does not support arbitrary neural intervention.",
        fallbackActionLabel: "Switch to Synthetic Fixture",
      };
    }
    return { supported: true, available: true };
  }

  // SYNTHETIC_FIXTURE
  if (mode === "compare" && !hasResult) {
    return {
      supported: true,
      available: false,
      reason: "Available after matched runs complete.",
    };
  }

  return { supported: true, available: true };
}
