# CausalFly

CausalFly is a desktop-first causal observatory: submit a research question,
inspect an AI-proposed and validated experiment, compare deterministic CONTROL
and PERTURBED evidence, and review a separate AI Scientist interpretation.
The underlying Sprint 1 engine and Sprint 2 scientific workflow are unchanged.

**Synthetic engineering fixture — not a biological model or Drosophila finding.**

## Launch the web app

Use Node.js 22 or newer. Install dependencies and start Next.js 16.4.3:

```powershell
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Submit the prefilled question
or write your own. Results appear after the complete workflow finishes. The
loading panel lists the pipeline; it does not claim streamed stage completion.
Use **Use as Next Question** to populate the input without running another experiment.

With no Meta configuration, the app uses the clearly labeled **FAKE META CLIENT**.
For an explicitly offline demo even when `.env.local` contains live credentials:

```powershell
$env:CAUSALFLY_FAKE_META = "1"
npm run dev
```

The override is server-only and applies to the web app. The existing CLI uses
its own `--fake` flag. Remove the override with
`Remove-Item Env:CAUSALFLY_FAKE_META` before restarting for live mode.

For live web operation, configure `META_API_KEY`, `META_BASE_URL`, and `META_MODEL`
in `.env.local` or the server environment, following
[Meta integration](docs/META-INTEGRATION.md). Partial/invalid configuration shows a
safe error rather than silently falling back. A page visit checks configuration
only; it does not contact Meta. A submission makes the existing design and
interpretation requests, including their existing timeout/retry policy.
A live-configured badge is not a successful provider health check.

## Web architecture and scientific boundary

The request-time Server Component reads only a safe mode/configuration status.
The interactive observatory submits `{ researchQuestion: string }` to
`POST /api/experiments`, a Node.js App Router Route Handler. Its server-only
adapter validates the input, calls the existing `runAiExperiment`, then derives
compact evidence with `createCompactEvidence`. It returns an explicit serializable
result containing mode, submitted question, validated ExperimentSpec, compact
control/perturbed evidence and deltas, provenance, and separate ScientificAnalysis.
No experiment logic is duplicated in the web layer. Requests are capped at 64 KB
and questions at 8,000 characters. Provider failures return fixed public messages;
SDK exceptions, prompts, request bodies, headers and configuration are not returned.
`META_API_KEY` stays in server-only modules.

Measured results use cyan, the declared perturbation uses magenta, and AI-authored
proposals and interpretation use amber. Provenance checks and retained sample
counts come from actual engine output. Missing threshold crossings stay null and
are displayed as not reached/not comparable. The expandable evidence inspector
shows provenance and retained samples; full raw traces remain available in the CLI.

This sprint has no database, authentication, WebSockets, real fly data, SAM, XR,
or added agent framework. Results live in page memory and disappear on reload.
The sidebar provides same-page navigation to the question, proposed experiment, comparison, and AI Scientist. Before a run, result links return to the question with an explanation.
The fake designer always returns the existing demo spec regardless of question,
and its template interpretation does not assess hypothesis support. Loading does
not stream intermediate results. The public POST endpoint has no rate limiting;
restrict access before exposing a live-credential demo publicly.

## Validation and CLI workflows

```powershell
npm test
npm run experiment:demo
npm run experiment:ai-demo -- --fake
npm run lint
npm run build
git diff --check
```

Tests cover the unchanged experiment and Meta workflows plus web validation,
offline operation, question forwarding, engine measurements, AI/evidence separation,
serialization without credentials, safe provider errors, next questions, and request
body handling. No browser E2E infrastructure is added.

The deterministic demo prints calculated peak activity, first threshold-crossing
step, outcome, matched-condition checks, and deltas (PERTURBED minus CONTROL),
followed by the complete structured JSON. The seed is recorded for matching; the
current engine has no randomness. See [architecture](docs/ARCHITECTURE.md) and
[scientific constraints](docs/SCIENTIFIC-CONSTRAINTS.md) for semantics and limits.

The AI demo loads Next.js environment files, preserving shell variables. Force
`--fake` for offline operation or `--live` to require live configuration. It uses
compact evidence: all non-zero activity steps and one final quiescent step,
without changing measurements or the original observation window. Access full
traces with `npm run experiment:ai-demo -- --fake --raw`.

To explicitly test live credentials, run `npm run meta:smoke`. This makes one live
request without retry/fake fallback, validates exactly `{"status":"ok"}`, and
prints only mode, model and status on success. It is never run automatically by
the web experience or the validation commands above.
