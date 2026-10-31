# Weekend production-connectivity review

Base: `51d869d` / `causalfly-autonomous-embodiment-v0.14` on
`feat/weekend-live-connectome`. This is a connectivity patch to accepted Sprint 12A.
No FruitFly XR, Unity, autonomy engine, deterministic measurement, neural schema,
hello identity, input mapping or ESCAPE criterion was changed.

## Configuration and security boundary

- `NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL` selects the opt-in browser experimental
  sensory/control WebSocket. It is public infrastructure metadata, not a secret.
  Set it **before `npm run build`**: Next.js freezes public settings in browser JS.
  Changing it requires rebuilding; no runtime settings API was introduced.
- Production accepts only a parsed `wss://` URL with exact path `/brain/v1`.
  Credentials/userinfo, whitespace, query strings, fragments, wrong paths and
  malformed URLs are rejected. Development also permits exactly
  `ws://127.0.0.1:8765/brain/v1` and `ws://localhost:8765/brain/v1`.
- Missing or invalid configuration opens no socket and has no localhost fallback.
  The adapter clears neural drive and reports live connectome control unavailable.
  Synchronous connection failure and socket error/close also fail safely; the
  engineered baseline autonomy remains available. No neural output is fabricated.
- Transport evidence retains only the validated canonical endpoint (or null for
  invalid/missing configuration). Invalid raw URLs and connection exception details
  are not copied into evidence/status. Never put credentials, bearer tokens, API
  keys, signed secrets or query payloads into this public build-time variable.
- `FRUITFLY_XR_OBSERVATORY_URL` remains independently server-side, read-only
  telemetry through the existing bridge. It is not exposed to browser configuration.
  Neither endpoint launches the FruitFly XR headset application.

Temporary weekend configuration, supplied as environment values only:

```powershell
$env:FRUITFLY_XR_OBSERVATORY_URL = 'wss://rog-4090.tail77da1c.ts.net:8443/observatory/v1'
$env:NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL = 'wss://rog-4090.tail77da1c.ts.net/brain/v1'
```

A temporary Tailscale Funnel may provide these public endpoints during alpha.
Funnel is public infrastructure, **not authentication**. Availability depends on
its temporary host machine staying online; this is not the intended permanent
production architecture. A future validated Cloud Run endpoint can replace these
values without changing application behavior (rebuild for the public brain URL).
The hostname is absent from application source. Secure transport and validation do
not establish researcher authorization, prevent control-slot abuse or guarantee
availability. The existing one-organism server and bounded client sessions remain.

Neural decision provenance stays **Live connectome decoder / FruitFly XR Brain
Server**. Visible body mechanics remain **CausalFly procedural controller**.
WALK/TURN/AVOID baseline decisions remain **Baseline autonomous policy**, explicitly
engineered in the UI. The remote brain supplies signals, not body mechanics.

## Validation

- Focused adapter/autonomy tests: **31 passed** (including six added endpoint,
  unavailable-baseline, independent-observatory and provenance tests).
- Full suite: **436 passed** (374 library tests + 62 component tests), zero failures.
  All provider tests use injected mocks; no live Meta/SAM calls were made.
- TypeScript `npx tsc --noEmit`, `npm run lint`, production `npm run build`, and
  `git diff --check`: passed. Existing telemetry and ESCAPE tests remain intact.
- Real local production-browser acceptance used the environment values above:
  observatory identity verified; **120 real evidence snapshots**, **45 sensory
  messages**, **148 Brain telemetry messages**, **2 telemetry packets satisfying
  the existing ESCAPE criterion**, **16 FRUITFLY_DECODER decisions**, and
  **97 baseline-policy decisions**. Observations matched the brain trial session.
  Procedural motor evidence recorded TAKEOFF_ESCAPE with peak altitude **0.906**
  illustrative scene units; baseline IDLE/EXPLORE/WALK/TURN_LEFT/TURN_RIGHT/AVOID
  remained separately attributed. These are engineering acceptance observations,
  not biological validation or new deterministic scientific measurements.
- Browser opened the configured public secure brain URL; **no localhost brain
  socket**, page errors or Meta/SAM/API experiment actions. The only browser API
  request was the authorized read-only `/api/sources/fruitfly` stream. Server live
  provider permission was disabled and unrelated browser APIs were blocked.
- Real-clock export waited for controller ticks after receiving neural telemetry;
  no thresholds, timing parameters or scientific rules were relaxed for acceptance.
- Port 3142 belonged to pre-existing PID 95572 and was left untouched. Acceptance
  explicitly used local port 3148; only the review server created for it was stopped.
  Raw local acceptance output is ignored under `tmp/weekend-public-acceptance.json`;
  test/build/lint/typecheck logs are under `tmp/weekend-*.log`.

Changed files: `.env.example`, `docs/DEPLOY_HOSTINGER.md`, this review,
`src/app/components/autonomy-panel.tsx`, `src/lib/sources/fruitfly-closed-loop.ts`,
and `src/lib/sources/fruitfly-closed-loop.test.ts`. No secrets, credentials or cloud
configuration artifacts were added. No remote infrastructure was changed.

NO COMMIT MADE.
NO DEPLOYMENT PERFORMED.
STOP FOR HUMAN REVIEW.
