# Sprint 6B — CausalFly contextual assistant

Implemented October 28, 2026, against clean HEAD `cbc0a51` (`causalfly-meta-runtime-v0.5`). **No commit, live Meta request, FruitFly XR repository write, engine change, protocol change, port configuration change, or `.env.local` edit.**

## Result and architecture

The persistent **Ask CausalFly** launcher opens a native modal drawer across Observatory, Live Session, Compare, AI Scientist and Evidence. Desktop uses a 510px right panel; mobile uses the viewport width. Shared instrument tokens supply cyan local instrumentation, magenta question accents, yellow interpretation/limitations and the near-black surface. There is no automatic opening or decorative unread indicator. The launcher has a visible focus state and accessible name; Enter opens, Tab/Shift+Tab cycle inside, Escape or Close dismisses and restores launcher focus. Its bottom placement reserves scrollable footer space without changing Live Session visualizations.

`Observatory` continues to own selected source, workspace, retained telemetry, the synthetic result and the shared observational action. The assistant mounts once alongside those workspaces. It receives this real state through props and uses existing navigation/source callbacks. Navigation does not reload the page or clear evidence. Specialized pages remain the full telemetry, provenance, matched-comparison and scientific-analysis workspaces.

The assistant uses `answerObservationalQuestion` and `observationalAnalysis` for FruitFly local interpretation. Synthetic local summaries read only retained engine measurements or describe the existing fixture/measurement contract. Submitting a synthetic question cannot run an experiment: **Review question in Observatory** loads it into the existing form, where the user explicitly chooses **Design & Run Experiment**. Server proposal validation and deterministic measurement remain mandatory.

## Assistant state model

| State | Lifetime and transitions |
| --- | --- |
| Drawer open/closed | Starts closed; only a launcher event opens it. Closing hides content without unmounting assistant state. |
| Draft per source | Synthetic and FruitFly input drafts are separate and survive workspace/source switching during this app session. |
| Submitted FruitFly question | Captures exact characters, detached snapshot, eligible same-session frames and local answer; the complete capture is recursively frozen at submission. |
| Submitted synthetic question | Captures the local answer against the retained experiment at submission. No new result is inferred. |
| Current context header | Always reads actual selected source/workspace and current retained evidence count; it is separate from the frozen answer window. |
| Observational Meta state | The existing parent-owned action publishes pending/error/result plus an exact request key. Only a matching key is shown beside an assistant answer. |
| Successful-result cache | Shared action closure, up to 32 exact question/reference/session/sequence keys. Successful matching results are reused on subsequent explicit actions; errors are not cached. |

Incoming telemetry does not rewrite a submitted question, answer, provider payload or retry window. A question submitted before any evidence remains an empty-window answer; receive evidence and submit again. Refresh starts a new app session; drafts and client caches are not persisted to disk.

## Source awareness and trust boundary

The header reports the actual source, workspace, retained-frame/experiment status, configured Meta mode and local versus pending Meta analysis state. Configured means available on demand, not connected to an active model session. Offline fake mode and live provider results have distinct labels. No model configuration or secret is copied into the drawer.

FruitFly actions depend on the workspace: Live Session offers session/decoder questions, Evidence offers summaries and missing-evidence guidance, and Compare states **Controlled comparison requires matched trials** with navigation to Live Session, retained Evidence or an explicit source switch to Synthetic Fixture. The FruitFly branch never renders retained synthetic measurements as observational findings.

Every FruitFly view in the assistant retains these boundaries:

- Observational telemetry, simulated dynamics over published connectome structure, not living-fly recordings.
- CausalFly does not currently send interventions to FruitFly XR.
- Decoder output does not prove physical movement or successful escape.
- Missing frames are unknown; unsupported causal, biological and named-population claims remain insufficient.
- Follow-up tests are suggestions, not findings or interventions already performed.

Local sections are labeled **LOCAL / DETERMINISTIC**, with exact window/session/sequence provenance. Only an accepted live response gets **META MUSE / LIVE**. Fake responses are labeled **OFFLINE / FAKE TEMPLATE**. AI proposes and interprets; deterministic systems measure; evidence and provenance are never rewritten by chat.

## Meta-call rules and Sprint 6A impact

There is **one shared existing Meta path**: `createObservationalAction` → `/api/sources/fruitfly/analyze` → server-retained window → existing strict observational interpreter → existing Meta client. No new endpoint, independent client, provider SDK or dependency was added.

1. Typing, local submission, opening/closing, incoming telemetry, source selection and navigation make zero Meta requests.
2. A nonempty submitted question plus server-retained evidence enables the explicit action. Configuration errors disable it; fake mode stays visibly offline.
3. The assistant passes its frozen capture. Only retention reference, session ID, selected sequence IDs and the exact question are posted; client telemetry is not accepted by the server as evidence.
4. The action synchronously guards pending duplicate clicks. A successful exact combination is cached and reused instead of posted again.
5. Server-side strict structured-response, exact-question, insufficiency and false-causal-flag validation remain intact. Browser acceptance additionally checks schema, exact question, session and ordered window identity before caching.
6. An observational `observe` task now uses **one provider transport attempt**, including on transient failures. The user must explicitly Retry; retries preserve the assistant's frozen capture. Failure preserves local evidence and never falls back to a fake result.
7. Navigation/reopening retain pending/result/error state and never initiate another request. Full AI Scientist shares the same action and successful-result cache.

**Intentional Sprint 6A behavior changes:** shared successful-result deduplication, browser response/window checks, and removal of automatic transport retries for observational tasks. Synthetic design/interpretation retry policy and the complete synthetic experiment loop are unchanged. Server evidence retention, observational schemas/instructions, scientific guards, engine rules, telemetry, geometry and FruitFly semantics are unchanged.

## Validation

| Gate | Result |
| --- | --- |
| `npm test` | PASS — 233 total: 219 library/API + 14 component tests; 9 new tests; no failures/skips |
| `npm run experiment:demo` | PASS — existing deterministic fixture/comparison |
| `npm run experiment:ai-demo -- --fake` | PASS — explicit offline design and interpretation |
| `npm run lint` | PASS |
| `npm run build` | PASS — production build, TypeScript and prerendering |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Production Edge/Playwright browser review | PASS — both sources × five workspaces, keyboard operation, scientific/source boundaries, real fake-mode synthetic execution, shared analysis reuse and explicit error/retry |
| Overflow | PASS — 15 captured states/sizes at 1920×1080, 1440×1080 and 390×844; no page or drawer horizontal overflow |

Focused coverage maps to the brief as follows:

| Requirements | Evidence |
| --- | --- |
| A–D: launcher, open/close, source and workspace | Component render matrix plus browser matrix over ten source/workspace combinations |
| E: retained evidence status | Browser zero-frame and four-frame windows; immutable capture unit tests |
| F–G: observational limits and Compare | Guardrail/refusal unit tests, existing source-boundary regressions and browser matched-trial notice |
| H–K: no implicit calls, exactly one explicit call, reopen/navigation | Offline fetch spies; delayed intercepted request with rapid double click, close/reopen and inline Evidence navigation; exact-result reuse in full AI Scientist |
| L: explicit Retry | Transient HTTP 503 injected into real SDK transport: exactly one attempt; browser injected failure stays failed across navigation until explicit Retry |
| M–N: synthetic workflow and source persistence | Real local `/api/experiments` execution under forced fake mode; question handoff, retained measured summary, inline navigation and explicit source switch |
| O–P: keyboard and layout | Enter, forward/reverse focus cycling, Escape focus restoration; measured page/drawer widths for all captures |

Browser observation requests were **intercepted locally**: one successful offline template, one injected failure, one explicit successful retry. The synthetic endpoint executed once against a preview forced to `CAUSALFLY_FAKE_META=1`. There were **zero live Meta calls** and no unhandled page errors. A paid live acceptance test was unnecessary: Sprint 6A already established live transport; this sprint tests shared integration, state and call gating offline.

### Reproduce offline review

With the production build ready, start a preview with `CAUSALFLY_FAKE_META=1` in the shell environment; do not edit `.env.local`. Then:

```powershell
node node_modules/tsx/dist/cli.mjs --conditions=react-server scripts/assistant-review-fixtures.ts
node scripts/assistant-browser-review.mjs
```

The review uses installed Playwright or the existing Codex runtime's bundled Playwright with Edge. `CAUSALFLY_PLAYWRIGHT_MODULE` and `CAUSALFLY_REVIEW_URL` can point to an existing installation/preview. The script refuses a preview whose rendered status is not fake mode. Review fixtures and logs are generated under ignored `tmp/sprint-6b/`; application code never loads them. ESLint now ignores `tmp/**`, matching Git's existing exclusion of temporary acceptance scripts/logs; tracked review scripts are still linted.

## Screenshot provenance and captures

These are **offline review images**, not a fresh live-science acceptance run. Four genuine normalized FruitFly frames previously captured in Sprint 5.6 were copied verbatim from the existing local capture into [recorded-evidence.json](review/sprint-6b/recorded-evidence.json). Original telemetry, neuron IDs, receipt timestamps, provenance and sequence numbers are preserved. No frame, spike count, decoder output or biological claim was generated for imagery. Their original session is `983e8b31-88d5-4eac-af2c-6755a179f407`; retained sequences are 1–4, with supplied event counts 0, 2810, 3317 and 3314. The local maximum is therefore the received frame 3 count of 3317, not the latest-frame count.

Only browser automation replays these frames into an intercepted SSE route, with an opaque review retention reference. They are never seeded into the running application/server as live telemetry. Original old receipt times and disconnected/stale presentation prevent a claim of current activity. A review-only banner labels the replay, including within the mobile modal. Optional interpretation responses are generated with the existing `FakeMetaClient` through the strict server workflow in a separate offline fixture process. [verification.json](review/sprint-6b/verification.json) records browser checks and request counts.

| Requested state | Primary 1920×1080 | Additional size |
| --- | --- | --- |
| 1. FruitFly / Live Session / closed launcher | [PNG](review/sprint-6b/01-fruitfly-live-launcher-1920.png) | [1440×1080](review/sprint-6b/01-fruitfly-live-launcher-1440.png) |
| 2. FruitFly / Live Session / open assistant | [PNG](review/sprint-6b/02-fruitfly-live-assistant-1920.png) | [1440×1080](review/sprint-6b/02-fruitfly-live-assistant-1440.png) |
| 3. Retained-evidence question | [PNG](review/sprint-6b/03-fruitfly-retained-question-1920.png) | [1440×1080](review/sprint-6b/03-fruitfly-retained-question-1440.png) |
| 4. Local deterministic answer | [PNG](review/sprint-6b/04-fruitfly-local-answer-1920.png) | [1440×1080](review/sprint-6b/04-fruitfly-local-answer-1440.png) |
| 5. Explicit Meta action available | [PNG](review/sprint-6b/05-fruitfly-meta-available-1920.png) | [1440×1080](review/sprint-6b/05-fruitfly-meta-available-1440.png) |
| 6. Synthetic / Observatory / assistant | [PNG](review/sprint-6b/06-synthetic-observatory-assistant-1920.png) | [1440×1080](review/sprint-6b/06-synthetic-observatory-assistant-1440.png) |
| 7. Synthetic / Compare / assistant | [PNG](review/sprint-6b/07-synthetic-compare-assistant-1920.png) | [1440×1080](review/sprint-6b/07-synthetic-compare-assistant-1440.png) |
| 8. Mobile assistant | — | [390×844](review/sprint-6b/08-mobile-assistant-390.png) |

Screenshots were visually inspected for hierarchy, instrumentation colors, readable controls, source/provenance labeling, compact evidence sections and mobile clipping.

## Exact files changed

Application and shared runtime:

- `src/app/observatory.tsx`
- `src/app/globals.css`
- `src/app/components/causalfly-assistant.tsx` (new)
- `src/app/components/causalfly-assistant.css` (new)
- `src/lib/web/assistant.ts` (new)
- `src/lib/web/observational-action.ts`
- `src/lib/web/observational-contracts.ts`
- `src/lib/meta/client.ts`

Tests and reproducible review:

- `src/app/components/causalfly-assistant.test.tsx` (new)
- `src/lib/web/assistant.test.ts` (new)
- `src/lib/web/observational-action.test.ts`
- `src/lib/meta/transport.test.ts`
- `scripts/assistant-review-fixtures.ts` (new)
- `scripts/assistant-browser-review.mjs` (new)
- `eslint.config.mjs`
- `docs/SPRINT_6B_ASSISTANT_REVIEW.md` (new)
- The 15 PNG files individually linked in the capture table, `docs/review/sprint-6b/recorded-evidence.json`, and `docs/review/sprint-6b/verification.json` (all new).

## Known limitations

- The local question router intentionally supports a limited set of evidence questions. Unsupported questions remain insufficient; Meta cannot upgrade local insufficiency. This is a workflow instrument, not an open-ended chat model.
- One most recent submitted answer per source is retained, rather than a conversational transcript. Drafts/cache survive navigation and drawer closure, but not a browser refresh. Successful-result cache eviction after 32 combinations can require a new explicit request for an evicted combination.
- Header context reflects current retained data; an answer reflects its explicitly labeled frozen window. New frames require resubmission to include them. Evidence and full-analysis links open the complete workspace, where current local telemetry may be newer than a frozen Meta result.
- The existing process-local server retention limits remain: 120 frames per subscription, 32 retained subscriptions, one-hour inactivity expiration. An expired frozen window cannot be analyzed; reconnect and submit a new question/window. Cached accepted analyses remain historical, not current-stream measurements.
- The header identifies provider execution mode, not a configured model identifier, following the Sprint 6A browser contract. Configuration is verified only when an explicit action actually runs.
- Structured validation enforces shape, question/window identity, insufficiency and causal flags; it cannot prove arbitrary model prose scientifically true. Detailed provenance and scientific review remain necessary.
- Automated browser captures use replay and fake interpretation. No new external simulation trial or paid Meta acceptance was performed.

## Manual acceptance

1. Open each primary workspace and verify the launcher stays visible and closed initially. Open it using Enter; cycle forward/backward with Tab; close with Escape and verify focus returns.
2. Select FruitFly XR, connect through the existing source control and receive actual validated frames. The drawer header should reflect selected source, workspace and retained-frame count. Disconnect; retained evidence should remain visible without claiming current activity.
3. Ask a supported retained-frame question. Confirm a local deterministic answer with session/sequences and no network POST to the analysis endpoint. Ask a causal question such as “Why did the decoder enter ESCAPE?” and confirm insufficiency.
4. With retained evidence and a submitted question, explicitly choose Analyze with Meta only when intending to spend provider credits (or use fake mode). Observe pending status and one request. Close/reopen and navigate through inline Evidence/full analysis; neither operation should repeat it. Reuse the exact question/window and verify the accepted result is reused.
5. In an offline browser interception, inject provider failure; local evidence must remain and Retry must require a click. Receive newer frames while a frozen answer is open; its question/window must not silently advance.
6. Open FruitFly Compare and verify matched-trial requirements. Use its explicit Synthetic Fixture action; verify the source changes deliberately while both sources' retained state remains available.
7. In Synthetic Observatory, submit an assistant question, review it in the main form and explicitly run the existing experiment. Compare and Evidence must contain measured fixture results with provenance; the assistant must not manufacture a new result.
8. Check desktop at 1920×1080 and 1440×1080 and mobile at 390px. The drawer should scroll internally, keep input/close controls reachable and produce no horizontal page overflow.

Ready for review. **No commit was made.**
