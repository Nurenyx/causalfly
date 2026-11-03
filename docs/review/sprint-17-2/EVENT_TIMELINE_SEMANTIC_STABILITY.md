# Sprint 17.2 — Event Timeline Perceptual & Semantic Stability

## 1. Root Cause of the Perceptual Jitter

Human review of the genuine Firefox screen recording confirmed that while Sprint 17.1 eliminated outer DOM/CSS bounding-box displacement (`0 px` geometry delta), `EventTimeline` (`src/app/components/live-session.tsx`) previously mapped the rolling chronological tail `items.slice(-6)` onto six positional `<li>` slots keyed by array index (`0..5`).

As each incoming telemetry frame appended a new event to `items`, `items.slice(-6)` shifted every earlier event one column to the left (`slot[i] ← slot[i + 1]`). Consequently:

- Semantic event identities (`"Frame received"`, `"Neural tick"`, `"Input reference changed"`, `"Decoder changed"`, `"Stream reconnected"`, `"Stream inactive"`) continuously rotated across horizontal columns on every tick.
- Bounding-box assertions measured `0 px` displacement because the six `<li>` containers remained physically fixed while their semantic contents migrated across columns.

## 2. Five Fixed Semantic Event Lanes

`EventTimeline` in `src/app/components/live-session.tsx` and `src/app/components/live-session.module.css` now replaces the rolling 6-slot primary sequence with **five permanently positioned semantic event lanes**:

| Slot | Category Heading | Stable React Key / `data-lane` | Populated Example (`title` / `value` / `time`) | Unobserved Placeholder |
| --- | --- | --- | --- | --- |
| 1 | `FRAME` | `"frame"` | `Frame received` · `Tick 284` · `14,200 model ms` | `—` / `—` / `—` (`data-empty="true"`) |
| 2 | `NEURAL` | `"neural"` | `Neural tick` · `Tick 285` · `14,250 model ms` | `—` / `—` / `—` (`data-empty="true"`) |
| 3 | `INPUT` | `"input"` | `Input reference changed` · `Tick 289` · `14,450 model ms` | `—` / `—` / `—` (`data-empty="true"`) |
| 4 | `DECODER` | `"decoder"` | `Decoder changed` · `IDLE → ESCAPE` · `Tick 290` | `—` / `—` / `—` (`data-empty="true"`) |
| 5 | `STREAM` | `"stream"` | `Stream live` / `Stream reconnected` / `Stream inactive` · `Last received 21:07:20 UTC` | `—` / `—` / `—` (`data-empty="true"`) |

### Key Structural & Visual Guarantees

- **Permanent Category Identity:** Each `<li>` in `<ol data-timeline-track>` is keyed by its permanent semantic category (`frame`, `neural`, `input`, `decoder`, `stream`), never by tick, timestamp, sequence number, or event ID.
- **Single-Lane Value Updates:** Incoming telemetry updates only the corresponding category's values in place. In particular, `STREAM` records stream-level state transitions (`Stream live`, `Stream reconnected`, `Stream inactive`) rather than churning on every neural tick, so a `Neural tick`, `Input reference changed`, or `Decoder changed` frame updates strictly one semantic lane.
- **Stationary Row & Column Geometry:**
  - Desktop (`>760 px`): `grid-template-columns: repeat(5, minmax(0, 1fr))` with `grid-template-rows: 116px` inside a fixed `160 px` track.
  - Compact (`≤760 px`): `grid-template-columns: repeat(5, minmax(150px, 1fr))` with horizontal scroll containment and zero page-level horizontal overflow.
  - Each `<li>` reserves five explicit rows summing to `116 px` (`grid-template-rows: 12px 18px 32px 26px 28px`) for marker/baseline (`12 px`), category heading (`18 px`), event/status title (`32 px`), tabular tick/value (`26 px`), and model time / UTC timestamp (`28 px`), with `white-space: nowrap` and `font-variant-numeric: tabular-nums`.
  - All CSS transitions and animations inside `.timeline` and `.recentHistory` remain explicitly disabled (`transition: none; animation: none;`).

## 3. Canonical Chronological History Preservation

- `sessionTimeline(frames)` in `src/lib/sources/live-session.ts`, `receiveSnapshot`, `LIVE_FRAME_LIMIT` (`120`), decoder logic, and all downstream Evidence / provenance consumers remain **100% untouched**.
- Beneath the five fixed semantic lanes, `EventTimeline` exposes a collapsed secondary `<details data-timeline-history>` element titled **`Recent event history`**, which renders the true chronological rolling sequence from `sessionTimeline(frames)` (plus observed transport reconnection and retained-snapshot markers) for inspection without introducing high-frequency motion in the primary instrument strip. When closed (default), `.recentHistory:not([open])` is locked to `height: 28px; overflow: hidden`.
