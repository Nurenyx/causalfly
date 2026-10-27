# Scientific constraints

Sprint 1 uses a **synthetic network**. It is an engineering validation fixture,
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

AI interpretation will later be separated from measured engine output.
Interpretation must be separately labeled and may not replace, edit, or invent
TrialResult values. Sprint 1 includes no Meta API calls or AI interpretation.

Future real-connectome integration requires explicit dataset provenance
(source, version, license, preprocessing, mapping, and transformations), justified
model assumptions, and scientific validation before making biological claims.
The current fixture is not that validation.
