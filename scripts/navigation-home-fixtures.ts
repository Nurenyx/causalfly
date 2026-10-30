import { writeFileSync } from "node:fs";
import { runGuidedAction } from "../src/lib/web/guided-workflow";
import { FakeMetaClient } from "../src/lib/meta/fake-client";
async function main() {
  const fixtures = [];
  for (const amplitude of [.6, .4]) {
    const design = await runGuidedAction({ action: "design", researchQuestion: "Does silencing primary_a reduce output with a weaker input?", stimulusAmplitude: amplitude }, { createClient: () => new FakeMetaClient() });
    if (!design.ok) throw Error(design.error);
    const run = await runGuidedAction({ action: "run", id: design.design.id }, { createClient: () => new FakeMetaClient() });
    if (!run.ok) throw Error(run.error);
    fixtures.push({ amplitude, design, run });
  }
  writeFileSync("tmp/sprint10c2-fixtures.json", JSON.stringify(fixtures));
}
void main();
