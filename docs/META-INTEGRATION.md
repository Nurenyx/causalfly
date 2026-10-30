# Meta runtime integration (Sprint 6A)

## Sprint 10C: explicit scene understanding

`META_SCENE_MODEL=muse-spark-1.3` independently configures scene discovery;
`META_MODEL` retains the existing Muse Wonder design/interpretation model. Both
reuse the server-only key and official `https://api.meta.ai/v1` base URL.
There is no implicit scene model default or automatic paid request.

Choose a video → **Discover with Meta** → choose a candidate → **Track [concept]
with SAM 3.1** → accept the deterministically derived stimulus → design → approve
and run → request interpretation. Manual concepts remain available. File selection,
candidate arrival, and radio selection never start either provider automatically.

`POST /api/perception/scene` takes multipart `video`, `mode=live|fixture`, and a UUID
`X-Scene-Request`. After bounded upload/container validation it sends the original
short video using Files `purpose=user_data` and Responses `input_file.file_id`.
The model receives a strict `text.format` JSON schema; independent local strict
validation rejects malformed, truncated, refused, wrongly typed or extra-field
output. Up to five unique candidates carry `label`, `samPrompt`, `reason`, and
numeric `confidence` in [0,1], alongside `summary` and `limitations`. Confidence is
uncalibrated; candidates below 0.5 are withheld. Zero useful candidates is a
recoverable result, never permission to track an invented object.

Scene records are immutable, capped at 100, retained for two hours, and bound to
the SHA-256 of the uploaded video. SAM checks the selected index against that
record and passes exactly its validated `samPrompt`; manual override is separately
recorded. Restarts/expiry require rediscovery or manual entry. SAM receipts,
tracking/player, feature extraction and stimulus mapping remain intact.

One explicit request makes one model attempt; no SDK retries or fake fallback.
Uploads are deleted on success/failure with a one-hour expiry backstop. Diagnostics
retain allowlisted attribution, confirmed concept, IDs, and measurement events;
they omit video bytes, filenames, masks, prompts and raw provider output/errors.
The scene/selection ledger continues into design, engine measurement and interpretation.

**OFFLINE SCENE-UNDERSTANDING FIXTURE** is a separate explicit operation for the
exact calibration clip bytes. It returns only the visible red square; it never
claims a live Muse response. The independent offline SAM geometry fixture remains
clearly labelled and is not overlaid on user media. `CAUSALFLY_FAKE_META=1` controls
experiment templates; it does not silently convert live discovery or tracking.

`npm run meta:scene-smoke` is a manual, one-attempt calibration smoke command, never
part of the automated suite. It writes only model, success, latency and candidate
labels to `docs/review/sprint-10c/live-smoke.json` when configured. Do not repeatedly
run it to spend credits. Full sprint evidence and limitations are in the
[Sprint 10C review](SPRINT_10C_META_PERCEPTION_ORCHESTRATION_REVIEW.md).

API contracts verified against official [models](https://dev.meta.ai/docs/models),
[video input](https://dev.meta.ai/docs/video-understanding),
[Responses compatibility](https://dev.meta.ai/docs/protocols/responses), and
[structured-output cookbook](https://dev.meta.ai/docs/cookbook/structured-output).

Use Node.js 22 or newer, as required by the official OpenAI SDK.

The synthetic CLI and web workflow design an experiment from a research question, validate its
specification, executes the deterministic Sprint 1 engine, and interprets the
measured comparison as a separate ScientificAnalysis artifact. The web app exposes
this loop at `POST /api/experiments`. FruitFly XR has a separate, explicit
`POST /api/sources/fruitfly/analyze` observational interpreter described below.

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

The web runtime uses the same factory: `CAUSALFLY_FAKE_META=1` explicitly selects
offline templates; otherwise complete configuration selects **META LIVE**. No
provider SDK, key, endpoint, authorization header, hidden prompt or raw provider
error enters browser contracts. Only the mode is exposed; model names are not
guessed. The UI uses **META MUSE / LIVE AI ANALYSIS** only for accepted live results.

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

## FruitFly observational scientist

1. An explicit Connect action opens the existing read-only research bridge.
2. After protocol/source validation, the server retains a frozen history of up to
   120 frames under an opaque random reference. The browser receives that reference
   with telemetry; switching sources or disconnecting preserves received evidence.
3. Submitting the exact question runs the pure local observational answer and opens
   AI Scientist. This performs no provider IO.
4. Only **ANALYZE WITH META** posts the question, reference, session ID and the
   exact browser-retained sequence IDs. Browser-supplied measurements are rejected.
5. The server selects those frames from retention, runs the local answer again,
   constructs a deeply frozen compact bundle and registers it in an in-process
   evidence gate. Missing/expired references fail before constructing a Meta client.
6. `interpretObservationalEvidence` calls the existing client once with task
   `observe`. The response passes JSON parsing, strict Zod validation, exact-question
   equality and a conservative sufficiency check before it is returned separately.

No Meta request occurs on load, navigation, source switch, connection, telemetry
arrival or question submission. The event handler blocks concurrent duplicate clicks.
Retry is explicit. Existing transport retries remain bounded to transient failures
(at most three attempts per completion); no fake fallback exists.

### Evidence sent to Meta

| Field group | Content |
| --- | --- |
| Question/window | Exact question, source, session ID, capture time, retained frame count |
| Source provenance | Published dataset/hash/counts, simulated dynamics, generator, transport, `experimentalRecording: false` |
| Per received frame | Receipt time, sequence, simulation tick, model time, supplied simulated spike-event and active-neuron counts |
| Decoder/input | Supplied decoder states/channel values, input-reference IDs and freshness; received state/reference transitions |
| Diagnostics | Display event count/truncation, producer display/subscriber drop counters, current server stream state and historical status |
| Local derivation | Deterministic answer, intent, sufficiency, facts, missing evidence, exact session/sequence window |

The bundle omits raw WebSocket objects, spike-ID arrays, soma coordinates, anatomical
edges, inferred neuron/population identities, stimulus contents and unsupported XR
movement. No secrets or credentials are supplied. Model time is simulation time;
counts are not Hz or living-fly measurements. Active counts can include nonspiking
neurons. Decoder values are simulated outputs, not physical movement evidence.

### Strict observational response

Required fields: `exactQuestion`, `evidenceSufficiency` (`SUFFICIENT`, `PARTIAL`,
`INSUFFICIENT`), nonempty `observations[]`, `interpretation`, nonempty `limitations[]`,
`potentialConfounders[]`, `nextExperiment: { title, rationale, requiredEvidence[] }`
and literal `causalClaimAllowed: false`. All objects reject extra fields. Text is
nonblank and bounded; lists are bounded. Malformed, missing, empty, incomplete,
refused or truncated responses fail without repair. A changed exact question fails.
When the local answer is insufficient, Meta cannot upgrade its sufficiency.

Instructions distinguish observations from interpretation, require simulated
dynamics over published structure, prohibit biological validation and causal-effect
claims, and label recommendations as proposed tests. Schema validation does not
prove free-text scientific correctness; the measured/local evidence remains visible
beside the separate AI interpretation for review.

The UI identifies the frozen analysis question and frame window even if newer
telemetry or another question becomes available. Local analysis remains accessible
and separate. Errors use fixed public messages with an explicit Retry action.

### Retention limits

This local-demo store is process-local: 120 frames per subscription, up to 32
subscriptions, one-hour inactivity expiry, oldest-created eviction at capacity.
Restart, expiry, eviction, a new external session or a rolling-window overrun can
invalidate a reference. The server rejects it rather than trusting client evidence.
The random reference is a capability for this unauthenticated local app, not a user
identity or durable audit signature. Multi-process/serverless deployment needs a
shared store and ownership/authentication. CausalFly never sends an XR intervention.

## Current scope and verification

The experiment-design Meta layer accepts only the unchanged `synthetic-two-pathway-v1` fixture,
including nodes, edges, weights and provenance. Its nodes have no biological
identities. The separate FruitFly path accepts validated retained observational
simulation telemetry; it does not supply controlled trials or biological validation.
Neither path provides authentication or durable persistence.

`npm test` runs Sprint 1 and Meta tests with no API credentials or network access.
SDK tests inject an in-memory fetch implementation. The test and AI-demo scripts
use Node's `--conditions=react-server` so the `server-only` marker works in the
standalone CLI context; no browser bundling is involved. All six acceptance gates:

```sh
npm test
npm run experiment:demo
npm run experiment:ai-demo -- --fake
npm run lint
npm run build
git diff --check
```

The default fake demo silences `primary_a`: control peak 1 / crossing step 3,
perturbed peak 0.5 / crossing step 4, peak delta -0.5 / crossing-step delta +1,
with both threshold outcomes reached. The fake scientist labels these as synthetic
observations, discloses its template limitations, and suggests silencing the
eligible internal `primary_b` node while keeping other parameters matched.

Sprint 6A adds offline compaction, strict observational parsing, false-only causal
flag, insufficiency, retention/provenance, exact-question, no-fallback, sanitized
error, no-automatic-request and explicit-action tests. SDK transports are injected.
See [Sprint 6 runtime review](SPRINT_6_META_RUNTIME_REVIEW.md) for gate counts,
controlled live acceptance, screenshots and remaining limitations.
