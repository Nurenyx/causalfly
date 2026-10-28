# Sprint 5.6 — Ask the Simulation

Implemented and validated October 28, 2026. No commit was made. Pre-existing uncommitted Sprint 5.4, 5.5 and 5.5A work was preserved. FruitFly XR and the simulation engine were not modified. No live Meta request occurred.

FruitFly Observatory now leads with **ASK THE SIMULATION** and **What do you want to understand?** It provides a large question composer, five clickable observational suggestions, the source-specific ASK → OBSERVE → TRACE → TEST NEXT workflow, a retained-session summary and the existing interactive verified-soma visualization in a compact right column. The disconnected empty state provides Open Live Session and Connect FruitFly XR. Question submission is disabled until retained evidence exists.

Submitted questions are retained exactly, separately from the synthetic question and the editable FruitFly draft. Submission opens observational AI Scientist and performs no IO. It cannot invoke the synthetic experiment handler, reconnect telemetry, run FruitFly XR or request Meta. AI Scientist places QUESTION ASKED and WHAT THE EVIDENCE SHOWS before session metadata. Existing telemetry, decoder channels, received observation window, interpretation, scientific limit and follow-up suggestions remain accessible. The disabled future Meta control reads **Analyze this question with Meta** and describes sending the question plus retained evidence.

The interpreter is a pure, typed function returning the original question, intent, sufficiency, summary, evidence facts, missing evidence and session/frame references. It has no model, provider or transport dependency. This is the boundary for a future observational interpreter; provider wiring remains absent.

| Exact intent | Implemented behavior |
| --- | --- |
| `DECODER_CHANGE` | Received same-session transitions, preceding received frame, sequence/tick/model time, supplied spike counts and input-reference values. Named target states are respected. A latest-state question uses the latest supplied output. An ESCAPE state already present in the first received frame does not establish a transition. |
| `SPIKE_COUNT` | Maximum supplied per-tick spike-event count over retained received frames; all tied frames are identified. Uses total supplied events, not the truncated display count. |
| `ACTIVITY_CHANGE` | First/last supplied spike-event counts and active simulated neuron counts over the retained window, with explicit endpoint and gap limits. |
| `INPUT_REFERENCE` | Supplied reference-ID changes and freshness; missing references are insufficient. A change-before-decoder question requires an earlier received reference change. Changes within one received interval cannot establish their order. |
| `STREAM_STATE` | Actual transport state and retained/freshness status; retained snapshots do not establish current activity. |
| `NEXT_EXPERIMENT` | Existing deterministic evidence-conditioned suggestions, labelled as suggestions rather than findings. |
| `GENERAL_SESSION` | Explicit session-summary/evidence-availability requests, using supplied telemetry only. |
| `UNSUPPORTED` | Exact insufficient-evidence sentence, available evidence and missing measurement/session explanation. |

Unsupported requests include biological/physical behavior claims, causal mechanisms, named neuron/population activity without verified identities, synaptic quantities, stimulus contents, correlations/predictions, unrelated questions, unimplemented count statistics and narrower or cross-session windows. Conservative keyword handling intentionally declines these instead of silently substituting a maximum or aggregate activity answer. Even recognized intents report insufficient evidence when required history is absent. Missing ticks are never interpolated.

The exact source/test files changed in this sprint are below. Several were already untracked or modified by previous sprints; the list describes this sprint's incremental work, rather than attributing the whole dirty tree to Sprint 5.6.

| File | Sprint 5.6 change |
| --- | --- |
| `src/app/observatory.tsx` | FruitFly-specific draft/submitted question routing and Observatory heading; synthetic submission remains unchanged. |
| `src/app/components/fruitfly-observatory.tsx` | New question-driven Observatory, suggestions, workflow, empty state, supplied metrics and compact verified-coordinate preview. |
| `src/app/components/observatory-preview.tsx` | Remove the former navigation-led FruitFly landing; synthetic workflow/preview retained. |
| `src/app/components/source-analysis-workspace.tsx` | Pass the submitted FruitFly question across the source-specific route boundary. |
| `src/app/components/fruitfly-analysis.tsx` | Prominent exact question/local answer, missing-evidence explanation and future Meta copy. |
| `src/app/components/source-workspaces.css` | Scoped FruitFly composer, preview, summary and question-answer presentation; responsive sizing. |
| `src/app/components/source-analysis-workspace.test.tsx` | Exact-question/unsupported rendering checks and updated disabled-Meta assertions. |
| `src/lib/web/dashboard.ts` | Separate FruitFly draft/submitted question transitions; preserve synthetic question/result. |
| `src/lib/web/observational-analysis.ts` | Include the retained snapshot, deduplicate/sort received frames and constrain history by session, sequence, tick and model time. |
| `src/lib/web/observational-question.ts` | New deterministic intent/answer layer and source-specific examples. |
| `src/lib/web/observational-question.test.ts` | 24 offline tests for question state, intent handling, supplied maxima, transitions, references, gaps and unsupported requests. |

Additional deliverables are this report, the ten screenshots listed below, `docs/review/sprint-5-6/observatory-contact-sheet.png` and `docs/review/sprint-5-6/verification.json`. Temporary review scripts, raw received snapshots and command logs are under ignored `tmp/sprint-5-6/`. No dependencies were added.

| Required validation | Result |
| --- | --- |
| `npm test` | PASS — **206 tests**, 193 library/API tests plus 13 component tests, zero failures. 26 tests added in this sprint. |
| `npm run experiment:demo` | PASS — deterministic matched comparison, peak 1 → 0.5, threshold crossing step 3 → 4. |
| `npm run experiment:ai-demo -- --fake` | PASS — fake-only design/interpretation; support remains null/unassessed. |
| `npm run lint` | PASS. |
| `npm run build` | PASS — compilation, TypeScript and prerendering. |
| `git diff --check` | PASS — normal LF/CRLF notices only. |
| Production browser review | PASS — five required states at 1920×1080 and 1440×1080; no horizontal overflow, no unhandled browser errors. |
| Question/network boundaries | PASS — zero POST requests during FruitFly questions/navigation; one explicit telemetry subscription; no question-triggered connection or rerun. |
| Source switching | PASS — retained synthetic measurements, synthetic question, FruitFly snapshot and FruitFly question survive switching. Synthetic Compare/AI Scientist remain experiment-based. |
| Live Meta | **Zero calls.** Browser review explicitly uses `CAUSALFLY_FAKE_META=1`; the only experiment POST is a synthetic fake-mode regression run. Browser external requests: zero. |
| FruitFly XR / engine / commit | FruitFly XR working tree clean before/after; no engine changes; no commit. |

Visual review used the existing local FruitFly server and unchanged built BrainClient. The UI itself only subscribed to observational telemetry. Final screenshots use a genuinely received and then disconnected retained snapshot: session `983e8b31-88d5-4eac-af2c-6755a179f407`, four retained frames, latest sequence/tick 4, model time 200 ms. The latest frame supplied 3,314 simulated spike events, 59,294 active simulated neurons and a 512-event truncated display sample. The supported question correctly found **3,317** supplied events in received frame/tick 3 at model time 150 ms, rather than returning the latest count. These are simulation quantities, not living-fly recordings.

The preview used 141,781 verified published soma coordinates and highlighted only mapped supplied IDs. It retains drag/zoom/pan and projection/raster alternatives. No connections or anatomy were inferred. Main purpose, question composer, preview and primary metrics are visible without scrolling at 1920×1080; secondary links and the full Scientist detail naturally extend below the initial viewport.

| Required screenshot | 1920×1080 | 1440×1080 |
| --- | --- | --- |
| FruitFly Observatory — disconnected / no evidence | [PNG](review/sprint-5-6/fruitfly-no-evidence-1920x1080.png) | [PNG](review/sprint-5-6/fruitfly-no-evidence-1440x1080.png) |
| FruitFly Observatory — retained telemetry | [PNG](review/sprint-5-6/fruitfly-retained-1920x1080.png) | [PNG](review/sprint-5-6/fruitfly-retained-1440x1080.png) |
| FruitFly AI Scientist — supported question | [PNG](review/sprint-5-6/fruitfly-supported-question-1920x1080.png) | [PNG](review/sprint-5-6/fruitfly-supported-question-1440x1080.png) |
| FruitFly AI Scientist — unsupported question | [PNG](review/sprint-5-6/fruitfly-unsupported-question-1920x1080.png) | [PNG](review/sprint-5-6/fruitfly-unsupported-question-1440x1080.png) |
| Synthetic Observatory regression | [PNG](review/sprint-5-6/synthetic-observatory-1920x1080.png) | [PNG](review/sprint-5-6/synthetic-observatory-1440x1080.png) |

[Synthetic vs FruitFly contact sheet](review/sprint-5-6/observatory-contact-sheet.png) · [Browser verification record](review/sprint-5-6/verification.json).

The final contact sheet and the required desktop states were visually inspected. Synthetic Observatory's entire main workspace has **zero changed pixels above a 12/255 channel threshold** against the existing Sprint 5.5 1920×1080 measured-result screenshot. The 2,886 changed pixels are confined to the sidebar, whose source-scope copy was already changed in Sprint 5.5A. This comparison is a visual regression check, not a new scientific validation.

Review caught and corrected a compact-preview flex-height collapse. The review preview initially used the brain endpoint's port 8765; it was corrected to the existing observational port 8766. An initial screenshot paint race was resolved by waiting for fonts and rendering to settle before capture. No source checks or protocol rules were relaxed. The final production preview is available at <http://127.0.0.1:3116/> in fake Meta mode.

Validation is complete. Work stopped without committing.
