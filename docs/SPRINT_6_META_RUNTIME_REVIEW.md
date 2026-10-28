# Sprint 6A — Real Meta scientist runtime

Completed October 28, 2026, starting from clean HEAD `220bfc6` (`feat: add source-aware CausalFly observatory workflows`). No commit was made. The deterministic simulation engine and separate FruitFly XR repository were not modified. FruitFly XR was clean before and after the controlled acceptance session.

## Architecture and runtime

Synthetic Fixture preserves the existing loop: exact question → Meta `design` → strict local experiment validation → deterministic matched trials/comparison → compact immutable engine evidence → Meta `interpret` → strict local scientific-analysis validation. `CAUSALFLY_FAKE_META=1` explicitly forces offline mode; otherwise complete configuration selects live Meta. Provider failure never selects fake output. The UI now prominently identifies accepted live results as **META MUSE / LIVE AI ANALYSIS** in Scientist and **META LIVE** in Compare.

FruitFly XR follows a separate path: validated received telemetry → retained server window → exact question → deterministic local answer → explicit **ANALYZE WITH META** → compact frozen evidence → Meta `observe` → strict local observational validation → separate AI result. The action blocks duplicate pending clicks. Navigation, connection, source changes, incoming frames and question submission never call Meta. Retry requires another explicit action.

The bridge retains protocol-normalized frames under a random opaque reference. The browser posts only that reference, session/sequence IDs and the exact question. The server selects those exact frames, derives the local answer again, freezes the compact bundle and registers it in a process-local provenance gate. A browser cannot submit replacement telemetry. Meta receives serialized evidence and cannot mutate retained frames, source provenance, TrialResult or ExperimentComparison.

The result UI distinguishes current local analysis from the frozen analysis window, supplied counts from deterministic derivations, Meta interpretation from evidence, and proposed tests from findings. It displays the exact question, evidence, sufficiency, limitations, confounders and next-test requirements. Local interpretation and full retained telemetry remain accessible.

### What goes to Meta

Exact question; source/dataset identity and provenance; session ID; retained-frame count; capture/receipt times; sequences; simulation ticks and model times; stream/historical status; supplied simulated spike-event and active-neuron counts; decoder states and supplied channels; input-reference IDs/freshness; received decoder/reference transitions; display count/truncation; producer display/subscriber drops; deterministic local answer, facts, sufficiency and missing evidence.

The live five-frame bundle was **6,881 UTF-8 bytes**. It contained no soma coordinates, raw WebSocket messages, anatomical edges, spike-ID arrays, neuron/population identity inference, stimulus contents, unsupported movement values, credentials or hidden prompts. No Hz, biological time, living-fly measurements, significance, replicates or confidence intervals were invented. The published connectome supplies structure; FruitFly XR supplies simulated dynamics; CausalFly receives observations.

### Response contract

All required fields are validated by a strict Zod object: `exactQuestion`, `evidenceSufficiency` (`SUFFICIENT | PARTIAL | INSUFFICIENT`), `observations[]`, `interpretation`, `limitations[]`, `potentialConfounders[]`, `nextExperiment { title, rationale, requiredEvidence[] }`, and `causalClaimAllowed: false`. Text/list bounds reject empty or incomplete results. Extra fields, malformed JSON, altered questions and a true causal flag fail without repair. A locally insufficient answer cannot be upgraded by Meta.

The existing `LiveMetaClient` and `createMetaClient` are reused; no SDK or dependency was added. Public errors are fixed sanitized strings. Provider bodies, headers, stack traces, configuration values and prompts never enter browser contracts. Model identifiers are not added to the browser; mode is sufficient to identify live vs fake.

## Verification

All offline gates passed **before** controlled live acceptance:

| Gate | Result |
| --- | --- |
| `npm test` | PASS — **224 tests**: 211 library/API and 13 component tests; 18 added; zero failures/skips |
| `npm run experiment:demo` | PASS — unchanged deterministic comparison |
| `npm run experiment:ai-demo -- --fake` | PASS — explicit offline design/interpretation |
| `npm run lint` | PASS |
| `npm run build` | PASS — production compilation, TypeScript and prerendering |
| `git diff --check` | PASS |
| Additional TypeScript check | PASS — `npx tsc --noEmit` |

New offline coverage verifies compaction/exclusions and deep freezing; exact-question transmission; strict response parsing; literal false causal flag; insufficiency handling; unchanged evidence after failure; no fake fallback; no credential/provider prompt leakage; fabricated/expired/missing references; in-process provenance gating; malformed/oversized route input; zero calls on question/navigation; exactly one application request under a double click; explicit retry; and retention across disconnect/source switching. Existing synthetic regression and live-transport injection tests continue passing. Automated tests use fake/injected clients, never a real network provider.

## Controlled live acceptance

Configuration presence was checked without printing secret values. The production preview used live configuration with `CAUSALFLY_FAKE_META=0`. Only the two authorized real application actions were submitted:

| Workflow | Meta completions | Outcome |
| --- | --- | --- |
| Synthetic experiment | One `design`, then one downstream `interpret` | **META LIVE / PASS**; strict proposal and analysis validation accepted |
| FruitFly retained observation | One `observe` after explicit Analyze | **META LIVE / PASS**; exact-question check and strict observational schema accepted; causal flag false |

No transport retry was reported. Existing transport policy permits up to three attempts only for transient connection/429/5xx failures; it never repairs schema failures or falls back. There was no extra live smoke call or live retry during this review.

For genuine FruitFly evidence, the existing built Java research service and existing built .NET BrainClient were run with logs under CausalFly's ignored `tmp/sprint-6/`. No external repository files were written or rebuilt. CausalFly only subscribed to `/observatory/v1`; the existing organism harness generated its documented synthetic input trajectory. This is an external simulation trial, not a CausalFly intervention or biological experiment.

The retained acceptance window contained five received frames (sequences/ticks 1–5, model times 50–250 ms). The exact question was “Which received frame showed the largest spike-event count?” Supplied counts were 0, 0, 2,810, 3,379 and 3,804. Local analysis and Meta both identified frame 5's **3,804** simulated events, explicitly limited to the retained window. Meta stated that dynamics were simulated over published structure, not living-fly recordings; no causal effect or biological validation was claimed.

[Safe live acceptance record](review/sprint-6/live-acceptance.json) · [Browser verification](review/sprint-6/verification.json).

## Browser review and screenshots

Production Edge/Playwright review covered both requested sizes. All 16 captures passed horizontal-overflow checks. Normal runtime had zero console errors and zero unhandled page errors. The deliberately intercepted HTTP 502 error test produced the expected browser resource-status message; it caused no application exception or provider call. Retry was tested by replaying the already accepted response in the browser, with no additional live request. Retained evidence survived source switching, and question/navigation operations made zero Meta requests.

| State | 1920×1080 | 1440×1080 |
| --- | --- | --- |
| Synthetic Observatory | [PNG](review/sprint-6/synthetic-observatory-1920x1080.png) | [PNG](review/sprint-6/synthetic-observatory-1440x1080.png) |
| Synthetic Compare / live result | [PNG](review/sprint-6/synthetic-compare-1920x1080.png) | [PNG](review/sprint-6/synthetic-compare-1440x1080.png) |
| Synthetic AI Scientist / META LIVE | [PNG](review/sprint-6/synthetic-scientist-live-1920x1080.png) | [PNG](review/sprint-6/synthetic-scientist-live-1440x1080.png) |
| FruitFly Observatory / retained evidence | [PNG](review/sprint-6/fruitfly-observatory-retained-1920x1080.png) | [PNG](review/sprint-6/fruitfly-observatory-retained-1440x1080.png) |
| FruitFly Scientist / before Meta | [PNG](review/sprint-6/fruitfly-scientist-before-1920x1080.png) | [PNG](review/sprint-6/fruitfly-scientist-before-1440x1080.png) |
| FruitFly Scientist / real Meta | [PNG](review/sprint-6/fruitfly-scientist-live-1920x1080.png) | [PNG](review/sprint-6/fruitfly-scientist-live-1440x1080.png) |
| Meta interpretation / detail | [PNG](review/sprint-6/fruitfly-meta-detail-1920x1080.png) | [PNG](review/sprint-6/fruitfly-meta-detail-1440x1080.png) |
| Injected provider failure / Retry | [PNG](review/sprint-6/fruitfly-provider-error-retry-1920x1080.png) | [PNG](review/sprint-6/fruitfly-provider-error-retry-1440x1080.png) |

Screenshots were visually inspected for hierarchy, label clarity, evidence distinctions and clipping. Temporary review scripts, accepted response records and command logs are ignored under `tmp/`. An initial review selector had incorrect capitalization and failed before submitting any experiment; it was corrected before the controlled live actions.

## Changed files

| Area | Files |
| --- | --- |
| Shared Meta transport/templates | `src/lib/meta/client.ts`, `src/lib/meta/fake-client.ts` |
| Observational evidence/schema/interpreter | `src/lib/meta/observational-evidence.ts`, `src/lib/meta/observational-schema.ts`, `src/lib/meta/observational-interpreter.ts` |
| Server retention and telemetry reference | `src/lib/sources/retained-evidence.ts`, `src/lib/sources/fruitfly-bridge.ts`, `src/lib/sources/contracts.ts`, `src/lib/sources/live-session.ts` |
| Web boundary and explicit action | `src/lib/web/workflow.ts`, `src/lib/web/observational-workflow.ts`, `src/lib/web/observational-contracts.ts`, `src/lib/web/observational-action.ts`, `src/app/api/sources/fruitfly/analyze/route.ts` |
| UI | `src/app/observatory.tsx`, `src/app/components/source-analysis-workspace.tsx`, `src/app/components/fruitfly-analysis.tsx`, `src/app/components/fruitfly-meta-analysis.tsx`, `src/app/components/ai-scientist.tsx`, `src/app/components/source-workspaces.css` |
| Tests | `src/lib/meta/observational.test.ts`, `src/lib/web/observational-action.test.ts`, `src/app/components/source-analysis-workspace.test.tsx` |
| Documentation | `README.md`, `docs/META-INTEGRATION.md`, this review |
| Review artifacts | 16 PNGs and two safe JSON records under `docs/review/sprint-6/` |

## Remaining limitations and commit readiness

- Retention is process-local and bounded: 120 frames per subscription, 32 subscriptions, one-hour inactivity expiry. Restart/eviction/new-session/window-overrun invalidates old references. Reconnect to receive validated telemetry; client evidence is never trusted as a substitute. Shared deployments need shared retention and authentication/ownership.
- The local question router is intentionally conservative. Meta cannot upgrade an insufficient local answer; this can decline questions a broader future local analyzer could support.
- Structural schema checks do not prove arbitrary generated prose true. Scientific review against separately retained evidence remains necessary.
- This observational path establishes neither controlled causal effects nor biological validation. No statistical inference or named-neuron analysis was added.
- Explicit fake mode remains an offline template. The existing auto factory also retains its no-configuration fake behavior; partial live configuration fails safely.

The working tree is suitable for review and commit: acceptance gates passed, no secrets were added, no dependencies changed, engine and FruitFly XR remained unchanged, and no commit was created. Local-demo deployment limitations above are explicit rather than hidden behind the live result presentation.

Final credential exclusion checked 28 changed text files and 13 production browser
JavaScript bundles against the configured API key: **PASS**. The two temporary
acceptance processes were stopped; the pre-existing preview was left untouched.
