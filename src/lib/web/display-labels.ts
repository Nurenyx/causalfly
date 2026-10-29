/** Display text only: the keys and scientific values remain unchanged. */
export const measurementLabels = {
  outputPeakActivity: { label: "Signal strength", technical: "Peak output · normalized activity at the output node" },
  outputThresholdCrossingStep: { label: "Response delay", technical: "Threshold crossing · first simulation step reaching the output threshold" },
  outcome: { label: "Target reached?", technical: "Outcome · output threshold reached within the observation window" },
} as const;

export function nodeLabel(id: string) {
  const names: Record<string, string> = { stimulus: "Input", primary_a: "Primary A", primary_b: "Primary B", alternate_a: "Alternate A", alternate_b: "Alternate B", alternate_c: "Alternate C", motor: "Output" };
  return names[id] ?? id;
}
