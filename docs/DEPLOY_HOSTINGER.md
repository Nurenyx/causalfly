# Hostinger production alpha

Historical alternative-host guide. The current alpha uses Vercel. [Sprint 11B](SPRINT_11B_PRODUCTION_HARDENING_REVIEW.md) supersedes its media transport and environment guidance: live providers require `CAUSALFLY_META_ENABLED=1`; live video requires private Vercel Blob, a server-only fallback credential on non-Vercel hosts, and `CAUSALFLY_MEDIA_SIGNING_SECRET`. Fake mode blocks live scene/SAM as well as using offline Muse templates.

Intended hostname: **causalfly.nurenyx.ai**. This guide prepares a deployment; none has been performed.

## Deployment contract

Use a managed Node.js Web App with Next.js, repository root as application root, and Node **24.x**, matching the tested local major and package engines. Install with `npm ci`, build with `npm run build` (executes `next build --webpack`), start with `npm start`. Keep `.next` and `public` in the release. Do not use static export: server routes are required. Next uses the platform-injected `PORT`; do not set a custom public listening port. No Docker, custom server, inbound WebSocket listener, or background worker is required. Build currently downloads Google fonts and needs outbound internet.

For a future human-approved deployment, connect the GitHub repository in Hostinger, inspect the selected branch and commit, and select the reviewed release explicitly. The checkout for this review is `feat/sprint-11a-production-alpha`; the supplied brief's older branch name does not describe this checkout. GitHub sees committed content only: this uncommitted review cannot be deployed from GitHub yet. Avoid enabling automatic deployment from a working sprint branch. Add the hostname and complete DNS/TLS setup through the hosting control panel.

Provider references checked 2026-10-30: [managed Node.js/GitHub deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Node version selection](https://www.hostinger.com/support/how-to-select-the-node-js-version-for-your-application/). Account plan, deployment permissions, and platform resource/timeout limits still require verification in hPanel.

## Production bundler and CSS

Keep Hostinger's Build Command as `npm run build`. Next.js 16.4.3 production builds explicitly use webpack because [Hostinger requires webpack for Next.js 16.3.3 and newer](https://www.hostinger.com/support/how-to-fix-next-js-16-turbopack-build-errors-on-hostinger/). The former Turbopack-only CSS loader is replaced with the official Tailwind v4 PostCSS plugin in `postcss.config.mjs`; global Tailwind imports and standard Next CSS Modules remain unchanged. `npm run dev` continues using Next's default Turbopack on manual port 3132. Node stays 24.x. Ensure build-time devDependencies are installed, including `@tailwindcss/postcss` and `postcss`.

## Environment inventory

All application settings below are server-side. No `NEXT_PUBLIC_` credential exists. `.env.local` stays ignored; `.env.example` has placeholders only. Never upload local configuration or copy secrets into build logs.

| Name | Local development | Hostinger production | Offline validation | Secret |
| --- | --- | --- | --- | --- |
| `META_API_KEY` | Required for live Meta | Required for live Meta | Empty process override | **Yes** |
| `META_BASE_URL` | Official Meta API endpoint | Official Meta API endpoint | May be present; no calls authorized | No |
| `META_MODEL` | Muse Wonder model | Muse Wonder model | Fake design/interpretation templates | No |
| `META_SCENE_MODEL` | Muse Spark scene model | Muse Spark scene model | Explicit scene fixture | No |
| `META_TIMEOUT_MS` | Optional request timeout | Optional request timeout | No provider calls | No |
| `CAUSALFLY_FAKE_META` | Optional labelled offline Muse mode | Leave unset for live; 1 only for labelled offline alpha | 1 | No |
| `FRUITFLY_XR_OBSERVATORY_URL` | Optional local observatory | Empty until secure cloud service exists | Empty process override | No; credential-bearing URLs rejected |
| `NODE_ENV` | Framework-managed development | Framework-managed production | Production preview / test runner | No |
| `PORT` | Explicit local port below | Hosting-managed | 3142 | No |

Production model identifiers remain `muse-wonder-1.0`, `muse-spark-1.3`, and `sam-3.1`. SAM has no separate environment key/model variable: code uses the shared server key, official Meta URL, a fixed model constant, and a timeout capped at 180 seconds. Scene configuration requires the official Meta URL and an explicit Muse Spark identifier. Muse design/interpretation requires key, HTTPS base URL and model. Default timeout is 120 seconds. Fake Muse mode does **not** disable live scene or SAM actions: use their explicit fixture buttons for offline validation.

Development-only harness variables: `CAUSALFLY_PLAYWRIGHT_MODULE` selects a Playwright module; `CAUSALFLY_REVIEW_URL` selects a review target; legacy `CAUSALFLY_PREFLIGHT` suppresses captures in the historical guided harness. None is a production requirement. No other application runtime environment settings were found in source. `npm_package_version` is not required; health imports the package version.

## Local ports

- **3132**: human/manual CausalFly development. `npm run dev` uses 3132.
- **3142**: automated/offline review only.
- **8765**: separate local FruitFly XR brain WebSocket.
- **8766**: separate local FruitFly XR observatory WebSocket.

Before starting either CausalFly instance on Windows, use `Get-NetTCPConnection -State Listen -LocalPort 3132,3142 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess`. Report the owning PID if occupied; never silently substitute another port. Never automatically kill 3132. Stop only the 3142 process created by the review when finished. Production uses the hosting-assigned port, not this local policy. The old sprint documents and harnesses record historical ports; use this guide and `npm run review:browser` for current validation.

## Health and smoke checks

`GET /api/health` returns `status`, runtime and Meta mode, package version, and boolean configuration flags for Meta, scene model, SAM and FruitFly XR. `providersChecked: false` is explicit. HTTP 200 means the app responds; optional or missing provider configuration does not make the synthetic app unhealthy. Invalid configuration returns false. It performs no provider calls and uses `Cache-Control: no-store`; credentials, endpoint values, uploaded media, receipts and evidence are excluded. Verify it after changing runtime configuration; it is evaluated per request.

After a human deploys: check HTTPS and health, Home/logo and all workspaces, explicit question submission, slider persistence, Anatomical default/load and Lightweight fallback, Reset View, and a complete labelled offline synthetic design/approval/run/interpretation. Check mobile at 390px and no overflow. Confirm missing FruitFly endpoint gives an understandable unavailable state and no automatic connection. Validate status popovers and evidence/provenance separation. Live paid provider checks need a separate explicit decision; health does not prove account/model access. Test server streaming/proxy behavior when Sprint 11B supplies the cloud endpoint.

## Storage, alpha limits and rollback

Application retention, scene records, design records and signing keys are process-local and ephemeral. No app feature writes uploaded media or evidence to local disk. The explicit calibration-scene fixture reads a bundled read-only `public/perception-calibration.mp4`. Normal Next build/cache files still belong to platform-managed release storage. Provider uploads are deleted with one-hour expiry as a backstop. Restarts invalidate receipts and retained IDs; downloaded evidence remains a user-owned copy. Use a single application process for this alpha; shared retention and user ownership are required before scaling. Do not promise durable evidence.

There is no user authentication, shared-store isolation, or application-wide paid-call quota. Public live provider actions can spend the configured account's budget. Restrict tester access/budget at the hosting/provider boundary or run an explicitly labelled offline alpha until access controls and quotas are implemented. Do not collect sensitive media. This is a deployment risk, not a claim of unrestricted production readiness.

Record the approved commit and configuration names before deploying. Roll back by selecting the previous known-good commit/release in the GitHub deployment workflow, restoring its environment configuration securely, rebuilding/restarting, and repeating health/offline smoke checks. Restart loses in-memory records. Verify the actual hosting rollback controls before launch.

FruitFly XR remains optional until Sprint 11B. The synthetic experiment does not depend on it. Production accepts a remote secure observatory URL, without assuming public port 8766. No backend deployment is included here.
