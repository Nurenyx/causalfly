# Scientific constraints

Sprints 1 and 2 use a **synthetic network**. It is an engineering validation fixture,
not a biological model. All nodes, weights, and pathways are hand-authored to
exercise the software. Neutral node names have no biological identities.

Results must not be described as Drosophila findings, real neural mechanisms,
behavioral predictions, or evidence about a connectome. A changed synthetic motor
output is a measured property of this fixture under this update rule only.

The engine uses synchronous weighted propagation, clamps activation to [0, 1],
and applies a single initial stimulus pulse. Steps are computational transitions,
not milliseconds. There are no spikes, membrane dynamics, biological delays,
plasticity, noise, or fitted parameters. The longer alternate pathway takes more
steps solely because it contains more edges. The seed is recorded and matched;
v1 has no random operations, so changing the seed does not change activity.

Output peak and threshold crossing are measured over a finite window including
step 0. A missing crossing means only that the configured threshold was not
reached within that window. The outcome labels describe threshold attainment,
not behavior. Numeric deltas are PERTURBED minus CONTROL. Latency delta is null
when either crossing is absent; it is not zero or an estimate of infinity.

Sprint 2 Meta AI may design a validated ExperimentSpec and interpret measured
evidence. It may not determine simulation outcomes, invent measurements, edit
TrialResult / ExperimentComparison values, or rewrite provenance. Evidence is
immutable, engine-produced input; ScientificAnalysis remains a separate artifact.
The Sprint 1 engine contains no AI calls and is unchanged.

Analysis must separate measured observations from interpretation, disclose
limitations and confounders, and allow a hypothesis to be unsupported or
unassessed (`supportsHypothesis: false` or `null`). Schema validation verifies
structure and known next-target IDs, not the truth of arbitrary generated prose.
Model statements require scientific review against the separately preserved
evidence. Generated numbers never become experimental measurements.

Only the exact supplied synthetic demo network is supported by the Meta layer,
with one silence target from its existing node IDs. Proposals have a 1000-transition
resource limit. The offline fake client uses a fixed demo proposal and measured
evidence templates; it is not a general question interpreter or a real Meta model.
Its hypothesis support remains unassessed. Next experiments are recommendations
only and must pass validation before execution.

Future real-connectome integration requires explicit dataset provenance
(source, version, license, preprocessing, mapping, and transformations), justified
model assumptions, and scientific validation before making biological claims.
The current fixture is not that validation.
