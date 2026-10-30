import assert from "node:assert/strict";
import test from "node:test";
import OpenAI from "openai";
import { z } from "zod";
import { LiveMetaClient } from "../meta/client";
import { MetaFailure, metaFailureCode } from "../meta/failure";
import { demoExperimentSpec } from "../experiment/demo";
import { runGuidedAction } from "./guided-workflow";
import { configuredClient, safeWebProviderError, getWebStatus } from "./workflow";
import { workspaceReducer } from "./dashboard";
import { POST } from "../../app/api/experiments/route";

const env = { CAUSALFLY_META_ENABLED: "1", META_API_KEY: "private-regression-key", META_BASE_URL: "https://meta-test.invalid/v1", META_MODEL: "muse-wonder-1.0" };
const question = { action: "design", researchQuestion: "Does silencing primary_a change synthetic output?" };
const completion = (content = JSON.stringify(demoExperimentSpec)) => new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content } }] }), { headers: { "Content-Type": "application/json" } });
const codeOf = (result: Awaited<ReturnType<typeof runGuidedAction>>) => !result.ok ? result.diagnostics?.events.filter(e => e.type === "error.recorded").at(-1)?.metadata.code : undefined;

test("configured enabled live design sends correct request and returns only an awaiting-approval design", async () => {
  let calls = 0;
  const client = new LiveMetaClient(env, async (url, options) => {
    calls++;
    assert.equal(String(url), "https://meta-test.invalid/v1/chat/completions");
    assert.equal(new Headers(options?.headers).get("authorization"), `Bearer ${env.META_API_KEY}`);
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, env.META_MODEL);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal(JSON.parse(body.messages[1].content).researchQuestion, question.researchQuestion);
    return completion();
  }, { retry: false });
  const result = await runGuidedAction(question, { env, createClient: () => client });
  assert.ok(result.ok);
  assert.equal(result.design.mode, "META LIVE");
  assert.equal(result.result, undefined);
  assert.equal(calls, 1);
  assert.ok(!result.design.diagnostics?.events.some(e => e.type === "experiment.approved"));
  assert.ok(!JSON.stringify(result).includes(env.META_API_KEY));
});

test("unset or disabled kill switch fails as configuration before provider work; explicit offline remains usable", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw Error("Network forbidden"); });
  for (const enabled of [undefined, "0"]) {
    const result = await runGuidedAction(question, { env: { ...env, CAUSALFLY_META_ENABLED: enabled } });
    assert.ok(!result.ok);
    assert.equal(result.kind, "configuration");
    assert.equal(codeOf(result), "CONFIGURATION_DISABLED");
    assert.match(result.error, /disabled/);
  }
  const offline = await runGuidedAction(question, { env: { ...env, CAUSALFLY_FAKE_META: "1" } });
  assert.ok(offline.ok);
  assert.equal(offline.design.mode, "FAKE META CLIENT");
  assert.equal(calls, 0);
  assert.equal(configuredClient({ ...env, CAUSALFLY_FAKE_META: "1" }).mode, "FAKE META CLIENT");
});

test("the actual route returns 503 for the previously misreported disabled-provider 502, and status agrees", async (t) => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, env);
    delete process.env.CAUSALFLY_META_ENABLED;
    delete process.env.CAUSALFLY_FAKE_META;
    t.mock.method(globalThis, "fetch", async () => { assert.fail("Disabled route must not contact provider"); });
    const status = getWebStatus();
    assert.equal(status.mode, null);
    assert.equal(status.metaDisabled, true);
    const response = await POST(new Request("http://localhost/api/experiments", { method: "POST", body: JSON.stringify(question) }));
    assert.equal(response.status, 503);
    assert.equal(codeOf(await response.json()), "CONFIGURATION_DISABLED");
  } finally {
    for (const key of [...Object.keys(env), "CAUSALFLY_FAKE_META"]) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
});

test("provider HTTP failures have safe distinct classes without response bodies or credentials", async () => {
  for (const [status, expected] of [[401, "AUTHENTICATION_FAILED"], [403, "AUTHENTICATION_FAILED"], [429, "PROVIDER_RATE_LIMIT"], [503, "PROVIDER_HTTP_ERROR"]] as const) {
    let calls = 0;
    const client = new LiveMetaClient(env, async () => { calls++; return new Response(JSON.stringify({error:{message:env.META_API_KEY}}), {status}); }, {retry:false});
    const result = await runGuidedAction(question, {env, createClient:()=>client});
    assert.equal(codeOf(result), expected);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes(env.META_API_KEY));
  }
});

test("malformed envelopes, malformed JSON and schema-invalid designs are rejected without weakening validation", async () => {
  for (const [response, expected] of [[new Response('{}', {headers:{'Content-Type':'application/json'}}), "INVALID_PROVIDER_RESPONSE"], [completion('not json'), "INVALID_PROVIDER_RESPONSE"], [completion(JSON.stringify({...demoExperimentSpec, perturbation:{type:'silence',targetNodeId:'motor'}})), "SCHEMA_VALIDATION_FAILED"]] as const) {
    const result = await runGuidedAction(question, {env, createClient:()=>new LiveMetaClient(env,async()=>response,{retry:false})});
    assert.ok(!result.ok);
    assert.equal(codeOf(result), expected);
    assert.equal(result.kind, "provider");
    assert.ok(!JSON.stringify(result).includes(env.META_API_KEY));
  }
});

test("timeouts, cancellations, schema failures and unknown exceptions have stable safe classes", () => {
  const cases: [unknown,string][] = [[new OpenAI.APIConnectionTimeoutError(), "PROVIDER_TIMEOUT"], [new OpenAI.APIUserAbortError(), "REQUEST_CANCELLED"], [new z.ZodError([]), "SCHEMA_VALIDATION_FAILED"], [new SyntaxError(env.META_API_KEY), "INVALID_PROVIDER_RESPONSE"], [new Error(env.META_API_KEY), "UNKNOWN_PROVIDER_ERROR"], [new MetaFailure("CONFIGURATION_DISABLED", "disabled"), "CONFIGURATION_DISABLED"]];
  for (const [error,code] of cases) {
    assert.equal(metaFailureCode(error),code);
    assert.ok(!safeWebProviderError(error).includes(env.META_API_KEY));
  }
});


test("a delayed validated design cannot overwrite a newer investigation", async () => {
  const client = new LiveMetaClient(env, async () => completion(), {retry:false});
  const requestState = workspaceReducer({workspace:"observatory",question:question.researchQuestion,result:null,investigationId:10}, {type:"begin",question:question.researchQuestion});
  const response = await runGuidedAction(question, {env,createClient:()=>client});
  assert.ok(response.ok);
  const newer = workspaceReducer(requestState, {type:"begin",question:"A different new question"});
  assert.equal(workspaceReducer(newer, {type:"designed",design:response.design,investigationId:requestState.investigationId}),newer);
  assert.equal(newer.design,undefined);
  assert.equal(newer.result,null);
});
