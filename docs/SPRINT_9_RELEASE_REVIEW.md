# Sprint 9 — Meta hackathon release review

Date: October 29, 2026. Branch: `release/meta-hackathon-2026`.

Commit/tag: **pending — NO COMMIT MADE**. All release changes are left uncommitted.

## Objective and release changes

Prepare a judge-readable, reproducible release candidate under feature freeze. No new scientific feature, model, infrastructure, deployment, or FruitFly XR modification.

- Rewrote README around value, Meta's role, first-run commands, and the full experiment loop; added compact Mermaid architecture and explicit trust/limitations.
- Documented live calibration (prior 60-frame SAM result / 0.48755208333333333) separately from the offline four-frame geometry fixture (0.640). Fake Muse mode does not disable live SAM.
- Expanded pre-hackathon vs event-work disclosure. Added dedicated attribution and transformations for the existing published anatomy asset, with Apache-2.0 / CC BY 4.0 / dependency license boundaries.
- Clarified `.env.example` and ignored root run-diagnostic downloads and common local browser-report directories.
- Fixed a critical accessibility issue in `MetaRequestLabel`: wrapping idle button text in `role="status"` hid the accessible name from browser role queries. Status semantics now apply only while pending; actionable design/explanation controls expose their names. Pending feedback/duplicate protection remain covered by existing tests.

## Documentation created

- `docs/DEMO_RUNBOOK.md`: exact offline/live commands, optional prebuilt local integration, canonical 16-step flow, and recovery table.
- `docs/DEMO_SCRIPT.md`: 2:58 narration aligned with actual UI and scientific scope.
- `docs/HACKATHON_SUBMISSION.md`: candidate submission fields and explicit pre-existing-work/open-source disclosure.
- `THIRD_PARTY_NOTICES.md`: existing public-data provenance, creators, license, export/display changes, and dependency boundaries.
- This release review. Existing `docs/HACKATHON-DISCLOSURE.md` was expanded; useful historical sprint docs/screenshots were retained.

## Security and repository audit

- Started with a clean tree on the requested branch. Read AGENTS.md and local Next.js installation, environment, component, and accessibility guidance.
- Scanned tracked text and all 25 reachable Git revisions / 406 unique text blobs for provider-key/private-key signatures and credential assignments without printing secret values. No real credential detected; reviewed candidates were environment references or deliberate test placeholders. This is a heuristic text audit, not a guarantee about every possible encoding or image.
- Only `.env.example` is tracked across history; local `.env.local` is ignored and was not opened or overwritten. No secret was printed. No credentials, private media, or proprietary code/assets were added.
- `package.json` and lockfile root dependencies/devDependencies match; package scripts were inspected and required commands executed. No dependency changes. `npm audit --omit=dev --json`: **0 advisories** at audit time. Checked direct dependency license declarations/notices, including SAM License and Mediabunny MPL-2.0.
- Largest tracked asset is the intentional 3.75 MB public anatomy JSON; no tracked file exceeds 5 MB. Kept `public/perception-calibration.mp4`. Existing review captures are sprint evidence, not new validation artifacts. New harness/export/screenshot/report files stay in ignored `tmp/sprint-9/`.
- Critical external links returned anonymous HTTP 200: project GitHub, SAM segmentation/client libraries, MaleCNS project/download, neuPrint, CC BY license, upstream data-derivation repository. Origin matches the documented clone URL. Local Markdown targets were checked across README, notices, and sprint docs.
- Diagnostics intentionally include question/evidence/AI prose; the runbook directs review before sharing. No live SAM/Muse call or external brain session was initiated in this release.

## Validation

Final required checks after the accessibility correction: `npm test` **314 passed** (273 library + 41 component), `npx tsc --noEmit` passed, `npm run lint` passed. `npm run build` passed; final `git diff --check` passed. All 137 local Markdown file targets resolve (150 links examined); `npm ls --depth=0` passed.

One offline browser acceptance scenario completed at **1440×1080**, with **45 assertions**, one ignored desktop capture and no screenshot matrix. Covered explicit fixture loading, locked amplitude, approval gate, matched measured results, compare playback, offline interpretation/next proposal, trust checks, downloaded JSON schema/run ID/events, Evidence retention, static Live Connectome/disconnected status, next-question review without auto-design, and no horizontal overflow/runtime errors. Real app routes were used with fake providers. Initial harness import/selector/collapsed-details assertions needed correction; the unnamed action discovered during that work triggered the release fix. A focused browser accessibility recheck on the rebuilt app passed: browser role queries now expose both action names, keyboard Enter activates each, pending live status/disabled/aria-busy behavior remains intact, and only the explicit design/run/interpret actions occur. No second full acceptance scenario or additional capture was needed.

No automated validation uses live SAM or Muse. Optional FruitFly binary/data prerequisites were checked for existence only; the external service/client was not launched or modified.

## Remaining top five submission risks

1. Live Meta account access, latency, and fresh SAM geometry can vary; the historical 60-frame / 0.488 result was not rerun in this release. Use the disclosed offline fallback if needed.
2. Browser/server state is ephemeral. Restarts, reloads, expiry, or eviction can require fresh perception/design; exports do not replace server verification.
3. Moving Live Connectome telemetry depends on the separate pre-existing brain server, graph artifact, and external session; structure-only is the fallback.
4. Scientific scope is a small synthetic fixture and observational simulated connectome telemetry. Neither establishes biological validity; AI prose still requires review.
5. Final recorded video, organizer portal requirements, and submission fields/links need owner review. The release remains uncommitted/untagged by instruction; no submission or deployment was performed.
