# Meta integration (Sprint 2)

Use Node.js 22 or newer, as required by the official OpenAI SDK.

The CLI workflow designs an experiment from a research question, validates its
specification, executes the deterministic Sprint 1 engine, and interprets the
measured comparison as a separate ScientificAnalysis artifact. No UI or API route
has been added.

## Configuration and modes

Live mode uses the official `openai` JavaScript/TypeScript SDK with an
OpenAI-compatible Meta Model API. There is no endpoint or model default. Set all
three variables in `.env.local` or the **server or shell environment**:

| Variable | Purpose |
| --- | --- |
| `META_API_KEY` | Secret Meta API credential |
| `META_BASE_URL` | HTTPS OpenAI-compatible API base URL supplied by your provider |
| `META_MODEL` | Model identifier available to your Meta account |
| `META_TIMEOUT_MS` | Optional timeout per attempt in milliseconds; defaults to `120000` |

No real credentials are included. The AI demo and smoke-test CLIs use a shared
Next.js environment loader to load project environment files, including
`.env.local`, while preserving existing shell variables. Never prefix these variables with
`NEXT_PUBLIC_`, expose them through component props, or include them in browser
code. `client.ts` imports `server-only`, so Next.js rejects importing it into
Client Components. The SDK's browser credential protection remains enabled.

```sh
npm run experiment:ai-demo
npm run experiment:ai-demo -- --fake
npm run experiment:ai-demo -- --live
```

- Default (`auto`): no Meta variables set means **FAKE META CLIENT**. If any are
  set, complete live configuration is required; partial configuration fails with
  the missing variable names instead of silently using fake output.
- `--fake`: always **FAKE META CLIENT**, ignoring credentials. No network calls.
- `--live`: always **META LIVE**; missing or blank configuration fails before a
  request. Request failures never fall back to fake responses.

The CLI prints its mode before the workflow. Fake output explicitly describes
itself as an offline template and never claims to be a Meta model response. Its
designer always returns the fixed demo specification, regardless of the question;
the fake interpreter derives observation strings from the actual supplied values
and leaves hypothesis support `null`.

The SDK uses Chat Completions JSON mode and includes the response JSON Schema in
the system prompt. Local Zod validation is authoritative: JSON mode alone does not
enforce schema correctness. Refused, truncated, empty, malformed, wrongly typed,
or unknown-field responses fail safely. No coercion, JSON repair, or markdown
extraction is performed. Requests default to a 120-second timeout per attempt,
configurable with `META_TIMEOUT_MS` (a positive integer, at most `2147483647`).
The AI workflow makes at most three attempts per model request: only connection
timeouts/errors, HTTP 429 and HTTP 500-599 are retried, with exponential backoff
(500 ms, then 1000 ms) plus 0-99 ms of jitter. Other HTTP errors, aborted requests,
and response/schema validation failures are not retried. SDK retries are disabled
so they cannot add attempts or broaden this policy. Retry output contains only
the transient failure category and retry count; final failures retain the original
SDK exception and safe provider diagnostics. The smoke command uses the same
timeout configuration but makes exactly one attempt, without retries.

The AI-demo CLI reports `META DESIGN REQUEST`, `DETERMINISTIC EXPERIMENT`, and
`META INTERPRETATION REQUEST` as they begin, and identifies the stage if it fails.
API failure diagnostics omit provider error bodies and credentials.

Provider compatibility with Chat Completions and `response_format: json_object`
must be verified for your configured endpoint and model. Live provider access is
not exercised by the offline acceptance suite. See the official
[SDK documentation](https://github.com/openai/openai-node) and
[JSON mode documentation](https://developers.openai.com/api/docs/guides/structured-outputs#json-mode).

## Deterministic trust boundary

`MetaClient.complete` accepts a task, system instructions, serialized input and
response schema, and returns raw JSON text. `LiveMetaClient` and `FakeMetaClient`
implement the same interface; tests inject canned responses and SDK transports.

`designExperiment` accepts `{ researchQuestion, networkDefinition }`. It snapshots
the input, validates the question and supported network, and parses the response
with a strict schema. The proposal is narrowly compatible with ExperimentSpec:
`SILENCE` and `silence` are allowed and converted to Sprint 1's `silence` only after
validation. Numeric values must be valid, with safe integer seeds and at most
1000 transitions. Extra fields and ineligible targets are rejected explicitly.
Only existing internal nodes are eligible; the declared input/stimulus and
output/motor nodes are excluded. Both Meta prompts receive the explicit
`eligiblePerturbationTargetIds` list, also used by validation and FakeMetaClient.
The fake client's follow-up selects a different eligible node when one exists. The returned
`{ proposal, spec }` is deeply frozen. The engine still validates its inputs.

`createEvidencePayload` accepts the original question, accepted spec and network.
It revalidates the spec, runs the engine, and creates a deeply frozen record with:

- The research question and accepted ExperimentSpec.
- Both complete TrialResults, including activity traces and numeric measurements.
- Measured deltas and matched-condition checks from ExperimentComparison.
- Complete engine, network, experiment and condition provenance.

Only payloads issued by this factory in the current process pass the interpreter
gate. Arbitrary or deserialized records are rejected; regenerate them through the
engine. This is an in-process boundary, not an external signature or audit store.

`createCompactEvidence` derives a frozen downstream view without changing either
full TrialResult. It retains every sample containing any non-zero node activity
(with exact values and original step indices), followed by the first recorded
zero-only sample after the last active step, if available. An entirely quiescent
trial retains its initial sample. No quiescent sample is invented if the window
ends while activity is present. Additional zero-only samples are omitted.
Each summary records the original `maxSteps`, original sample count, omitted
zero-sample count and selection rule. Metrics, deltas, accepted spec, declared
and applied perturbations, and complete matched-condition provenance are copied
from the original evidence. No metrics are recomputed from the selected samples.

`interpretEvidence` sends only this compact view to the client after the existing
engine-evidence gate. It validates and freezes the separate ScientificAnalysis result. `runAiExperiment`
returns `{ mode, proposal, spec, evidence, analysis }`. The original evidence is
preserved independently; model content is never merged into TrialResult,
ExperimentComparison, or provenance, and cannot modify their values.

The AI demo prints the proposal, compact control and perturbed summaries,
deltas with matched-condition provenance, and analysis. Use
`npm run experiment:ai-demo -- --raw` to additionally print both full raw
TrialResults (or `--fake --raw` for offline debugging). `result.evidence.comparison`
always retains the full activity traces in code. The Sprint 1 engine and demo
are unchanged.

ScientificAnalysis has observations, interpretation, limitations, confounders,
nullable boolean hypothesis support and a next-experiment recommendation. An
optional next target must be an eligible internal node. Instructions require exact supplied
measurements, limitations, no biological claims, and silence-only follow-ups.
Free-text correctness cannot be guaranteed by structural validation. Review
analysis against evidence; recommendations are not automatically executed.

## Current scope and verification

The Meta layer accepts only the unchanged `synthetic-two-pathway-v1` fixture,
including nodes, edges, weights and provenance. Its nodes have no biological
identities. No Drosophila dataset, connectome validity, real-time integration,
authentication or persistence is provided.

`npm test` runs Sprint 1 and Meta tests with no API credentials or network access.
SDK tests inject an in-memory fetch implementation. The test and AI-demo scripts
use Node's `--conditions=react-server` so the `server-only` marker works in the
standalone CLI context; no browser bundling is involved. All six acceptance gates:

```sh
npm test
npm run experiment:demo
npm run experiment:ai-demo
npm run lint
npm run build
git diff --check
```

The default fake demo silences `primary_a`: control peak 1 / crossing step 3,
perturbed peak 0.5 / crossing step 4, peak delta -0.5 / crossing-step delta +1,
with both threshold outcomes reached. The fake scientist labels these as synthetic
observations, discloses its template limitations, and suggests silencing the
existing `stimulus` node while keeping other parameters matched.
