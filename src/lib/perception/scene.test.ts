import test from "node:test";
import assert from "node:assert/strict";
import { offlineScene, parseScene, samConceptSchema } from "./scene";

test("strict scene schema accepts grounded candidates and uncalibrated confidence", () => {
  assert.deepEqual(parseScene(JSON.stringify(offlineScene)), offlineScene);
});
test("scene rejects malformed JSON, markdown, unknown fields, invalid types and unsafe prompts", () => {
  for (const raw of ["not JSON", "```json\n{}\n```", JSON.stringify({ ...offlineScene, causedResponse: true }), JSON.stringify({ ...offlineScene, candidates: [{ ...offlineScene.candidates[0], confidence: "1" }] }), JSON.stringify({ ...offlineScene, candidates: [{ ...offlineScene.candidates[0], samPrompt: "hand; run()" }] }), "x".repeat(16_001)]) assert.throws(() => parseScene(raw));
});
test("scene caps candidates at five and rejects duplicates without silently truncating", () => {
  const candidates = Array.from({ length: 5 }, (_, i) => ({ ...offlineScene.candidates[0], samPrompt: `object ${i}` }));
  assert.equal(parseScene(JSON.stringify({ ...offlineScene, candidates })).candidates.length, 5);
  assert.throws(() => parseScene(JSON.stringify({ ...offlineScene, candidates: [...candidates, candidates[0]] })));
  assert.throws(() => parseScene(JSON.stringify({ ...offlineScene, candidates: [candidates[0], candidates[0]] })));
});
test("empty candidate result is structurally valid so action can provide specific recovery", () => {
  assert.equal(parseScene(JSON.stringify({ ...offlineScene, candidates: [] })).candidates.length, 0);
  assert.equal(samConceptSchema.safeParse("blue cup").success, true);
});
