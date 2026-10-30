# Sprint 8B: short-video perception

The Experiment defaults to Synthetic. Real-world perception is an optional section of the same experience. No source selection, file selection, rendering, run, or interpretation automatically calls SAM. Click **Discover with Meta** for explicit Muse Spark scene understanding, choose a candidate or enter a concept manually, then click **Track [concept] with SAM 3.1** to upload for tracking, then **Design Experiment With This Stimulus** for an explicit Muse design using the retained input (or **Use as Experiment Stimulus** if a design exists), then **Approve & Run Experiment**. Request Muse interpretation separately. Successful analysis collapses the upload form; **Change Video** reopens it without replacing the retained track until a new analysis succeeds.

## API and media

`POST /api/perception` accepts multipart `video` and `concept` with a UUID `X-Perception-Request` token. It bounds the entire body, validates MP4/MOV, and uses Mediabunny to read actual display dimensions and presentation timestamps before uploading. Limits: 20 MiB, 15 seconds, 900 frames, 1920 pixels per side, at least two distinct frames. Unsupported codecs can fail browser playback; H.264 MP4 is the recommended export.

The server reuses `readMetaEnvironment` / `readLiveConfiguration` and the existing server-only `META_API_KEY`. SAM fixes the model to `sam-3.1` and requires the official `https://api.meta.ai/v1` base; no additional secret variable. Muse's `META_MODEL` stays separate. The existing OpenAI SDK transports `POST /files` (`purpose=user_data`, one-hour expiration) and `POST /responses` (`input_video.file_id`, streaming, one-bit masks). Its public transport permits Meta's video extension without pretending it is an OpenAI Responses input type. The official `@meta-sam/parser` decodes the special-token grammar. No manual grammar parser. No automatic retries. A total request deadline bounds upload and segmentation.

Uploaded Meta files are deleted in `finally` on success or failure. Successful results retain cleanup status; a failed deletion uses the one-hour expiration backstop. Media bytes, filenames, raw response text, and masks are never written to disk by the server. The browser receives only the chosen track's returned masks/boxes for the official `@meta-sam/react` frame-accurate player. Masks are neither invented nor inferred from boxes. Geometry-only input records are retained in a bounded process-local store for two hours. A valid 8B.1 receipt outlives lookup expiry; a genuine server restart requires reanalysis and a new design. Design/evidence retention follows the existing process-local workflow.

Sprint 8B.1 adds workspace-owned browser retention and a server-authenticated receipt alongside the returned record. The compressed HMAC receipt retains the exact server-issued record for 12 hours, independently of lookup eviction. Subsequent `design`/`stimulus` actions verify it before any model request or spec assignment. The process-global signing key and map survive module reloads; a genuine process restart invalidates receipts and exposes a clear re-analysis path. No additional environment secret or durable persistence is introduced. Experiment request bodies are bounded at 512,000 bytes to accommodate receipts (maximum 384,000 characters); decoded receipt data is bounded at 2 MiB. The question limit remains 8,000 characters. Browser state survives panel navigation and rerenders, not full page reloads.

Authoritative references: [SAM requests](https://dev.meta.ai/docs/sam/segmenting), [official parser and playback](https://dev.meta.ai/docs/sam/client-libraries), [file cleanup and expiry](https://dev.meta.ai/docs/file-handling).

## Deterministic rule: box-expansion-v1

1. Group returned boxes by SAM object ID. Select the longest observed track; break ties by the lowest numeric ID. Never combine identities. Sort by explicit frame index, retaining gaps without interpolation.
2. For each half-open pixel box, compute `area = (right-left)*(bottom-top)/(width*height)`, `centroidX = (left+right)/(2*width)`, and `centroidY = (top+bottom)/(2*height)`.
3. `areaChange[i] = area[i]-area[i-1]` and `areaGrowthPerSecond[i] = areaChange[i]/(timestamp[i]-timestamp[i-1])`. The first sample has zero change and growth. Timestamps come from the actual container, including variable frame rate.
4. `netAreaChange = lastArea-firstArea`; `expansion = max(0, netAreaChange)`; `amplitude = clamp(expansion/0.5, 0, 1)`. There is no rounding before execution. UI decimals are display only.

This maps 50 percentage points of net apparent box growth to full synthetic amplitude. A static or shrinking track maps to zero; camera motion, occlusion, rotation, and non-monotonic growth can confound this simple proxy. It is not biological angular expansion, distance, or approach velocity. No camera calibration is assumed. First/last are first/last *detected* frames, not necessarily clip endpoints.

`POST /api/experiments` action `stimulus` takes a retained design ID and `perceptionId` (or null for Synthetic). It accepts neither client-authored geometry nor amplitude. It creates a fresh validated specification and draft, copies no measurements or interpretation, and requires an explicit subsequent run. The derived amplitude is locked; switching to Synthetic restores the original proposal's amplitude with a fresh draft. Both conditions receive the same approved input. Previously issued evidence remains immutable. Even equal amplitudes with different provenance receive fresh designs.

## Trust boundary

- META SAM 3.1 — PERCEPTION: detects, segments, tracks.
- CAUSALFLY — DETERMINISTIC MEASUREMENT: computes visual features and mapping.
- CAUSALFLY ENGINE: executes matched control and intervention and measures results.
- META MUSE — EXPERIMENT DESIGN / INTERPRETATION / NEXT EXPERIMENT: proposes and explains, without assignment into input measurements, TrialResult, or ExperimentComparison.

`perceptionInput` is separate input provenance, never causal evidence. It includes concept, model, mode, SHA-256, source dimensions/timestamps, selected track and features, formula, amplitude, parser, provider IDs when present, and request timestamps. Evidence exposes it under Perception Details. Muse receives this frozen context with instructions that it cannot change it; its output remains a separate validated ScientificAnalysis.

Scientific wording: “Visual input segmented by Meta SAM 3.1 and deterministically mapped into a synthetic experiment stimulus.” This does not establish that a biological fruit fly perceived the object.

## Offline validation and one live smoke

**Offline validation → Load OFFLINE SAM FIXTURE** is an explicit separate JSON request (`{"mode":"fixture"}`), produces its own labelled diagram, and never overlays fake geometry onto user media. A live failure never selects it. Automated transport tests inject SSE and Files responses; no automated validation calls Meta. The generated `public/perception-calibration.mp4` contains only an approaching red square and is non-sensitive, synthetic calibration media; it is not recorded real-world footage.

Run targeted tests with `npx tsx --conditions=react-server --test src/lib/perception/*.test.ts src/lib/meta/sam-client.test.ts src/lib/web/perception-action.test.ts` and component tests with `npx tsx --test src/app/components/perception-panel.test.tsx`. Full validation: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`.

For browser integration review, start a separate production preview with `CAUSALFLY_FAKE_META=1` on port 3117 and run `node scripts/sam-browser-review.mjs`. It requires Playwright (the bundled Codex runtime is the default; override with `CAUSALFLY_PLAYWRIGHT_MODULE`) and Edge. All non-fixture perception requests are intercepted; mock identity is explicitly labelled MOCK. Fixture design, approval, run, interpretation, Evidence, source reset, and changed-receipt rejection use actual application routes. No screenshot matrix is generated. Override the target with `CAUSALFLY_REVIEW_URL`.

`npm run sam:smoke -- --live` explicitly performs one SAM request using the generated calibration video and concept `red square`. Optional positional clip and concept arguments select other media. It prints only detection status/count, derived amplitude, model, and cleanup; no key, media, masks, or raw response artifacts. It is not part of automated validation. No deployment or commit is part of this sprint.

Sprint 10C adds an independent `META_SCENE_MODEL` and validated, media-bound concept selection ahead of this unchanged tracking/measurement pipeline. See [Meta perception orchestration review](SPRINT_10C_META_PERCEPTION_ORCHESTRATION_REVIEW.md). The current offline browser harness is `node scripts/meta-perception-browser-review.mjs`; older review scripts describe their historical UI.
