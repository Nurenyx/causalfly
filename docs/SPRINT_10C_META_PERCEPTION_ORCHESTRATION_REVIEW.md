# Sprint 10C — Meta perception orchestration review

Latest correction: [Sprint 10C.1 first-time UX review](#sprint-10c1--first-time-user-ux-correction).

Date: 2026-10-30 (America/Toronto). Branch: `feat/sprint-10c-meta-perception-orchestration`.
Started from the clean Sprint 10B high-fidelity checkpoint. FruitFly XR and its
bridge, observational workflow, anatomy and assets were not modified.
**NO COMMIT MADE.**

## Architecture and explicit-call boundaries

```text
User chooses supported video                         [local only]
  → DISCOVER WITH META                               [explicit Muse Spark call]
  → strict structured candidates                     [no SAM call]
  → user selects a radio / enters a manual concept    [local only]
  → TRACK [CONCEPT] WITH SAM 3.1                      [explicit SAM call]
  → CausalFly measures box expansion                  [deterministic]
  → user accepts derived input / requests design      [explicit Muse Wonder call]
  → user approves matched controlled trials           [engine only]
  → user requests explanation                         [explicit Muse Wonder call]
  → next test is a proposal                            [new approval required]
```

The existing Research Cockpit is retained. Scene candidates occupy the existing
world-panel perception section; the selected card and dominant tracking button
are checked for actual visibility. During PERCEIVE the fly has less vertical room;
acceptance restores attention to the embodied world. Local preview and accepted
track media sit behind disclosures. Ask CausalFly remains the assistant interface.
The scientist rail names scene understanding, experiment design, evidence
interpretation and next experiment without introducing another personality.

## Verified API and exact model configuration

Official Meta docs were inspected before implementation:
[model catalog](https://dev.meta.ai/docs/models),
[video understanding](https://dev.meta.ai/docs/video-understanding),
[Responses API](https://dev.meta.ai/docs/protocols/responses),
[structured-output cookbook](https://dev.meta.ai/docs/cookbook/structured-output).
Installed Next.js 16.4.3 route/form and Playwright guides were also read.

| Task | Configuration used |
| --- | --- |
| Scene understanding | `META_SCENE_MODEL=muse-spark-1.3` |
| Experiment design / interpretation | Existing `META_MODEL=muse-wonder-1.0`, unchanged |
| Tracking | Existing `sam-3.1`, unchanged |
| Endpoint | Existing `META_BASE_URL=https://api.meta.ai/v1` |
| Credential | Existing server-only `META_API_KEY`; no credential copied into source or report |
| Offline scene model | `calibration-scene-v1`, provider `CausalFly fixture` |

The scene setting is explicit in `.env.example` and was added to ignored
`.env.local` for this review. No scene-model fallback or inferred identifier exists.
The existing `MetaClient.complete` design/interpretation behavior is preserved;
scene video input has a separate server-only adapter using the same SDK and key.

The adapter uploads the retained browser File under a generic filename, with
`purpose=user_data` and one-hour expiry, then submits `input_file.file_id` to
Responses. It uses documented `text.format: {type: "json_schema", name:
"trackable_scene", strict: true, schema: ...}` and a 2,000-output-token budget.
The entire short clip preserves temporal context; no visual motion measurement is
invented from an isolated frame. The clip can include its original audio.
SDK retries are disabled. Upload deletion runs on success/failure with expiry as
the backstop; this sprint does not persist scene media on disk.

## Strict scene contract

```ts
{
  summary: string; // 1–400 trimmed characters
  candidates: Array<{ // 0–5; unique SAM concepts
    label: string; // 1–80 characters
    samPrompt: string; // 1–80; letters, digits, spaces, apostrophes, hyphens
    reason: string; // 1–400 characters
    confidence: number; // finite, 0–1, uncalibrated
  }>;
  limitations: string[]; // 1–5 entries, 1–400 characters each
}
```

Local Zod validation remains authoritative even with constrained decoding.
Unknown fields, markdown fences, bad JSON, oversized text, duplicate prompts,
wrong types, out-of-range confidence and more than five candidates are rejected
without repair. Candidates below 0.5 are withheld; no remaining candidates yields
specific manual-entry recovery. This threshold is a presentation policy, not a
calibrated reliability guarantee. The first candidate is suggested, never selected
automatically. The server cannot verify the factual correctness of model prose.

## SAM handoff and provenance

`POST /api/perception/scene` validates a UUID request token, same origin, bounded
multipart body, video type/size and actual container dimensions/timestamps. Limits
remain MP4/MOV, 20 MiB, 15 seconds, 900 frames, 1920 px per side, two distinct frames.

An immutable server scene stores attribution, candidates and media SHA-256 under
an opaque ID. The map holds at most 100 scenes for two hours. Tracking revalidates
the scene ID, exact uploaded bytes and selected index before invoking SAM with
only that candidate's `samPrompt`. A separately marked manual override uses the
same concept schema. Missing/expired suggestions fail closed; the UI clears stale
selection and opens manual recovery. Changed videos clear the draft candidates.

Existing SAM upload, parser, masks/boxes, track-selection rule, signed receipt,
measurement formula, diagnostics, acceptance and error recovery are preserved.
The measurement is still:

`amplitude = clamp(max(0, lastArea - firstArea) / 0.5, 0, 1)`.

Scene provider/model/mode and confirmed concept are stored inside the signed
perception provenance, independently of engine evidence.

## Errors, stale requests and Flight Recorder

Muse configuration, provider failure, malformed/refused/incomplete result,
unsupported media and no useful candidates have distinct safe messages and
manual/retry recovery. SAM failures remain separate and retain candidate selection
so the user can retry, refine or choose another concept. Existing expired SAM
receipt recovery is unchanged. Provider internals and credentials are not echoed.

Browser request gates synchronously block duplicates and invalidate late responses
on replacement/unmount. Server tokens suppress in-flight and recently completed
duplicates. Retry always has a new explicit token. No automatic paid retries exist.

Flight Recorder adds `meta.scene.requested`, `meta.scene.completed`,
`meta.scene.failed`, and `meta.scene.selected`. Request/confirmation codes identify
explicit user actions. Metadata allowlists include provider/model/mode, scene ID,
selection type, confirmed concept, candidate count and SAM result reference.
The scene run ID continues through SAM, stimulus derivation/acceptance, design,
deterministic matched trials, interpretation and proposed next experiment.
Diagnostics omit media, filenames, masks, hidden prompts, raw model responses and
raw provider errors. Retention remains local demo infrastructure, not durable audit.

## Offline demo and scientific boundary

**OFFLINE SCENE-UNDERSTANDING FIXTURE** is always explicitly labelled. It is valid
only for the exact `public/perception-calibration.mp4` bytes, checked by hash.
That clip contains one growing red square, so the fixture returns one candidate
instead of inventing extra objects to fill three slots. Its confidence of 1 is an
authored fixture value. It is never a fallback after a live failure.

The independent OFFLINE SAM FIXTURE retains synthetic geometry in its own diagram;
it never paints fake detection masks over the calibration clip. Its 8% → 40%
geometry yields amplitude 0.640. The actual deterministic engine then measures
control 0.64 vs intervention 0.32. The offline interpretation is labelled as a fixed
template throughout. `CAUSALFLY_FAKE_META=1` controls experiment templates; live
discovery and tracking still require their own explicit requests.

**META PERCEIVES / PROPOSES / INTERPRETS · CAUSALFLY MEASURES · USER APPROVES.**
Scene understanding is descriptive; tracking is input perception; box expansion
is a proxy; controlled trials use the separate synthetic network. No neural activity
is measured by SAM/Muse. No living-fly response, looming-circuit validation or
biological causation is established. The cockpit retains
**REAL-FLY VALIDATION — Not established**.

## Validation and live smoke

Final full suite: **343/343 passed** (296 backend/domain + 47 component tests),
run once after implementation fixes. Zero paid calls in automated validation.
Targeted checks cover schema, malformed/empty results, caps, immutable retention,
expiry, exact SAM handoff, manual override, failures, request duplication, stale
responses, event correlation, fixture labels and explicit action-only behavior.

TypeScript: passed. Lint: passed. Production build: passed (Next.js 16.4.3).
`git diff --check`: passed. The production browser review passed all 12
state/width combinations, card/CTA visibility checks, and explicit-action recovery
checks with zero paid provider calls and zero page errors. Browser acceptance covers four states at
1920/1440/390, plus card/CTA visibility, no automatic requests, safe failures,
offline design/run/interpretation and zero page errors.

**Exactly one live Muse scene-understanding smoke performed; no retries.**
Model: `muse-spark-1.3`. Valid structured candidates: **yes**. Latency: **14370 ms**.
Candidate label: **central red square**. No SAM or Wonder live call was made.
See [safe smoke record](review/sprint-10c/live-smoke.json). Live calls stopped after this result.

## Exactly five screenshots

All screenshots use the explicit offline scene/geometry and experiment templates;
none purports to show a live SAM detection or live Muse interpretation.

1. [Video selected / Discover](review/sprint-10c/01-video-selected-1920.png)
2. [Candidate selection](review/sprint-10c/02-scene-candidate-selection-1920.png)
3. [Offline tracking + derived stimulus](review/sprint-10c/03-tracked-derived-stimulus-1920.png)
4. [Completed experiment + offline interpretation](review/sprint-10c/04-completed-meta-interpretation-1920.png)
5. [Mobile candidate selection](review/sprint-10c/05-mobile-candidate-selection-390.png)

Browser checks: [JSON](review/sprint-10c/browser-checks.json).

## Top three weaknesses

1. Model suggestions and confidence are uncalibrated. Structural validation cannot
   prove visible grounding; camera motion, occlusion and box identity remain confounders.
2. Scene/recorder maps and receipt keys are process-local. Multi-instance hosting
   needs shared retention and user ownership/authentication before production use.
3. Offline tracking is illustrative geometry, not live SAM validation. This sprint's
   live allowance covers Muse only; complete live Spark → SAM → Wonder orchestration
   has not been exercised end to end. Full short-video uploads also cost more than
   a future validated frame-sampling strategy might.

## Changed-file inventory and diff

Exact version-control-visible inventory (18 modified + 21 new files):

```text
.env.example
README.md
docs/META-INTEGRATION.md
docs/SPRINT_10C_META_PERCEPTION_ORCHESTRATION_REVIEW.md
docs/review/sprint-10c/01-video-selected-1920.png
docs/review/sprint-10c/02-scene-candidate-selection-1920.png
docs/review/sprint-10c/03-tracked-derived-stimulus-1920.png
docs/review/sprint-10c/04-completed-meta-interpretation-1920.png
docs/review/sprint-10c/05-mobile-candidate-selection-390.png
docs/review/sprint-10c/browser-checks.json
docs/review/sprint-10c/live-smoke.json
docs/sam-perception.md
package.json
scripts/meta-perception-browser-review.mjs
scripts/meta-scene-smoke.ts
src/app/api/perception/scene/route.ts
src/app/components/guided-experiment.test.tsx
src/app/components/guided-experiment.tsx
src/app/components/perception-panel.css
src/app/components/perception-panel.test.tsx
src/app/components/perception-panel.tsx
src/app/components/research-cockpit.tsx
src/lib/meta/client.ts
src/lib/meta/scene-client.test.ts
src/lib/meta/scene-client.ts
src/lib/perception/contracts.ts
src/lib/perception/scene-store.test.ts
src/lib/perception/scene-store.ts
src/lib/perception/scene.test.ts
src/lib/perception/scene.ts
src/lib/web/flight-recorder-types.ts
src/lib/web/flight-recorder.test.ts
src/lib/web/flight-recorder.ts
src/lib/web/perception-action.ts
src/lib/web/perception-request.test.ts
src/lib/web/perception-request.ts
src/lib/web/perception-session.ts
src/lib/web/scene-action.test.ts
src/lib/web/scene-action.ts
```

Ignored local configuration also changed: `.env.local` gained only the separate
`META_SCENE_MODEL=muse-spark-1.3` line; its credentials remain ignored.
Local preview: http://127.0.0.1:3121 (production build; offline experiment mode).

`git diff --stat` (tracked modifications only; new files above remain untracked,
not staged):

```text
.env.example                                  |  1 +
 README.md                                     |  9 ++-
 docs/META-INTEGRATION.md                      | 51 ++++++++++++++++
 docs/sam-perception.md                        |  4 +-
 package.json                                  |  3 +-
 src/app/components/guided-experiment.test.tsx |  2 +-
 src/app/components/guided-experiment.tsx      |  4 +-
 src/app/components/perception-panel.css       | 42 +++++++++++++
 src/app/components/perception-panel.test.tsx  | 21 +++++++
 src/app/components/perception-panel.tsx       | 85 ++++++++++++++++++++-------
 src/app/components/research-cockpit.tsx       | 13 ++--
 src/lib/meta/client.ts                        |  2 +
 src/lib/perception/contracts.ts               |  2 +
 src/lib/web/flight-recorder-types.ts          |  5 +-
 src/lib/web/flight-recorder.test.ts           |  2 +-
 src/lib/web/flight-recorder.ts                |  9 ++-
 src/lib/web/perception-action.ts              | 37 +++++++++---
 src/lib/web/perception-session.ts             |  4 ++
 18 files changed, 248 insertions(+), 48 deletions(-)
```

No commit, push, deployment, or FruitFly XR modification was made.

## Sprint 10C.1 — First-time user UX correction

Continues the same branch and uncommitted Sprint 10C tree. The existing cockpit,
Meta/SAM explicit actions, deterministic engine, signed perception and scientific
boundaries are retained. No FruitFly XR backend, bridge, protocol, telemetry source,
published coordinates or GLB assets changed. No live Meta/SAM/XR service requests
were made for this correction. Browser telemetry is an explicitly offline replay.

### First-time actions and retained state

- The retained question is ordinary display text with a clear **Ask Your Own
  Question** entry. Edit mode has a bordered textarea and one yellow **USE THIS
  QUESTION** action; Ctrl+Enter also submits. Save returns to retained display and
  makes **Design with Meta** the next action. Neither editing nor submitting calls
  Meta. Editing suspends the rail's competing action until the question is saved.
- Main workflow: **ASK → INPUT → DESIGN → RUN → UNDERSTAND**. INPUT says
  **Optional synthetic or video-derived stimulus**, with a visible synthetic-path
  note that external perception was skipped / not required. Internal perception
  identifiers and the Spark → SAM → CausalFly architecture are unchanged.
- The Scientist rail owns the only **Approve & Run Experiment** button, including
  when its design disclosure is expanded. Embedded run controls are suppressed
  when the rail exists. Ask CausalFly directs the user to the approval control.
- Control/Intervention and their help triggers form one centered pair beneath the
  Neural System visualization. Their pressed state chooses the recorded condition
  for both neural view and embodied playback. SVG/trace space is retained.
- Small body/secondary labels and buttons were increased by roughly 1–2px where
  needed. Monospace metadata treatment and the original column composition remain.
- Experiment, Live Connectome and Evidence now use the same workspace shell:
  176px desktop navigation, matching navigation typography/spacing, and the same
  sidebar, header and page background colours. Mobile uses the same responsive
  navigation on every page. Browser checks compare their computed styles at
  1920, 1440 and 390px, including active navigation styles.
- **Reset View** is restored inside Experiment's 3D viewport. It resets only the
  camera, preserving the selected recorded condition, playback and stimulus.
  The existing playback Reset remains a separate playback action.

### Persistent synthetic input and measured locking

The previous draft was keyed by an optional design ID and ignored changes before
a design existed. Losing/mismatching that key returned the rendered amplitude to
the default. The correction stores synthetic amplitude in the workspace owner,
independently of design IDs, model choice and panel navigation. It starts at 1.0;
slider edits persist before design, across navigation, and after design/run.

Explicit design requests now carry the current synthetic `stimulusAmplitude`.
The server validates 0–1 in 0.05 increments, sends the fixed user-selected amplitude
to the designer as `requestedStimulus`, and assigns that same amplitude to the
validated specification even if the model proposes something else. Provenance
retains the original proposal and selected amplitude; Flight Recorder records
`stimulus.accepted` with `user_selected_synthetic_input`. Matched trials receive
the identical input. Existing run-override API compatibility is preserved.

A draft differing from the retained design displays
**INPUT CHANGED — REDESIGN REQUIRED** and replaces approval/interpretation with an
explicit **Redesign with Meta** action. Previous engine evidence stays retained
and inspectable; it is not presented as a result for the new input. Returning to
the exact original amplitude restores the still-matching design.

SAM-derived input is a read-only **MEASURED / LOCKED** output, rather than an
editable-looking range. No measured override feature was added. Requests combining
a perception result with an arbitrary synthetic amplitude fail before Meta access.
Switching to Synthetic remains the existing explicit way to choose another input.

### Fly models and loading

**Fly model: Anatomical | Lightweight** defaults to Anatomical. While the GLB is
loading, Suspense renders no procedural geometry; a restrained **Loading anatomical
model…** notice is shown in the world. Lightweight is available explicitly and is
the automatic, labelled fallback on anatomical-load failure. Returning to a failed
anatomical selection remains a fallback; this pass does not add a network retry UI.

Both models use the same bounds-derived normalization: 3.6-unit maximum horizontal
span, centered X/Z and ground clearance 0.025. The procedural mesh now uses the
same normalization and the same response translation/lift as the anatomical model.
The selector changes visual state only. It makes no provider request and changes
neither question, stimulus, design, engine evidence, nor recorded condition.

### Connectome canonical camera

The old AABB-corner fit placed the actual cloud at about **44.8% of viewport height**
in landscape views. Empty AABB corners and the cloud's horizontal extent were
constraining the camera despite considerable available vertical space.

The new fit derives a camera-basis representation from **all 141,781 supplied soma
positions**, fits actual projected extents, and recenters their projected bounds.
It targets **78% of the viewport's short axis**, with a 4% NDC edge margin to prevent
clipping on the other axis. At restrictive aspect ratios, preserving every point
takes precedence over the target occupancy. No position is moved or discarded.

Initial load, Reset View, resize and reloaded structural buffers use the same
canonical calculation. Its React effect depends on structural positions, reset
and viewport dimensions, not activity/telemetry. Browser replay confirms that
telemetry does not move an already orbited camera; source re-entry recenters it.
Camera tests project every actual point at desktop/mobile aspects, assert the
78% occupancy and centering, and check that the source buffers are unchanged.

### Accessible context help

The reusable info button covers **Input, Stimulus strength, Control, Intervention,
Recorded signal, and Real-fly validation**. It opens on hover, keyboard focus and
click/touch; Escape dismisses it. Each button has an accessible label,
`aria-describedby`, expanded state and a linked `role=tooltip`. Text is concise,
viewport-clamped and optional to understanding the primary action. Validation help
uses the stricter existing claim: this is a synthetic engineering model whose
predictions have not been validated against living flies.

### Validation and five captures

- **355/355 tests pass**: 304 backend/library + 51 component tests, including
  draft persistence/staleness, fixed synthetic amplitude, measured locking,
  question submission, single approval, model normalization and actual-cloud fit.
- Targeted regression checks, `npx tsc --noEmit`, lint, production build and
  `git diff --check` pass. The final build uses Next.js 16.4.3.
- Production browser review at `http://127.0.0.1:3123` uses `CAUSALFLY_FAKE_META=1`:
  15 responsive/style checks at 1920, 1440 and 390px, no horizontal overflow,
  matching shell styles, camera-only Experiment reset, anatomical loading/toggle/
  failure fallback, local question submission, persistent input/redesign/single
  approval, condition selection, non-overlapping chart legend/controls, tooltip
  interactions, and initial/reset/resize/source-reload connectome fitting.
- Browser replay confirms telemetry preserves an orbited connectome camera.
  Provider calls: **zero paid calls**; page errors: **zero**. No FruitFly XR source,
  geometry or running experiment was modified. All five captures were visually
  inspected. The original Sprint 10C live smoke remains the only live call in
  this combined work; this UX correction made no live Meta/SAM calls.

Exactly five new captures, all from the offline production review:

1. [Initial anatomical cockpit / model selector](review/sprint-10c1/01-initial-anatomical-selector-1920.png)
2. [Custom question edit and submission](review/sprint-10c1/02-custom-question-edit-submit-1920.png)
3. [Centered neural controls / adjusted input](review/sprint-10c1/03-neural-controls-adjusted-stimulus-1920.png)
4. [Larger canonical Live Connectome](review/sprint-10c1/04-canonical-live-connectome-1920.png)
5. [Mobile cockpit](review/sprint-10c1/05-mobile-cockpit-390.png)

Machine-readable acceptance: [browser checks](review/sprint-10c1/browser-checks.json).
The recorded Neural System panel also reserves enough height for the trace
legend and condition selector to remain separate at all three review widths.
The five original Sprint 10C images remain retained; no additional screenshot
matrix/contact sheet was created in this correction.

### Remaining weaknesses

1. The large anatomical GLB still has an initial download/parse cost. A failed
   selection has a labelled fallback; an explicit download-retry UI is not added.
2. Exact 78% camera occupancy can be limited by the other viewport axis for an
   unusually narrow/wide cloud. Every published position stays inside the frame.
3. Help was checked in Chromium/Edge with mouse, keyboard and click paths. Hardware
   screen-reader and physical touchscreen combinations were not separately audited.

### Exact correction-only files and diff

**32 correction-only files** (27 text files and five PNG captures), compared
with the retained uncommitted Sprint 10C state. `.env.example` belongs to the
earlier Sprint 10C work, not this UX correction.

```text
docs/SPRINT_10C_META_PERCEPTION_ORCHESTRATION_REVIEW.md
docs/review/sprint-10c1/01-initial-anatomical-selector-1920.png
docs/review/sprint-10c1/02-custom-question-edit-submit-1920.png
docs/review/sprint-10c1/03-neural-controls-adjusted-stimulus-1920.png
docs/review/sprint-10c1/04-canonical-live-connectome-1920.png
docs/review/sprint-10c1/05-mobile-cockpit-390.png
docs/review/sprint-10c1/browser-checks.json
scripts/first-time-ux-browser-review.mjs
src/app/components/connectome-3d.tsx
src/app/components/embodied-experiment.tsx
src/app/components/embodied-world.tsx
src/app/components/guided-experiment.test.tsx
src/app/components/guided-experiment.tsx
src/app/components/guided-workflow.tsx
src/app/components/high-fidelity-fly.tsx
src/app/components/info-tooltip.test.tsx
src/app/components/info-tooltip.tsx
src/app/components/perception-panel.test.tsx
src/app/components/procedural-fly.tsx
src/app/components/research-cockpit.css
src/app/components/research-cockpit.tsx
src/app/components/research-question.tsx
src/app/observatory.tsx
src/lib/meta/experiment-designer.ts
src/lib/web/camera-framing.test.ts
src/lib/web/camera-framing.ts
src/lib/web/fly-model.test.ts
src/lib/web/fly-model.ts
src/lib/web/guided-workflow.test.ts
src/lib/web/guided-workflow.ts
src/lib/web/stimulus-draft.test.ts
src/lib/web/stimulus-draft.ts
```

Correction-only line totals are recorded below against the retained baseline;
new files are included. Binary PNGs are counted separately.

**32 files: +1022 / −108 lines across 27 text files; five new PNGs.**

Cumulative tracked working-tree `git diff --stat` (includes the earlier Sprint
10C changes; Git omits untracked new files from this command):

```text
.env.example                                  |   1 +
 README.md                                     |   9 +-
 docs/META-INTEGRATION.md                      |  51 ++++++++++
 docs/sam-perception.md                        |   4 +-
 package.json                                  |   3 +-
 src/app/components/connectome-3d.tsx          |  14 +--
 src/app/components/embodied-experiment.tsx    |  29 ++++--
 src/app/components/embodied-world.tsx         |   7 +-
 src/app/components/guided-experiment.test.tsx |  20 +++-
 src/app/components/guided-experiment.tsx      |  42 ++++----
 src/app/components/guided-workflow.tsx        |   4 +-
 src/app/components/high-fidelity-fly.tsx      |  28 +++---
 src/app/components/perception-panel.css       |  42 ++++++++
 src/app/components/perception-panel.test.tsx  |  23 ++++-
 src/app/components/perception-panel.tsx       |  85 +++++++++++-----
 src/app/components/procedural-fly.tsx         |  19 +++-
 src/app/components/research-cockpit.css       | 136 ++++++++++++++++++++------
 src/app/components/research-cockpit.tsx       |  24 +++--
 src/app/observatory.tsx                       |  21 ++--
 src/lib/meta/client.ts                        |   2 +
 src/lib/meta/experiment-designer.ts           |   8 +-
 src/lib/perception/contracts.ts               |   2 +
 src/lib/web/camera-framing.test.ts            |  37 ++++++-
 src/lib/web/camera-framing.ts                 |  47 +++++++++
 src/lib/web/flight-recorder-types.ts          |   5 +-
 src/lib/web/flight-recorder.test.ts           |   2 +-
 src/lib/web/flight-recorder.ts                |   9 +-
 src/lib/web/guided-workflow.test.ts           |  25 +++++
 src/lib/web/guided-workflow.ts                |  11 ++-
 src/lib/web/perception-action.ts              |  37 +++++--
 src/lib/web/perception-session.ts             |   4 +
 31 files changed, 598 insertions(+), 153 deletions(-)
```

**NO COMMIT MADE.** No staging, push, deployment, or FruitFly XR modification.

## Sprint 10C.2 — Navigation, Home & UX convergence

Implemented on `feat/sprint-10c-meta-perception-orchestration`. Earlier uncommitted
10C/10C.1 work was retained. This correction changes presentation and navigation;
the deterministic engine, matched conditions, recorder, provider configuration,
scientific boundaries and FlyV2 assets/license are unchanged.

### Orientation, navigation and workflow containment

The initial view is a real Home / Overview: a research-instrument hero, a clearly
labelled illustrative neural graphic, three large workspace paths, and a compact
Meta designs → CausalFly runs & measures → Meta interprets sequence. The headline
answers what the product does in plain English. Scientific scope stays visible.

The CausalFly logo opens Home without remounting Observatory. Retained experiment
questions, stimulus strength, designs, results, perception session, XR observations
and connection state survive navigation. Home is not a fourth workspace tab.

`WorkspaceNavigation` supplies the same Experiment / Live Connectome / Evidence
order, typography, hit areas and cyan selected border everywhere. Source changes
do not start a connection or inference. Entering Experiment selects the controlled
fixture; entering Live Connectome selects the observational source. Evidence shows
the selected source's retained records. Existing internal comparison/analysis
views remain subordinate to Experiment rather than becoming primary workspaces.

Experiment retains its five local ASK / INPUT / DESIGN / RUN / UNDERSTAND stages.
Live Connectome uses a separate `LiveConnectomeProgress`, whose callback accepts
only a local step. Understand renders the retained question, deterministic local
summary, optional explicit Meta interpretation, scientific limitation and next
investigation suggestions within Live Connectome. Legacy observational analysis
callbacks also resolve to this local state. No local workflow button switches
primary workspace. Evidence has its own retained-record heading and no workflow
strip or inferred "next step" CTA.

### Typography, sources, status and help

Shared typography tokens use 15px body, 14px secondary/action labels and 12px
metadata. Existing tiny cockpit, instrument, XR analysis and live-view labels now
consume the metadata token. Important controls use 14px. The sidebar is 244px
(232px at medium desktop sizes), with more spacing and a single expandable role
explanation. On mobile it becomes a navigation header; Sources & connection is
a tap-to-expand panel with readable source descriptions/status and the same
canonical connection action. The assistant launcher flows after content instead
of floating over actions.

FruitFly XR's Connect / Cancel / Disconnect action always belongs to the source
card across Home, Experiment, Live Connectome and Evidence. The duplicate session
header action was removed. Switching workspaces retains an existing connection;
only an explicit source-card action starts/stops it. No automatic connection was
added. Connection diagnostics are collapsed by default.

The shared `AccessiblePopover` underlies status and help. It supports hover,
keyboard focus, click/tap, Escape, outside dismissal, a labelled trigger and a
described-by relationship. Its fixed, bounded panel remains inside the viewport.
Status badges are optional context, never a required workflow gate.

- **META LIVE** means provider/runtime availability. Its panel explains that Muse
  designs/interprets only after an explicit action; Home assigns deterministic
  measurements to CausalFly. **META WORKING** appears during explicit design/interpretation
  requests. No model names or credentials are exposed. Generic perception busy
  state does not claim Meta is working, since it can include local fixtures.
- **FAKE META CLIENT** explains local demonstration fixtures and zero live model
  requests. Pending fixture work has its own offline label. Missing configuration
  has a separate state.
- **FRUITFLY XR** explains simulated connectome dynamics, connection state and
  receiving/waiting/last-snapshot telemetry. It explicitly disclaims living-fly
  recordings and directs users to the source card instead of duplicating Connect.

Help covers Input, stimulus strength, controlled model, recorded signal, real-fly
validation, Control/Intervention, and Flight Recorder / run IDs. Input help explains
the optional controlled stimulus versus Muse candidate discovery → user selection
→ SAM tracking → CausalFly visual-expansion measurement. Default copy stays short.

### Questions, approval, retained input and disclosures

Experiment's visible USE THIS QUESTION submit action transitions to a retained
question; it does not submit to Meta. Live question submission visibly confirms
retention, displays the exact question and activates Observe. Question editing is
separate from requesting a design.

The existing workspace-owned synthetic stimulus draft is retained. Browser checks
set .600, navigate through Home, change model, request a fixture design, set .400,
redesign and run. Unrelated rerenders/navigation do not restore 1.000. A changed
input invalidates the stale design and requires explicit redesign. Existing unit
regressions cover replacement design IDs and locked measured SAM amplitude.

Only one Approve & Run Experiment button exists, including when design settings
are expanded. Control/Intervention remain centered below Neural System, associated
with recorded playback. Methodology, advanced analysis, raw provenance and
diagnostics stay collapsed; FruitFly Evidence's production-method section is now
an explicit closed disclosure. Provenance content is retained.

### Validation and final screenshots

- Targeted navigation/status component tests: **6 passed**.
- Targeted cockpit/question/help tests: **12 passed**.
- Targeted slider/camera regressions: **8 passed**.
- Final full suite: **361 passed** (304 library/server + 57 component), zero failures
  or skips. `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`
  passed. Existing Three.js CJS deprecation notice is non-blocking.
- Browser acceptance ran against the production build with `CAUSALFLY_FAKE_META=1`.
  All experiment POSTs were fulfilled from local fake-client/real-engine fixtures;
  XR EventSource was replaced by an in-browser fixture stream. Other API calls
  were rejected and external requests blocked. **ZERO live Muse/SAM calls**.
- **18 responsive/style checks** cover Home, measured Experiment, Live Understand,
  Live Observe and Evidence at **1920×1080, 1440×900, 390×844**, plus equal computed
  navigation styles across the three workspaces at every size. No horizontal page
  overflow or browser errors. Mobile status tapping, expandable sources, explicit
  question submission and local Understand containment passed.
- Canonical connectome short-axis coverage is **0.7799999936**. Actual camera
  position/target reset, resize, source re-entry and telemetry preserving deliberate
  camera changes are checked. Published coordinates are unchanged.

Exactly five final screenshots are retained, with no intermediate gallery:

1. [Home / Overview — 1920×1080](review/sprint-10c2/01-home-overview-1920.png)
2. [Experiment — 1920×1080](review/sprint-10c2/02-experiment-1920.png)
3. [Live Connectome — 1920×1080](review/sprint-10c2/03-live-connectome-1920.png)
4. [Evidence — 1920×1080](review/sprint-10c2/04-evidence-1920.png)
5. [Home — 390px mobile](review/sprint-10c2/05-home-mobile-390.png)

The [machine-readable report](review/sprint-10c2/browser-checks.json) records
viewports, explicit fixture actions, camera fit and zero-live-call results.
Rerun after starting the app locally:

```powershell
npx tsx --conditions=react-server scripts/navigation-home-fixtures.ts
$env:CAUSALFLY_REVIEW_URL='http://127.0.0.1:3142'
node scripts/navigation-home-browser-review.mjs
```

### Top five remaining UX limitations

1. Workspace selection is retained in memory rather than represented in the URL;
   browser Back and refresh do not restore a particular local stage/session.
2. Larger readable typography puts some Experiment measurements below the first
   laptop viewport; the full research deck still requires scrolling.
3. Mobile is deliberately sequential and long. Source controls require one
   expansion and advanced records remain several screens below the main workflow.
4. Evidence switches records through the source selector; there is no unified
   cross-source session browser or durable client-side session restoration.
5. The published connectome is prominent and correctly fitted, but specialists'
   counts, decoder terminology and dense retained-record metadata still benefit
   from a guided introduction. A real-device touch/screen-reader review remains
   useful beyond the keyboard/tap browser checks performed here.

### Exact Sprint 10C.2 files

These are this correction's files, distinct from the earlier dirty working tree:

```text
docs/SPRINT_10C_META_PERCEPTION_ORCHESTRATION_REVIEW.md
docs/review/sprint-10c2/01-home-overview-1920.png
docs/review/sprint-10c2/02-experiment-1920.png
docs/review/sprint-10c2/03-live-connectome-1920.png
docs/review/sprint-10c2/04-evidence-1920.png
docs/review/sprint-10c2/05-home-mobile-390.png
docs/review/sprint-10c2/browser-checks.json
scripts/navigation-home-browser-review.mjs
scripts/navigation-home-fixtures.ts
src/app/layout.tsx
src/app/observatory.tsx
src/app/components/data-source-panel.tsx
src/app/components/fruitfly-evidence.tsx
src/app/components/guided-experiment.tsx
src/app/components/home-overview.tsx
src/app/components/info-tooltip.tsx
src/app/components/instrument-system.css
src/app/components/investigation-question.tsx
src/app/components/live-connectome-progress.tsx
src/app/components/live-session.module.css
src/app/components/live-session.tsx
src/app/components/navigation-status.test.tsx
src/app/components/research-cockpit.css
src/app/components/research-cockpit.tsx
src/app/components/source-workspaces.css
src/app/components/status-indicator.tsx
src/app/components/workspace-navigation.tsx
src/app/components/workspace-system.css
```

**NO COMMIT MADE.** Stopped for human visual review. No credentials, configured
models, scientific capabilities or FruitFly XR repository were changed.

### Final cumulative tracked working-tree diff

`git diff --stat` includes the earlier uncommitted Sprint work and omits untracked
files (including this review document, new components and screenshots listed above).

```text
 .env.example                                  |   1 +
 README.md                                     |   9 +-
 docs/META-INTEGRATION.md                      |  51 ++++
 docs/sam-perception.md                        |   4 +-
 package.json                                  |   3 +-
 src/app/components/connectome-3d.tsx          |  14 +-
 src/app/components/data-source-panel.tsx      |  14 +-
 src/app/components/embodied-experiment.tsx    |  29 +-
 src/app/components/embodied-world.tsx         |   7 +-
 src/app/components/fruitfly-evidence.tsx      |   4 +-
 src/app/components/guided-experiment.test.tsx |  20 +-
 src/app/components/guided-experiment.tsx      |  42 +--
 src/app/components/guided-workflow.tsx        |   4 +-
 src/app/components/high-fidelity-fly.tsx      |  28 +-
 src/app/components/instrument-system.css      |  44 +--
 src/app/components/investigation-question.tsx |   1 +
 src/app/components/live-session.module.css    |  84 +++---
 src/app/components/live-session.tsx           |   5 +-
 src/app/components/perception-panel.css       |  42 +++
 src/app/components/perception-panel.test.tsx  |  23 +-
 src/app/components/perception-panel.tsx       |  85 ++++--
 src/app/components/procedural-fly.tsx         |  19 +-
 src/app/components/research-cockpit.css       | 376 ++++++++++++++++----------
 src/app/components/research-cockpit.tsx       |  25 +-
 src/app/components/source-workspaces.css      |  59 ++--
 src/app/layout.tsx                            |   1 +
 src/app/observatory.tsx                       |  83 +++---
 src/lib/meta/client.ts                        |   2 +
 src/lib/meta/experiment-designer.ts           |   8 +-
 src/lib/perception/contracts.ts               |   2 +
 src/lib/web/camera-framing.test.ts            |  37 ++-
 src/lib/web/camera-framing.ts                 |  47 ++++
 src/lib/web/flight-recorder-types.ts          |   5 +-
 src/lib/web/flight-recorder.test.ts           |   2 +-
 src/lib/web/flight-recorder.ts                |   9 +-
 src/lib/web/guided-workflow.test.ts           |  25 ++
 src/lib/web/guided-workflow.ts                |  11 +-
 src/lib/web/perception-action.ts              |  37 ++-
 src/lib/web/perception-session.ts             |   4 +
 39 files changed, 860 insertions(+), 406 deletions(-)
```

**NO COMMIT MADE.** Ready for human visual review.
