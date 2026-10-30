import "server-only";
import { freezeRecord } from "../experiment/engine";
import type { SceneRecord } from "./scene";

const scope = globalThis as typeof globalThis & { __causalflyScenes?: Map<string, { scene: SceneRecord; expires: number }> };
const records = scope.__causalflyScenes ??= new Map();
export function retainScene(scene: SceneRecord): SceneRecord {
  for (const [id, entry] of records) if (entry.expires < Date.now()) records.delete(id);
  if (records.size >= 100) records.delete(records.keys().next().value!);
  const frozen = freezeRecord(structuredClone(scene));
  records.set(scene.id, { scene: frozen, expires: Date.now() + 2 * 60 * 60 * 1000 });
  return frozen;
}
export function retainedScene(id: string): SceneRecord | undefined {
  const entry = records.get(id);
  if (!entry || entry.expires < Date.now()) { records.delete(id); return; }
  return entry.scene;
}
