# Sprint 11B Meta design and production diagnostics review

Continued `feat/sprint-11b-production-hardening` in place. Existing production-hardening and evidence-integrity work is preserved. No FruitFly XR repository changes, engine-parameter changes, commits, pushes, tags or deployments were made.

## 1. Exact 502 root cause and forensic path

The local `.env.local` contained an API key, `https://api.meta.ai/v1`, `META_MODEL=muse-wonder-1.0`, and `META_SCENE_MODEL=muse-spark-1.3`, but no `CAUSALFLY_META_ENABLED` or explicit fake-mode setting. Credential values were not logged.

The Sprint 11B kill switch was checked only inside `LiveMetaClient.complete()`. `configuredClient()` / `getWebStatus()` could therefore construct a live client and advertise META LIVE from credentials alone, even while the kill switch was unset. An explicit browser design action reached `/api/experiments` and the experiment designer, then `complete()` rejected locally before any provider HTTP request. The guided workflow caught this ordinary exception as a provider error; the route mapped that to 502. The UI then displayed the generic design-failed recovery message. A successful health endpoint did not establish provider reachability; health was configuration-only.

This is a configuration/status/error-routing defect, not evidence of provider downtime. The failure path is covered by a regression through the actual POST route using complete placeholder configuration and an unset switch. It now returns 503 with CONFIGURATION_DISABLED and makes zero fetches.

Trace audit:

- Browser: explicit action only; synchronous in-flight guard suppresses a second click. Existing investigation revision accompanies asynchronous design/run/interpret results.
- Route/action: request body and strict discriminated action schema remain validated. Disabled configuration returns 503; real provider/response failures remain 502; invalid user input remains 400.
- Designer: question/network snapshots and eligible intervention targets remain unchanged; no deterministic execution occurs in design.
- Transport: exact configured `/v1/chat/completions` endpoint, configured model, system/user messages, JSON object response mode and Authorization header are retained. SDK logging is off, SDK retries are zero, existing bounded application retries remain unchanged.
- Response: completion envelope, finish reason, refusal and nonempty string content are checked; JSON parsing and the unchanged strict Zod proposal schema run before any design is accepted.
- UI: only a validated design reaches awaiting approval. Prior stale-response, question/evidence lineage and measurement ownership rules remain intact.

## 2. Exact fix

- Live client construction now validates configuration and checks explicit enablement before status can claim live availability. The existing per-request kill-switch check remains in place as a second guard.
- The disabled condition is a typed CONFIGURATION_DISABLED failure. Configuration creation failures are recorded separately from provider failures and mapped to 503.
- The status UI explicitly labels disabled live Meta. Explicit offline mode continues to label the fake fixture and makes no provider call. `configuredClient(env)` now reads fake mode from its supplied environment, keeping status and execution consistent under injected configurations.
- The existing local environment was deliberately enabled by appending `CAUSALFLY_META_ENABLED=1` to ignored `.env.local`. No key, endpoint or model was changed. The kill switch still defaults to disabled; this is explicit local configuration, not a bypass.
- Malformed completion envelopes and malformed JSON now produce stable invalid-response errors; schema rejection remains strict. No fake fallback was added and provider output cannot overwrite engine measurements.

## 3. Safe failure taxonomy

Flight Recorder records safe codes, never exception bodies/headers or validation input values:

| Code | Meaning |
| --- | --- |
| CONFIGURATION_DISABLED | Explicit live switch unset/off, or live use blocked by fake mode |
| CONFIGURATION_INVALID | Missing or invalid server configuration during client creation |
| AUTHENTICATION_FAILED | Provider HTTP 401/403 |
| PROVIDER_TIMEOUT | SDK connection timeout |
| PROVIDER_RATE_LIMIT | Provider HTTP 429 |
| PROVIDER_HTTP_ERROR | Other provider HTTP error status |
| INVALID_PROVIDER_RESPONSE | Invalid completion envelope, empty/incomplete response, or invalid JSON |
| SCHEMA_VALIDATION_FAILED | Parsed output rejected by the unchanged strict Zod schema |
| REQUEST_CANCELLED | Explicit abort/cancellation |
| UNKNOWN_PROVIDER_ERROR | Other failure, without exposing its raw message |

Normal users receive fixed, concise recovery messages. The internal code remains available in human-readable Technical Details as a support/recovery reference. Existing sanitized SDK diagnostics remain available to internal tooling; no raw SDK error was added to browser output.

## 4. Diagnostic-export production behavior

A server-evaluated `CAUSALFLY_DEVELOPER_DIAGNOSTICS` policy passes only a boolean through React context. There is no public environment variable and no credential passed to the client.

- Production default: raw EXPORT RUN DIAGNOSTICS and the raw manifest/event-ledger disclosure are absent from the rendered UI, including inside closed disclosures.
- Explicit internal use: set `CAUSALFLY_DEVELOPER_DIAGNOSTICS=1` and restart the production server.
- Development default: enabled. Set the same flag to `0` to hide it in development.
- Flight Recorder, run identity, source information, human-readable event/recovery references, Experiment Trust, scientific evidence, provenance, validation, limitations and technical analysis remain available regardless of raw-export visibility.
- This is a product visibility setting, not an authorization/security boundary. Diagnostics remain sanitized even when the control is hidden or intentionally enabled. Research questions/evidence/AI text may still be part of scientific provenance and intentional exports.

README and `.env.example` document enablement and deliberate internal export configuration.

## 5. Tests added and updated

Seven new Meta design regressions verify:

1. Enabled/configured live transport with mocked HTTP succeeds, sends the exact configured endpoint/model/header/payload, and returns a validated design without measurements or engine approval.
2. Unset/off switch blocks provider calls; explicit offline configuration remains usable.
3. The actual POST route returns 503 for the previously misreported disabled-provider failure, and initial UI status agrees.
4. Authentication, rate-limit and HTTP failures receive distinct safe codes with no credential leakage.
5. Invalid envelopes, invalid JSON and invalid intervention targets are safely rejected without weakening validation.
6. Timeout, cancellation, schema and unknown failures classify safely.
7. A delayed validated design cannot overwrite a newer investigation revision.

One new component regression verifies production/internal/development visibility policy while scientific trust and provenance remain visible. Existing export tests now opt into internal context explicitly. The existing untracked Blob hardening test was extended to check both construction-time rejection and the retained per-call kill switch; its original no-network, scene/SAM and offline-fixture checks remain intact.

Focused production browser review deliberately clicks the design button twice before resolving the mock response: only one API request is produced. It verifies no engine run before approval, default raw-export absence, intentional internal visibility, and actual exported JSON download integrity. No broad screenshot automation was used.

## 6. Complete validation results

- Initial focused transport/configuration/workflow/evidence tests: 92/92 passed.
- Final focused design/Blob regression subset: 17/17 passed.
- Focused trust/cockpit components: 14/14 passed.
- Full `npm test`: 328 library tests + 59 component tests = **387 passed**, zero failures.
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass.
- `npm run build`: pass, production webpack build.
- `git diff --check`: pass.
- Production and explicit-internal browser reviews: pass; no page errors, no live provider calls during mocked review; scientific provenance visible in both modes.
- Credential scan: 52 production client JavaScript/review-log/result files checked against the local key in memory; zero matches. The value was never printed or supplied to the browser.

The full suite includes all existing scientific determinism, question/evidence isolation, Blob upload/hash/provenance, cleanup, source, health and WebGL tests. Validation logs are `tmp/meta-fix-*.log`. Browser reviews use the existing deterministic offline review fixtures; they do not create scientific findings.

## 7. Single live acceptance result

**Succeeded. Exactly one provider request.**

The final production build was served locally on port 3143. A temporary acceptance-only preload allowed exactly one outbound request to the configured experiment-design endpoint, blocked scene/SAM or other provider paths, and used an atomic claim file to prohibit a second provider request, including transport retries. It recorded only safe metadata.

Navigation was confirmed to make no Meta request. One deliberate Design with Meta click then traversed the real production UI -> `/api/experiments` -> designer -> transport -> provider -> strict schema -> UI path:

- Provider: `muse-wonder-1.0`, HTTP 200, finish reason `stop`.
- CausalFly API: HTTP 200, META LIVE, validated design.
- UI: awaiting approval, one Approve & Run Experiment control.
- Experiment API actions: exactly `["design"]`.
- Engine execution/approval events: none.
- Duplicate provider request: none.
- Response credential echo: false.
- No Muse Spark, SAM or FruitFly source call was made by acceptance.

No second live test was performed. The task's guarded preview was stopped after acceptance. The preexisting preview on port 3142 was not stopped. It may pick up the deliberate `.env.local` enablement depending on its runtime/reload behavior.

Review artifacts:

- `docs/review/sprint-11b/meta-design/browser-production.json`
- `docs/review/sprint-11b/meta-design/browser-internal.json`
- `docs/review/sprint-11b/meta-design/live-acceptance.json`

## 8. Exact files changed in this corrective pass

Updated existing files, preserving their prior Sprint 11B work:

- `.env.example`
- `README.md`
- `src/app/observatory.tsx`
- `src/app/components/experiment-trust.tsx`
- `src/app/components/experiment-trust.test.tsx`
- `src/app/components/status-indicator.tsx`
- `src/lib/meta/client.ts`
- `src/lib/meta/schemas.ts`
- `src/lib/web/contracts.ts`
- `src/lib/web/guided-workflow.ts`
- `src/lib/web/workflow.ts`
- `src/lib/perception/blob-media.test.ts` (already untracked at intake; extended in place)
- `.env.local` (ignored local configuration; explicit enable flag only)

Added:

- `src/app/components/diagnostic-visibility.tsx`
- `src/lib/meta/failure.ts`
- `src/lib/web/diagnostic-policy.ts`
- `src/lib/web/meta-design-regression.test.ts`
- `scripts/meta-design-browser-review.mjs`
- `docs/SPRINT_11B_META_DESIGN_REVIEW.md`
- The three JSON review artifacts listed above.

Ignored local acceptance helpers/audit/claim files and validation logs were written under `tmp/meta-*`; these are not production functionality or persisted credential storage. No existing review fixture was replaced. The earlier evidence-integrity correction and all other uncommitted Sprint 11B work remain present.

## 9. git diff --stat

This is the full tracked working tree versus HEAD, including preserved Sprint 11B and evidence-integrity work. Untracked new source/tests/review files and ignored `.env.local` are not included by this command.

```text
 .env.example                                  |  22 +-
 README.md                                     |  33 ++-
 docs/DEPLOY_HOSTINGER.md                      |   2 +
 package-lock.json                             | 284 +++++++++++++++++++++++++-
 package.json                                  |   6 +
 src/app/components/embodied-world.tsx         |  25 ++-
 src/app/components/experiment-trust.test.tsx  |  20 +-
 src/app/components/experiment-trust.tsx       |  10 +-
 src/app/components/guided-experiment.test.tsx |   8 +-
 src/app/components/perception-panel.test.tsx  |  10 +-
 src/app/components/perception-panel.tsx       |  46 +++--
 src/app/components/status-indicator.tsx       |   6 +-
 src/app/observatory.tsx                       |  45 ++--
 src/lib/meta/client.ts                        |  19 +-
 src/lib/meta/meta.test.ts                     |   6 +-
 src/lib/meta/observational.test.ts            |   2 +-
 src/lib/meta/provider-errors.test.ts          |   2 +-
 src/lib/meta/sam-client.test.ts               |   6 +-
 src/lib/meta/sam-client.ts                    |   3 +-
 src/lib/meta/scene-client.test.ts             |   2 +-
 src/lib/meta/scene-client.ts                  |   3 +-
 src/lib/meta/schemas.ts                       |   3 +-
 src/lib/meta/transport.test.ts                |   2 +-
 src/lib/perception/contracts.ts               |   1 +
 src/lib/sources/fruitfly.test.ts              |  24 +++
 src/lib/sources/live-session.test.ts          |  26 +++
 src/lib/web/assistant.test.ts                 |   2 +-
 src/lib/web/assistant.ts                      |   2 +-
 src/lib/web/contracts.ts                      |   2 +
 src/lib/web/dashboard.test.ts                 |   6 +-
 src/lib/web/dashboard.ts                      |  31 ++-
 src/lib/web/flight-recorder-types.ts          |   4 +-
 src/lib/web/flight-recorder.test.ts           |  11 +-
 src/lib/web/flight-recorder.ts                |  15 +-
 src/lib/web/flyv2-asset.test.ts               |   3 +-
 src/lib/web/guided-workflow.ts                |  12 +-
 src/lib/web/health.test.ts                    |  10 +-
 src/lib/web/health.ts                         |   9 +-
 src/lib/web/perception-action.test.ts         |   9 +-
 src/lib/web/perception-action.ts              |  56 ++---
 src/lib/web/perception-session.ts             |   2 +
 src/lib/web/scene-action.test.ts              |  18 +-
 src/lib/web/scene-action.ts                   |  36 ++--
 src/lib/web/workflow.test.ts                  |   4 +-
 src/lib/web/workflow.ts                       |  31 +--
 45 files changed, 697 insertions(+), 182 deletions(-)
```

## 10. Remaining risks and limits

- One successful provider response establishes this configured design path, not sustained service reliability or support for every question. No live interpretation, scene/SAM, Blob storage or FruitFly session was exercised in this acceptance.
- Existing application-level retries for transient design/interpret transport failures remain bounded but can perform additional work in normal operation. The acceptance-only guard prohibited additional outbound attempts for the single smoke test. Duplicate UI submission suppression remains separate from retry policy.
- Live enablement in `.env.local` is now explicit. Production deployment must intentionally configure its own switch and credentials. Health is configuration-only and does not prove provider reachability.
- Internal export is deliberately server-configured for the whole deployment; it is not role-based access control. Sanitized diagnostics remain available in API payloads, while raw developer UI/export is hidden by default.
- Existing process/session retention and browser clock-boundary limitations from the evidence-integrity review remain unchanged. No durable archive or new scientific capability was introduced.

NO COMMIT MADE.
STOP FOR HUMAN REVIEW.
