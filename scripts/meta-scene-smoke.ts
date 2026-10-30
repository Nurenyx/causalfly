import { readFile, writeFile } from "node:fs/promises";
import { loadProjectEnvironment } from "./load-environment";
import { discoverScene, sceneConfiguration } from "../src/lib/meta/scene-client";
import { parseScene } from "../src/lib/perception/scene";

async function main() {
  loadProjectEnvironment();
  let config;
  try { config = sceneConfiguration(); }
  catch { console.log("SKIPPED: complete META_SCENE_MODEL / META_API_KEY / META_BASE_URL configuration unavailable. Zero live calls."); return; }
  const started = performance.now();
  let report;
  try {
    const file = new File([await readFile("public/perception-calibration.mp4")], "stimulus.mp4", { type: "video/mp4" });
    const result = parseScene(await discoverScene(file));
    report = { model: config.model, validStructuredCandidates: result.candidates.length > 0, latencyMs: Math.round(performance.now() - started), candidateLabels: result.candidates.map(c => c.label), attempts: 1 };
  } catch { report = { model: config.model, validStructuredCandidates: false, latencyMs: Math.round(performance.now() - started), attempts: 1, failure: "Provider unavailable or invalid structured result. No retry performed." }; process.exitCode = 1; }
  await writeFile("docs/review/sprint-10c/live-smoke.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
void main();
