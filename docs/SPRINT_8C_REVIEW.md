# Sprint 8C — Experiment Flight Recorder / Trust Layer

Branch: `feat/sprint-8c-flight-recorder`

Commit/tag: **pending** — no commit made.

## Objective and capabilities

Make controlled CausalFly experiments inspectable from question through design,
approval, measurement, interpretation and next proposal. Scope adds no pages,
navigation, infrastructure, automatic model calls or changes to scientific math.
FruitFly XR remains unchanged: simulated observational telemetry is not causal evidence.

- Each web workflow receives an operational `run_<UUID>` identifier, separate from
  scientific parameters. Perceive-first workflows carry the ID through the signed
  perception record, approved design, engine Evidence and returned result.
- Changed inputs, reused perception and next-proposal designs get distinct IDs with
  `parent_run_id`. Prior records remain frozen. A follow-up link is accepted only
  when its question matches the retained AI proposal.
- Typed events cover SAM requests, completion/no-match/failure, stimulus derivation
  and acceptance, Meta design/rejection/failure, approval, trial/comparison completion,
  interpretation, next proposal, warnings and correlated errors. Offline geometry
  fixtures never emit a successful live-SAM event.

## Record and export

The process-local recorder emits detached, deeply frozen snapshots. The immutable
measurement snapshot contains the exact validated spec and SHA-256, engine version,
network/parameter provenance, compact control/intervention traces, full-trace
measurements, comparison, perception geometry/formula, model identifiers, warnings
and timestamps. Interpretation adds a new snapshot with its state, validated AI
analysis and SHA-256; it cannot overwrite measured evidence. A hash is an identity
check, not a signature or proof of provenance.

Events have a run ID, ordered sequence, timestamp, typed name and allowlisted
metadata. Fork exports include ancestor events with their original run IDs;
sequence numbers describe export ordering. Recorder lookup retains up to 200 runs
for two hours; guided designs retain the existing 100-entry/two-hour policy. Each
ledger retains at most 1,000 events and explicitly warns if older events are omitted.

**EXPORT RUN DIAGNOSTICS** downloads local JSON with `schemaVersion`, `manifest`
and `events`. Results and Evidence expose it behind disclosure, as do failed actions
and perception results. It contains no environment configuration, credentials,
request headers, signed retention receipts, local filenames, raw video bytes, SAM
overlay payloads, raw provider errors or stacks. The question and validated AI prose
are intentional run content; the UI asks users to review before sharing. No upload
or diagnostic backend is added.

## Trust semantics

The compact results/Evidence panel reports separate checks for matched inputs and
parameters, applied intervention, present trials, server-frozen measurements and,
where applicable, returned tracks and geometry re-derivation. Failed checks stay
visible. Offline geometry is labeled explicitly. AI remains downstream of evidence;
configuration/provider failure can be inspected without discarding measurements.

**DETERMINISTIC MODEL RESULT** and **REPLAYABLE INPUTS ✓** describe the synthetic
engine and retained exact network/spec. There is no automatic replay, “replay
verified” badge, biological reproducibility claim or confidence score. Biological
validation is explicitly **not established**. AI proposes/interprets; CausalFly
measures. SAM perceives; CausalFly derives the stimulus.

## Validation and manual acceptance

Targeted offline tests cover ID continuity, ordered/idempotent events, detached
snapshots, input forks, next-proposal lineage, SAM success/no-match/failure using
injected adapters, offline labeling, export privacy, correlated interpretation
failure/retry, invalid design rejection, failed geometry checks, concurrent reuse,
bounded retention, and trust rendering. All adapters are fake/injected; no live SAM
or Muse calls are made.

Final checks: `npm test` passed **314 tests** (273 library + 41 component tests);
`npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. Whitespace was
checked with `git diff --check`. Initial type/lint findings were corrected and
their checks rerun. Automated tests made **zero live SAM and zero live Muse calls**.

Desktop acceptance passed at **1920×1080** using an offline production preview at
`http://127.0.0.1:3118`: design/approval, trust labels, actual JSON download and ID
matching, explicit interpretation, Evidence retention, offline perception acceptance
and lineage. No horizontal overflow or browser runtime errors. Exactly one desktop
screenshot was captured in ignored `tmp/sprint-8c/desktop.png`; no screenshot matrix.

Manual acceptance: use offline mode; design → approve → inspect trust → interpret;
export JSON and match run ID, spec, network, measurements and event order. Navigate
to Evidence and verify the same record. Load the offline perception fixture and
repeat; confirm its label/formula and new-input lineage. Trigger a failed explicit
action and inspect correlated diagnostics without losing prior measurements.

## Limitations

1. Retention is local and ephemeral; restarts/expiry can remove server records.
   Retained browser snapshots/exports remain inspectable. If only a signed geometry
   record survives lookup eviction, a new run warns that its original ledger is unavailable.
2. JSON exports are editable copies, not signed attestations. They retain compact
   recorded traces and exact replay inputs, not uploaded media or every zero sample.
3. Replay is supported by inputs and engine provenance, not verified on every run.
   The recorder does not instrument FruitFly XR or add biological validation.
