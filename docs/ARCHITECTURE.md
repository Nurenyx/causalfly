# Experiment architecture

Sprint 2 adds Meta experiment design and downstream interpretation around the
unchanged Sprint 1 deterministic engine:

```text
Research Question
        ↓
Meta Experiment Designer
        ↓
validated ExperimentSpec
        ↓
DETERMINISTIC TRUST BOUNDARY
        ↓
Experiment Engine
        ↓
TrialResult / ExperimentComparison
        ↓
immutable Evidence Payload
        ↓
Meta Scientific Interpreter
        ↓
ScientificAnalysis
```

Meta proposes a specification; strict runtime validation accepts it before the
engine runs. Only the engine determines activity, measurements and provenance.
There is no dashboard integration, API route, database, or external dataset.

## Modules

- `src/lib/experiment/types.ts`: readonly network, experiment, intervention,
  measured trial, and comparison contracts.
- `network.ts`: network validation and the explicitly synthetic two-path fixture.
- `perturbation.ts`: silence validation and zeroing at every sampled step.
- `engine.ts`: parameter validation, synchronous simulation, measurements, and
  detached, recursively frozen records with full input provenance.
- `compare.ts`: matched experiment orchestration and verified comparison.
- `demo.ts`: demonstration experiment specification, independent of CLI output.
- `scripts/experiment-demo.ts`: human-readable summary and complete JSON output.
- `src/lib/meta/client.ts`: injectable raw-JSON client interface and server-only
  official OpenAI SDK adapter, configured exclusively through Meta variables.
- `meta/schemas.ts`: strict proposal and ScientificAnalysis schemas, existing-node
  checks, and the unchanged synthetic-network constraint.
- `meta/experiment-designer.ts`: question-to-proposal instructions and validation;
  only the explicitly allowed `SILENCE` spelling is normalized to `silence`.
- `meta/evidence.ts`: revalidates the accepted spec, calls the Sprint 1 engine,
  and constructs a detached, deeply frozen evidence payload with complete traces,
  measured metrics, deltas and provenance. Only locally issued payloads are
  accepted by the interpreter, preventing arbitrary records bypassing this gate.
- `meta/scientific-interpreter.ts`: serializes evidence as read-only model input
  and validates a separate, frozen ScientificAnalysis object.
- `meta/fake-client.ts`: deterministic, explicitly labeled offline template using
  the same raw-JSON parsing and validation paths; no network or credentials.
- `meta/workflow.ts`: composes design → engine/evidence → interpretation and
  selects fake or configured live mode without coupling AI into the engine.
- `scripts/experiment-ai-demo.ts`: labeled end-to-end CLI demonstration.

These are CLI/server TypeScript modules outside the Next.js routing tree. The
comparison uses Node's built-in deep equality; testing uses `node:test` with
`tsx` to execute TypeScript. No UI or API route is exposed.

## Engine semantics

At step 0 all nodes are zero except the input node, which receives the stimulus
amplitude. The engine applies silence immediately, including when the input or
output itself is targeted. For each transition:

```text
next[node] = clamp(sum(previous[parent] * edge.weight), 0, 1)
next[silenced target] = 0  (PERTURBED only)
```

All incoming weighted values are summed before clamping. Updates are synchronous
and each edge takes one step. Signed finite weights, parallel edges (additive),
and cycles are permitted; there is no retained activation without an incoming
edge, no random sampling, and no repeated stimulus. Input and output can be the
same node, in which case threshold crossing may occur at step 0.

`maxSteps` is the number of transitions; the trace contains `maxSteps + 1`
samples. `outputPeakActivity` is the maximum output over those samples, and
`outputThresholdCrossingStep` is the first sample with output **>=** threshold,
or null. Outcome is `THRESHOLD_REACHED` or `THRESHOLD_NOT_REACHED`.

The default fixture has a three-edge primary route with unit weights and a
four-edge alternate route whose first weight is 0.5. The default experiment
silences `primary_a`, uses a unit pulse, threshold 0.4, and six transitions.
These are chosen engineering parameters, not biological measurements.

## Matching and provenance

`runExperiment(network, spec)` passes the same network and specification into
both trials. CONTROL applies no intervention; PERTURBED applies the declared
silence. Both results record the declared intervention in the specification;
`appliedPerturbation` separately records whether it was applied.

Every trial includes an engine rule version, condition, full network definition
and source description, and full experiment specification. Snapshots are detached
from caller-owned objects and frozen with the trace and metrics. No timestamps
or random IDs enter the result, so repeated identical runs produce identical JSON.
The seed is matched and recorded but unused by this deterministic engine version.

`compareTrials` checks engine version, the entire network including provenance,
the entire experiment including hypothesis and declared target, stimulus, seed,
step limit, threshold, and applied condition/intervention. It throws on mismatch.
The comparison records each check and retains both trials. Numeric deltas are
PERTURBED minus CONTROL; crossing-step delta is null if either crossing is absent.
`outcomeChanged` compares the measured outcome labels.

Matching verifies engine-produced input snapshots, not authenticity of arbitrary
records supplied by an untrusted caller. There is no signature or external audit
store. Trace memory grows with node count times step count; this sprint targets
small fixtures and adds no large-network optimizations or resource service.

## Interpretation boundary

**AI-generated analysis is downstream interpretation and cannot alter experimental
evidence.** Clients receive serialized data, never mutable references to trials.
Evidence preserves both full measured trials, the comparison, accepted specification
and provenance separately from analysis. Strict analysis schemas reject extra
measurement or provenance fields; no model-generated fields are merged into
TrialResult or ExperimentComparison. Invalid proposals fail before simulation;
invalid analyses fail without changing evidence. The model cannot choose simulation
outcomes or rewrite their provenance.

Structural validation cannot prove that prose is scientifically accurate. System
instructions require observations grounded in the supplied values, separate
interpretation, limitations, and the possibility of unsupported hypotheses. Analysis
remains labeled, fallible model output. Next-target IDs are checked at runtime;
prose recommendations require review and must pass proposal validation before any
future execution. There is no automatic follow-up experiment execution.

The evidence gate is process-local, not cryptographic attestation or a persisted
audit store. Deserialized payloads must be regenerated through the deterministic
engine rather than admitted directly for interpretation. Read
[META-INTEGRATION.md](META-INTEGRATION.md) and
[SCIENTIFIC-CONSTRAINTS.md](SCIENTIFIC-CONSTRAINTS.md) before interpreting results.

## Experiment dashboard

The client shell (`src/app/observatory.tsx`) manages four in-memory workspaces with
`workspaceReducer` in `src/lib/web/dashboard.ts`. A completed response selects
Compare without modifying its evidence or analysis. Selecting a proposed next
question returns to Observatory and focuses its input; a separate explicit form
submission is required to run it. Navigation preserves the completed result.

`CompareDashboard` composes two condition panels, each containing
`SyntheticNetworkViz` and `ActivityChart`, followed by measured delta cards and
`PropagationTimeline`. `AiScientistRail` stays beside the measured evidence on
desktop; `ScientistView` contains the full ScientificAnalysis. `EvidenceView`
contains the specification, matching checks, provenance and retained trace JSON.
The existing CLI `--raw` pathway remains available and runs a separate experiment;
it is not represented as a retrieval of the current browser experiment.

The dashboard uses the existing compact web response without extending the
contract. Network nodes, edges and weights come from trial provenance; node halos
encode recorded peaks. Chart series select actual node activity samples and retain
their original computational step numbers. Omitted quiescent samples are disclosed,
never synthesized, and charts do not interpolate across gaps. The displayed chart
range covers retained samples; the complete observation window and omitted count
remain visible. First activation is the first sample whose node activity is
non-zero, without epsilon filtering. This remains exact because compaction retains
every non-zero sample. An unactivated node has null timing, distinct from step zero
and from a declared silence intervention. Missing threshold crossings remain null.

All layout, colors, readable field aliases and prose constraints are display-only.
The engine, experiment semantics, evidence gate, compact evidence, prompts, schemas
and provider transport are unchanged. SVG charts add no charting dependency, and
local design references are neither runtime assets nor data sources.
