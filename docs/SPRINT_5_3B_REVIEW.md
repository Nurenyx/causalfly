# Sprint 5.3B visual review

Status: materially closer to the approved reference; ready for user visual review. This is not a claim of pixel equivalence or user acceptance. All work remains uncommitted. The interrupted Sprint 5.3 assessment was not used as evidence.

## Artifacts

- [Final live screenshot, exactly 1920 x 1080](review/sprint-5-3b/final/live-1920x1080.png)
- [Approved reference on the left; final implementation on the right](review/sprint-5-3b/final/reference-vs-final.png)
- [Last snapshot, 1920 x 1080](review/sprint-5-3b/final/last-snapshot-1920x1080.png)
- [Waiting, 1920 x 1080](review/sprint-5-3b/final/waiting-1920x1080.png)
- [ID raster, 1920 x 1080](review/sprint-5-3b/final/id-raster-1920x1080.png)
- [1440 desktop](review/sprint-5-3b/final/desktop-1440.png)
- [390 px mobile](review/sprint-5-3b/final/mobile-last-snapshot.png)
- [Browser verification and received evidence](review/sprint-5-3b/final/verification.json)

Final screenshots were captured from the production build, with a 1920 x 1080 browser viewport and device scale factor 1. The comparison is 1920 x 575: equal 960 x 540 image areas beneath labels. The reference is used only in this review artifact, never in the application.

## What changed

The starting screenshot had a lighter teal Observer surface, muted lavender activity/output, small headings, a sparse structure cloud, and a less coherent instrument hierarchy. The final view uses near-black navy surfaces, the requested saturated cyan and magenta, stronger current-value hierarchy, larger verified anatomy, compact sources, and aligned major regions.

Measured final desktop geometry:

| Region | Width | Height |
| --- | ---: | ---: |
| Hero panel | 749.8 px | 606 px |
| Anatomy canvas | 747.8 px | 421 px |
| Analytics | 472.7 px | 606 px |
| Observer column | 411.5 px | 876 px |
| Timeline | 1234.5 px | 100 px |
| Output / diagnostics row | 1234.5 px | 146 px |

The three column widths are approximately 45.9% / 28.9% / 25.2% after gaps. The anatomy canvas is approximately 45% of viewport height below the session bar. The 1920 desktop document measures exactly 1920 x 1080 without scrolling. At 1440, vertical scrolling is available; there is no horizontal overflow. Mobile was checked at 390 px with no horizontal overflow.

Typography at 1920: main state 38 px, current chart numbers 52 px, decoder output 50 px, panel titles 15-17 px, Observer numbers 34 px, supporting text generally 11-13 px, and machine metadata 10-11 px.

The anatomy retains its raw X/Y projection and uses raw Z only for display opacity and point size. The static structure sample increased from 7,877 to 47,261 actual coordinate records. Current highlights have sharper light cores and cyan halos. Recent receipt-driven activity fades over 900 ms and uses at most three received frames; stale data has no firing animation. Hover mapping uses the same enlarged projection. No edges, pathways, or anatomy were inferred.

## Comparison passes

1. Inspected the approved reference and the latest Sprint 5.3 live screenshot before editing.
2. Captured and inspected [pass 1 side by side](review/sprint-5-3b/pass-1/reference-vs-final.png). It showed clearer data colors and darker ground, but the enlarged regions pushed output below the viewport.
3. Performed the required second pass: constrained desktop grid heights, aligned regions, compressed timeline, enlarged sidebar branding, reduced decorative labels, and inspected [pass 2 side by side](review/sprint-5-3b/pass-2/reference-vs-final.png).
4. Verified production CSS, refined the anatomy viewport to 421 px, and corrected clipping of diagnostics, the Observer availability note, and the waiting-state output. Inspected the final reference comparison and final live/waiting screenshots. Browser geometry checks confirm those labels fit in their panels.

## Evidence-based visual assessment

These are subjective design judgments based on the actual final side-by-side image, not an acceptance decision. Overall reference resemblance: **7/10**. The page is materially closer in palette, instrument hierarchy, and telemetry emphasis, while still visibly different in image content and density.

| Category | Score / 10 | Evidence in the compared images |
| --- | ---: | --- |
| Background shade | 8.5 | Final content computes to #000D16, with #000A10 sidebar/panels; the prior lighter Observer field is gone. Both images now have predominantly near-black navy negative space. |
| Hero scale and dimensionality | 6.5 | The 748 x 421 canvas has a much denser verified structure field and brighter cores. Its raw X/Y silhouette still reads flatter than the reference mesh and immersive XR scene. |
| Cyan luminosity | 7.5 | Current points, the 3,314 metric, chart line/endpoints, and display count are bright cyan against near-black. The reference still has a much larger luminous cyan area in its XR scene. |
| Magenta luminosity | 7.5 | The 59,294 metric, decoder value, and ESCAPE output are saturated pink rather than lavender, with restrained glow. The reference distributes accent color across more visual structures. |
| Amber usage | 7.5 | Interpretation/action framing is yellow-amber; stale state has a dominant amber LAST SNAPSHOT label. Reference interpretation is visually richer, while this view keeps only supported local observations. |
| Panel density and rhythm | 7 | Hero and analytics share top/bottom alignment, with a 100 px timeline and aligned lower instruments. The reference contains more varied subviews and a different lower-row arrangement. |
| Observer prominence | 7 | A dedicated rail has four large value rows and one amber action area. The local Observer remains simpler than the reference's time-stamped intelligence feed. |
| Typography | 7 | Main state, metrics, output, and panel titles are substantially larger. The sidebar is more readable and uses a cyan Fly accent; the reference still has a different typographic texture and icon system. |
| Dead space | 6.5 | Cropped output and oversized nested source cards are resolved. Raw-coordinate aspect ratio and a four-tick chart still leave quieter areas than the reference. |
| Overall perceived contrast | 7.5 | Bright data is isolated on dark surfaces instead of brightening entire panels. The unavailable XR image remains the largest missing high-luminance area. |
| Outline sharpness | 7.5 | Thin cyan major-region frames and precise selected states replace soft grey-blue boundaries. The reference still has more extensive illuminated scene geometry. |

Scientific integrity: **10/10 against this sprint's stated guardrails**. The browser checked the current bright-ID mapping against the verified coordinate file and checked that stale canvas pixels remain frozen. This score concerns preservation of the data contract and truthful display, not validation of new biological claims.

## Exact palette

The following tokens are defined on `.live-shell`; all values match the supplied starting design system.

```css
--cf-bg-deep: #000A10;
--cf-bg: #000D16;
--cf-bg-elevated: #011822;
--cf-panel: #061A24;
--cf-panel-strong: #082331;
--cf-border: rgba(45, 150, 190, 0.34);
--cf-border-strong: rgba(0, 205, 240, 0.58);
--cf-cyan: #00D0F0;
--cf-cyan-bright: #18E0F4;
--cf-magenta: #FF4F8B;
--cf-magenta-bright: #FF68A2;
--cf-amber: #F0D040;
--cf-amber-bright: #FFD84A;
--cf-green: #00DFA0;
--cf-red: #FF4866;
--cf-text: #F2F7FA;
--cf-text-secondary: #A2BAC7;
--cf-text-muted: #688796;
```

Borders, gradients, and glows use alpha variants of these hues. The dim structure legend uses #175366. Canvas structure uses #00D0F0 with depth-dependent alpha; current cores use #F2F7FA and halos use #18E0F4 / #00D0F0 alpha stops. No large slate-grey surface is used for the Live Session background.

## Files changed in this pass

- `src/app/globals.css`: scoped exact palette, dark shell, compact sources, sidebar brand/navigation, and header/footer treatment.
- `src/app/observatory.tsx`: Live Session brand text and cyan Fly span.
- `src/app/components/live-session.module.css`: aligned desktop instruments, responsive layouts, type hierarchy, chart/Observer/output colors, timeline, and clipping fixes.
- `src/app/components/live-visualizations.tsx`: verified-coordinate rendering density/depth, finite receipt halos, larger projection, truthful sample disclosure, luminous chart endpoints, and raster colors.
- `src/app/components/live-session.tsx`: green treatment for an already-observed transport reconnect marker.
- `docs/SPRINT_5_3B_REVIEW.md`: this review.
- `docs/review/sprint-5-3b/`: first-pass, second-pass, and final screenshots/comparisons plus browser verification records.

Temporary capture/comparison/regression scripts and logs are under ignored `tmp/sprint-5-3b-*`. The inherited temporary Sprint 5.3 comparison script received only a local ESLint annotation so the repository-wide lint command could run cleanly. Earlier uncommitted work remains present.

## Tests and regression

| Check | Result |
| --- | --- |
| `npm test` | PASS: 160 tests, 0 failed |
| `npm run experiment:demo` | PASS |
| `npm run experiment:ai-demo -- --fake` | PASS; output identifies FAKE META CLIENT |
| `npm run lint` | PASS |
| `npm run build` | PASS; final production build compiles and typechecks |
| `git diff --check` | PASS |
| Real local telemetry browser review | PASS: waiting, live, stale, ID raster, disconnect/reconnect, Evidence navigation and retained session |
| Bright-ID mapping | PASS: 476 supplied IDs mapped to verified coordinates in the final frame |
| Stale canvas | PASS: pixels remain unchanged while no new frames arrive |
| Label visibility | PASS: waiting-state output/diagnostics and stale-state Observer availability note/diagnostics fit in their panels |
| Browser errors / unexpected requests | None during the telemetry review |
| Fake experiment navigation regression | PASS: experiment -> Compare -> Live Session -> retained Compare -> AI Scientist -> Evidence |
| 1920 x 1080 sizing | PASS: viewport and document are 1920 x 1080 |
| 1440 / 390 px responsive checks | PASS: no horizontal overflow; 1440 has vertical scrolling |

The browser used the existing local BrainClient harness and read-only observatory endpoint. No FruitFly XR source was modified. Meta was never called live. The production preview explicitly uses `CAUSALFLY_FAKE_META=1`; the experiment regression checked the FAKE META CLIENT label before submitting.

## Remaining differences and data limits

**XR preview remains the largest unavoidable difference because the current bridge carries telemetry, not imagery.**

The verified soma cloud is still flatter and visually less varied than the reference's brain mesh and XR scene. The sidebar uses the existing graph mark, not the illustrated fly. The reference contains richer multicolor traces, population bars, and trial metrics that the current telemetry does not support. The final layout follows the requested 46/29/25 composition rather than reproducing unsupported reference panels.

The final captured tick reports 3,314 simulated spike events, 59,294 active simulated neurons, and the real decoder output ESCAPE. Only 512 events were supplied for display; 478 unique supplied IDs include 476 that map to coordinates. The 47,261 dark structure points are a static sample of 141,781 published soma records, not active-neuron counts. Soma coverage differs from the source's total 176,422 neurons. Orientation and physical scale remain unspecified.

The four received ticks in this capture cannot produce the reference's richly sampled chart shapes. Discontinuous ticks remain unjoined. Decoder transitions use actual buffered history; ESCAPE is a simulation decoder state and does not establish physical motion. The Observer is local and shows actual telemetry; no live Meta interpretation, camera, biological firing-rate units, velocity, trajectory, inferred pathway, fabricated stimulus, or experimental condition was introduced.
