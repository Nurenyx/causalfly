import { z } from "zod";

export const smokeResponseSchema = z.strictObject({ status: z.literal("ok") });

export function validateSmokeResponse(raw: string): { status: "ok" } {
  try {
    return smokeResponseSchema.parse(JSON.parse(raw));
  } catch {
    // Never include raw model output or parser diagnostics in CLI errors.
    throw new Error('Meta smoke response must be exactly {"status":"ok"}.');
  }
}
