import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { analyzeSamVideo } from "../src/lib/meta/sam-client";
import { inspectVideo, validateVideoFile } from "../src/lib/perception/media";

loadEnvConfig(process.cwd());
// Deliberately separate from npm test. One explicit, paid attempt; no automatic retries.
async function main() {
  if (process.argv[2] !== "--live") {
    console.error("Use npm run sam:smoke -- --live [clip.mp4] [concept]. One live sam-3.1 call; default media is a generated red-square calibration clip.");
    process.exitCode = 1;
  } else if (!process.env.META_API_KEY?.trim()) {
    console.log("SAM smoke skipped: no server META_API_KEY is configured.");
  } else {
    try {
      const path = process.argv[3] ?? "public/perception-calibration.mp4";
      const concept = process.argv[4] ?? "red square";
      const bytes = await readFile(path);
      const file = new File([bytes], /\.mov$/i.test(path) ? "stimulus.mov" : "stimulus.mp4", { type: /\.mov$/i.test(path) ? "video/quicktime" : "video/mp4" });
      validateVideoFile(file);
      const media = await inspectVideo(bytes);
      const result = await analyzeSamVideo(file, concept, media);
      console.log(JSON.stringify({ model: "sam-3.1", realDetectionReturned: true, trackedFrames: result.measurement.frames.length, stimulusAmplitude: result.measurement.amplitude, cleanup: result.provenance.cleanup }));
    } catch (error) {
      console.log(JSON.stringify({ model: "sam-3.1", realDetectionReturned: false, error: error instanceof Error ? error.message : "Smoke failed" }));
      process.exitCode = 1;
    }
  }
}
void main();
