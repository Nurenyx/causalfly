# Sprint 11B evidence integrity corrective review

Branch: `feat/sprint-11b-production-hardening`. Existing Sprint 11B work was continued in place. No reset, stash, commit, push, deployment, live Meta/SAM call, or FruitFly XR repository change was performed.

## 1. Root cause

The workspace reducer changed the question string without releasing the active design/result. The next-question transition also left the previous comparison and interpretation active. Other views and the persistent assistant consumed this retained result directly. FruitFly questions were linked to a producer session that could already contain older retained frames; question text plus session equality did not establish that observation followed question submission. The assistant kept frozen answers across investigation changes.

## 2. Identity and lifecycle rule

Synthetic investigation revisions own the active design and result. Submitting a different question archives the previous result/design reference and clears active design, approval, comparison, interpretation and next-test proposal. Explicit design submission starts a fresh revision, including resubmission of the same question. Async design/run/interpret responses carry the revision captured at request time; the reducer rejects a response for an older revision. Existing design/spec/run identities continue to identify measured records. No measurement is rewritten.

An explicit next-question action archives the parent result and carries `nextFromId` only for its recorded proposal. The request uses the existing server-side lineage validation and Flight Recorder parent relationship. The parent reference survives design retries; it never makes parent evidence active.

FruitFly submission creates an observation revision, exact submitted question, browser submission time and exclusions for all frames already retained. Only accepted frames with a later receipt time and a nonexcluded source-session/sequence identity enter the active observation window. Reconnection does not reset this boundary. Interpretations must match the question and every frame in their exact source session must belong to this active window. The same filtered window feeds Understand, Evidence and Ask CausalFly.

## 3-4. Workflow behavior before and after

| Workflow | Before | After |
| --- | --- | --- |
| Synthetic new question | Previous comparison/interpretation remained accessible as active state | Active design/result released; immutable prior result available in Evidence history; a new design and approval are required |
| Synthetic next question | Proposal changed question while keeping parent measurements active | Parent is archived; supported parent design reference is sent through the existing lineage path; new result starts empty |
| FruitFly new question | Existing producer-session frames could answer the newly submitted question | Old frames remain historical context; active observation begins only with an eligible newly received frame |
| FruitFly disconnect/reconnect | Existing transport and bounded retention behavior | Same connection controls and retention behavior; valid snapshot becomes last-received/historical and the investigation boundary survives reconnect |

## 5. Ask CausalFly

The assistant remounts at investigation/source or synthetic design boundaries, releasing frozen local responses. Its synthetic result and FruitFly evidence props are restricted to active records. With no active synthetic evidence it says the question has not been tested, explains that any retained evidence belongs to a previous investigation, and directs design/run. FruitFly locally reports insufficiency when the active window is empty. Optional Meta actions require an active frozen retained window. Meta remains explicit and on demand.

## 6. Evidence workspace

The exact current synthetic question and untested state are shown separately from collapsed historical result records. Active and historical labels appear when there are historical records to separate. FruitFly Evidence shows its active window and puts pre-question frames in a separate historical-context disclosure. Old Meta interpretations are not displayed as active. Existing provenance and scientific disclosures remain intact.

## 7. Bridge regression results

Offline socket tests confirm endpoint unavailable -> ERROR with null evidence and no fabricated frames; valid configured endpoint -> accepted hello/frame with exact source/session provenance; disconnect -> retained snapshot. Client connection, error, disconnect/reconnect, immutable receipt history, source normalization, and status tests pass. Browser fixtures confirm Connect/Disconnect controls, unavailable state, newly received telemetry, historical snapshots and preserved question identity on reconnect at every required width.

The bridge source and endpoint configuration were not edited. No real FruitFly XR endpoint or proprietary repository was used. Camera/viewer code and dataset were not edited; existing viewer/source regression tests pass. The production Blob/upload, SHA-256, privacy, kill-switch, cleanup, health, calibration, and WebGL hardening files were preserved; their existing tests remain passing.

## 8. Regression tests

Five added cases cover:

1. New synthetic question archives the immutable comparison, releases approval/interpretation, rejects old async run/interpret responses and gives the assistant no prior measurements.
2. Explicit next-question lineage, same-question fresh submission, and parent reference preservation across design retries.
3. FruitFly pre-question window exclusion, identical-question old interpretation rejection, later frame acceptance, replay exclusion, historical disconnect status, and reconnect identity preservation.
4. Unavailable observatory -> explicit ERROR with zero fabricated telemetry.
5. Available observatory -> validated frame accepted; disconnect retains its exact source provenance.

Existing dashboard, assistant and guided-experiment expectations were updated to assert historical retention instead of active reuse. Existing Flight Recorder lineage, Blob/provenance and deterministic measurement tests pass. Synthetic reference control peak remains 1 and intervention peak remains 0.5.

## 9. Validation

- Focused tests ran before the full suite; final targeted lifecycle tests: 14/14. Broader focused lifecycle/assistant/source/provenance pass: 87/87 before the final two endpoint cases; subsequent source/boundary subset: 36/36.
- Final `npm test`: 321 library tests and 58 component tests, all passing (379 total).
- Final `npx tsc --noEmit`: pass.
- Final `npm run lint`: pass.
- Final `npm run build`: pass, production webpack build.
- Final `git diff --check`: pass.
- Production browser review: 15 state/viewport checks at 1920x1080, 1440x900 and 390x844; synthetic completion followed by new question, immediate Evidence and assistant, FruitFly historical question, unavailable/available/disconnected/reconnect states. No horizontal overflow, browser errors or live provider calls.
- Browser experiment API calls were intercepted with deterministic fake-client fixtures. EventSource was replaced with an offline fixture stream; nonlocal requests were blocked. Only local health checks passed through. Preview used `CAUSALFLY_FAKE_META=1`, `CAUSALFLY_META_ENABLED=0`.
- Two screenshots only; see the review artifacts listed below. The screenshots are offline validation, not live experimental evidence.

Validation logs are in `tmp/evidence-*.log`. The browser script uses `tmp/evidence-fixtures.json` generated via `runGuidedAction` and `FakeMetaClient`, plus the existing recorded offline XR review fixture `tmp/sprint-6b/browser-fixtures.json`.

## 10. Exact files changed by this corrective pass

Modified tracked files (none had preexisting changes at intake):

- `src/app/observatory.tsx`
- `src/app/components/guided-experiment.test.tsx`
- `src/lib/web/dashboard.ts`
- `src/lib/web/dashboard.test.ts`
- `src/lib/web/assistant.ts`
- `src/lib/web/assistant.test.ts`
- `src/lib/sources/fruitfly.test.ts`
- `src/lib/sources/live-session.test.ts`

Added source/review files:

- `src/lib/web/investigation.ts`
- `src/lib/web/investigation.test.ts`
- `scripts/evidence-integrity-browser-review.mjs`
- `docs/SPRINT_11B_EVIDENCE_INTEGRITY_REVIEW.md`
- `docs/review/sprint-11b/evidence-integrity/browser-results.json`
- `docs/review/sprint-11b/evidence-integrity/synthetic-new-question-history.png`
- `docs/review/sprint-11b/evidence-integrity/fruitfly-disconnected-active-observation.png`

Ignored local validation helpers/results were written under `tmp/evidence-*`; no existing review fixtures were overwritten. All preexisting modified/untracked Sprint 11B files were retained.

## 11. git diff --stat

Full tracked working-tree diff, including preserved preexisting Sprint 11B changes. Git does not include untracked source/review artifacts in this command.

```text
 .env.example                                  |  18 +-
 README.md                                     |   9 +-
 docs/DEPLOY_HOSTINGER.md                      |   2 +
 package-lock.json                             | 284 +++++++++++++++++++++++++-
 package.json                                  |   6 +
 src/app/components/embodied-world.tsx         |  25 ++-
 src/app/components/guided-experiment.test.tsx |   8 +-
 src/app/components/perception-panel.test.tsx  |  10 +-
 src/app/components/perception-panel.tsx       |  46 +++--
 src/app/observatory.tsx                       |  38 ++--
 src/lib/meta/client.ts                        |  11 +
 src/lib/meta/meta.test.ts                     |   6 +-
 src/lib/meta/observational.test.ts            |   2 +-
 src/lib/meta/provider-errors.test.ts          |   2 +-
 src/lib/meta/sam-client.test.ts               |   6 +-
 src/lib/meta/sam-client.ts                    |   3 +-
 src/lib/meta/scene-client.test.ts             |   2 +-
 src/lib/meta/scene-client.ts                  |   3 +-
 src/lib/meta/transport.test.ts                |   2 +-
 src/lib/perception/contracts.ts               |   1 +
 src/lib/sources/fruitfly.test.ts              |  24 +++
 src/lib/sources/live-session.test.ts          |  26 +++
 src/lib/web/assistant.test.ts                 |   2 +-
 src/lib/web/assistant.ts                      |   2 +-
 src/lib/web/dashboard.test.ts                 |   6 +-
 src/lib/web/dashboard.ts                      |  31 ++-
 src/lib/web/flight-recorder-types.ts          |   4 +-
 src/lib/web/flight-recorder.test.ts           |  11 +-
 src/lib/web/flight-recorder.ts                |  15 +-
 src/lib/web/flyv2-asset.test.ts               |   3 +-
 src/lib/web/health.test.ts                    |  10 +-
 src/lib/web/health.ts                         |   9 +-
 src/lib/web/perception-action.test.ts         |   9 +-
 src/lib/web/perception-action.ts              |  56 ++---
 src/lib/web/perception-session.ts             |   2 +
 src/lib/web/scene-action.test.ts              |  18 +-
 src/lib/web/scene-action.ts                   |  36 ++--
 src/lib/web/workflow.test.ts                  |   4 +-
 38 files changed, 604 insertions(+), 148 deletions(-)
```

## 12. Remaining risks and limits

- Browser connection states are offline fixtures; real deployment networking, production Blob storage and live Meta/SAM availability were not exercised.
- Investigation/history state remains scoped to the current mounted application, consistent with the existing UI; this is not durable archival storage. FruitFly retention remains bounded by the existing frame/session/server rules.
- Receipt time is a browser-side observation boundary using server-stamped receipt times. Clock skew can conservatively exclude a new frame; exact preexisting frame exclusions prevent known retained frames from being reused. No claim is made about unreceived frames or a complete recording.
- Historical evidence is inspectable; the assistant currently answers active evidence only. No new historical-analysis command was introduced.
- Existing scientific limitations remain: synthetic fixture is an engineering model without real-fly validation; FruitFly uses published structure with simulated observational dynamics, not living-fly recordings. AI proposes/interprets; the deterministic engine measures.

**NO COMMIT MADE.**
**STOP FOR HUMAN REVIEW.**
