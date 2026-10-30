import { z } from "zod";
import type { RunDiagnostics } from "../web/flight-recorder-types";

export const samConceptSchema = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{N} '-]+$/u);
const text = z.string().trim().min(1).max(400);
export const sceneSchema = z.strictObject({
  summary: text,
  candidates: z.array(z.strictObject({
    label: z.string().trim().min(1).max(80),
    samPrompt: samConceptSchema,
    reason: text,
    confidence: z.number().finite().min(0).max(1),
  })).max(5),
  limitations: z.array(text).min(1).max(5),
});
export type SceneUnderstanding = z.infer<typeof sceneSchema>;
export function parseScene(raw: string): SceneUnderstanding {
  if (raw.length > 16_000) throw new Error("Malformed scene response");
  const scene = sceneSchema.parse(JSON.parse(raw));
  if (new Set(scene.candidates.map(c => c.samPrompt.toLowerCase())).size !== scene.candidates.length) throw new Error("Duplicate concepts");
  return scene;
}
export interface SceneRecord {
  id: string; run_id: string; provider: "Meta" | "CausalFly fixture"; model: string;
  mode: "META LIVE" | "OFFLINE SCENE-UNDERSTANDING FIXTURE";
  mediaSha256: string; result: SceneUnderstanding;
}
export interface SceneProvenance {
  id: string; provider: SceneRecord["provider"]; model: string; mode: SceneRecord["mode"];
  selection: "candidate" | "manual"; selectedConcept: string;
}
export type SceneResponse = { ok: true; scene: SceneRecord; diagnostics: RunDiagnostics } |
  { ok: false; error: string; kind: "configuration" | "provider" | "malformed" | "no_candidates" | "media" | "request"; diagnostics?: RunDiagnostics };
export const offlineScene: SceneUnderstanding = {
  summary: "Calibration fixture: a red square grows against a dark background.",
  candidates: [{ label: "red square", samPrompt: "red square", reason: "Its apparent size increases across the calibration clip.", confidence: 1 }],
  limitations: ["Authored offline fixture, not a live Meta response or calibrated confidence.", "Visual expansion is a proxy, not biological evidence."],
};
