import assert from "node:assert/strict";
import test from "node:test";
import { workspaceReducer, type WorkspaceState } from "./dashboard";
import { runWebExperiment } from "./workflow";
import { FakeMetaClient } from "../meta/fake-client";
import { syntheticAssistantAnswer } from "./assistant";

test("new question archives immutable comparison, releases approval and interpretation, and rejects late responses", async () => {
  const response = await runWebExperiment({ researchQuestion: "Prior question" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  const result = response.result;
  const before = JSON.stringify(result);
  const state: WorkspaceState = { workspace: "observatory", question: result.researchQuestion, result, investigationId: 4 };
  const next = workspaceReducer(state, { type: "question", question: "A new question" });
  assert.equal(next.result, null);
  assert.equal(next.design, undefined);
  assert.equal(next.history?.[0].result, result);
  assert.equal(next.history?.[0].investigationId, 4);
  assert.equal(next.investigationId, 5);
  assert.equal(JSON.stringify(result), before);
  assert.equal(workspaceReducer(next, { type: "interpreted", result, investigationId: 4 }), next);
  assert.equal(workspaceReducer(next, { type: "completed", result, investigationId: 4 }), next);
  const answer = syntheticAssistantAnswer("What changed under intervention?", next.result);
  assert.match(answer.summary, /not been tested yet/);
  assert.deepEqual(answer.facts, []);
});

test("resubmitting the same question creates a fresh investigation and continuation preserves its parent design", async () => {
  const response = await runWebExperiment({ researchQuestion: "Prior question" }, { env: {}, createClient: () => new FakeMetaClient() });
  assert.ok(response.ok);
  const design = { id: "parent-design", researchQuestion: response.result.researchQuestion, spec: response.result.spec, mode: response.result.mode, runtimeCalls: [] };
  const state: WorkspaceState = { workspace: "scientist", question: response.result.researchQuestion, design, result: response.result, investigationId: 2 };
  const next = workspaceReducer(state, { type: "next-question", question: response.result.analysis.nextExperiment.researchQuestion });
  assert.equal(next.nextFromId, design.id);
  assert.equal(next.result, null);
  assert.equal(next.history?.[0].design, design);
  const submitted = workspaceReducer(next, { type: "begin", question: next.question });
  assert.equal(submitted.investigationId, 4);
  assert.equal(submitted.result, null);
  assert.equal(submitted.nextFromId, design.id);
  const retried = workspaceReducer(submitted, { type: "begin", question: submitted.question });
  assert.equal(retried.nextFromId, design.id);
  assert.equal(submitted.history?.length, 1);
});
