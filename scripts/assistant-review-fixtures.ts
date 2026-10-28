/** Offline review only. Replay genuine recorded frames; never inject these into the product runtime. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { FakeMetaClient } from "../src/lib/meta/fake-client";
import { openRetention, retainSnapshot } from "../src/lib/sources/retained-evidence";
import type { FruitFlyEvidence, FruitFlySnapshot } from "../src/lib/sources/contracts";
import { runWebObservation } from "../src/lib/web/observational-workflow";

async function main() {
  const evidence = JSON.parse(await readFile("docs/review/sprint-6b/recorded-evidence.json", "utf8")) as FruitFlyEvidence[];
  const retentionId = openRetention();
  const snapshots: FruitFlySnapshot[] = evidence.map(frame => ({ source: "FRUITFLY_XR", state: "DATA RECEIVED", message: "Recorded simulation evidence replay · offline browser review", evidence: frame, retentionId }));
  for (const snapshot of snapshots) retainSnapshot(retentionId, snapshot);
  const questions = ["Which received frame showed the largest spike-event count?", "What changed before the decoder entered ESCAPE?"];
  const responses: Record<string, unknown> = {};
  for (const researchQuestion of questions) {
    const result = await runWebObservation({ researchQuestion, retentionId, sessionId: evidence.at(-1)!.telemetry.sessionId, sequences: evidence.map(f => f.telemetry.sequence) }, { createClient: () => new FakeMetaClient() });
    if (!result.ok) throw new Error("Unable to prepare offline review response");
    responses[researchQuestion] = result;
  }
  await mkdir("tmp/sprint-6b", { recursive: true });
  await writeFile("tmp/sprint-6b/browser-fixtures.json", JSON.stringify({ snapshots, responses }));
  console.log(`Prepared ${evidence.length} genuine recorded frames and ${questions.length} validated fake-client responses. No provider requests.`);
}
void main();
