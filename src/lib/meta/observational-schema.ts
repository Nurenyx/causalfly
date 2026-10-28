import { z } from "zod";

const text = z.string().min(1).max(8000).refine(s => s.trim().length > 0);
export const observationalResponseSchema = z.strictObject({
  exactQuestion: text,
  evidenceSufficiency: z.enum(["SUFFICIENT", "PARTIAL", "INSUFFICIENT"]),
  observations: z.array(text).min(1).max(12),
  interpretation: text,
  limitations: z.array(text).min(1).max(12),
  potentialConfounders: z.array(text).max(12),
  nextExperiment: z.strictObject({ title: text, rationale: text, requiredEvidence: z.array(text).min(1).max(12) }),
  causalClaimAllowed: z.literal(false),
});
export type ObservationalResponse = z.infer<typeof observationalResponseSchema>;
