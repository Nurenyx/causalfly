# Experiment architecture

Intended flow:

Research Question → ExperimentSpec → deterministic experiment engine → TrialResult
→ ExperimentComparison → future Meta AI interpretation

Sprint 1 implements the typed specification, engine, measured trials, comparison,
and a CLI demonstration. A person supplies the question and hypothesis. There is
no question-generation system, dashboard, Meta integration, database, or external
dataset in this sprint.

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

## Future interpretation boundary

Meta AI may later consume a measured comparison as read-only input and produce
a separate interpretation artifact. **Meta AI must never be able to rewrite
measured TrialResult values.** The result contracts and runtime-frozen records
support this boundary; future integration must keep interpretation output separate
and preserve the original engine records. Read
[SCIENTIFIC-CONSTRAINTS.md](SCIENTIFIC-CONSTRAINTS.md) before interpreting results.
