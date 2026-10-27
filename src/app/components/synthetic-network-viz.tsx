import { useId } from "react";
import type { CompactTrialSummary } from "@/lib/meta/compact-evidence";
import { activityAtStep } from "@/lib/web/dashboard";

/** Layout is schematic; every node, edge, weight and activity comes from evidence. */
export function SyntheticNetworkViz({ trial, step }: { trial: CompactTrialSummary; step: number }) {
  const uid = useId().replace(/:/g, "");
  const { network, appliedPerturbation } = trial.provenance;
  const silenced = appliedPerturbation?.targetNodeId;
  const sample = activityAtStep(trial, step);
  const upstream = activityAtStep(trial, step - 1);
  const positions: Record<string, [number, number]> = {
    stimulus: [56, 133], primary_a: [204, 59], primary_b: [405, 59],
    alternate_a: [171, 204], alternate_b: [305, 204], alternate_c: [439, 204], motor: [558, 133],
  };
  return <figure className="network-figure">
    <figcaption><span>SYNTHETIC NETWORK</span><span>Activity at step <b>{step}</b></span></figcaption>
    <svg className="synthetic-network" viewBox="0 0 620 270" role="img" aria-label={`${trial.condition} network at computational step ${step}. ${silenced ? `${silenced} silenced.` : "Intact control."} ${sample ? "Node values are recorded normalized activity." : "No retained sample at this step."}`}>
      <defs>
        <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#376274" strokeWidth=".5" opacity=".28" /><circle cx="0" cy="0" r="1" fill="#6fbccc" opacity=".3" /></pattern>
        <filter id={`${uid}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" /></filter>
        <radialGradient id={`${uid}-field`}><stop stopColor={silenced ? "#40152e" : "#0b4c60"} stopOpacity=".38" /><stop offset="1" stopColor="#06121b" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="620" height="270" fill={`url(#${uid}-grid)`} />
      <ellipse cx="310" cy="135" rx="300" ry="130" fill={`url(#${uid}-field)`} />
      <text x="305" y="16" textAnchor="middle" className="path-label">PRIMARY PATH</text>
      <text x="305" y="266" textAnchor="middle" className="path-label">ALTERNATE PATH</text>
      {network.edges.map(({ from, to, weight }) => {
        const [x1, y1] = positions[from];
        const [x2, y2] = positions[to];
        const blocked = from === silenced || to === silenced;
        const alternate = !!silenced && (from.startsWith("alternate") || to.startsWith("alternate"));
        const drive = blocked ? 0 : Math.min(1, Math.abs((upstream?.nodes[from] ?? 0) * weight));
        const color = blocked ? "var(--red)" : alternate ? "var(--amber)" : "var(--cyan)";
        const path = `M${x1 + 17},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2 - 22},${y2}`;
        return <g key={`${from}-${to}`} className={`viz-edge${blocked ? " interrupted" : ""}`} style={{ color }} data-upstream-activity={upstream?.nodes[from]}>
          {drive > 0 && <path d={path} strokeWidth={6 + drive * 5} opacity={drive * .5} filter={`url(#${uid}-glow)`} />}
          <path d={path} strokeWidth={1.5 + drive * 2.8} opacity={blocked ? .65 : .22 + drive * .78} />
          <path d={`M${x2 - 30},${y2 - 5} L${x2 - 22},${y2} L${x2 - 30},${y2 + 5}`} opacity={.3 + drive * .7} />
          <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 13} textAnchor="middle">{weight}</text>
          <title>{from} → {to}; weight {weight}. {blocked ? "Interrupted by declared silence." : `Emphasis: recorded upstream activity at step ${step - 1} × weight; not a measured edge flow.`}</title>
        </g>;
      })}
      {network.nodes.map(({ id }) => {
        const [x, y] = positions[id];
        const value = sample?.nodes[id];
        const intensity = Math.min(1, Math.abs(value ?? 0));
        const color = id === silenced ? "var(--red)" : silenced && id.startsWith("alternate") ? "var(--amber)" : id === "motor" && silenced ? "var(--red)" : "var(--cyan)";
        return <g key={id} className={`viz-node${id === silenced ? " silenced-node" : ""}`} style={{ color }} data-node={id} data-activity={value}>
          <circle className="node-halo" cx={x} cy={y} r={27 + intensity * 17} fill="currentColor" opacity={intensity * .32} filter={`url(#${uid}-glow)`} />
          <circle className="node-halo" cx={x} cy={y} r={22 + intensity * 9} fill="currentColor" opacity={intensity * .12} />
          <circle cx={x} cy={y} r="19" fill="#091823" stroke="currentColor" strokeWidth={id === silenced ? 2.5 : 1} opacity={id === silenced ? 1 : .35 + intensity * .65} />
          <circle cx={x} cy={y} r="25" fill="none" stroke="currentColor" strokeWidth=".6" strokeDasharray="3 5" opacity={id === silenced ? .5 : .12 + intensity * .4} />
          {id === silenced ? <path d={`M${x - 8},${y - 8} l16,16 m0,-16 l-16,16`} stroke="currentColor" strokeWidth="4" /> : <circle cx={x} cy={y} r={4 + intensity * 5} fill="currentColor" opacity={.15 + intensity * .85} />}
          <text x={x} y={y + 43} textAnchor="middle">{id}</text>
          <text x={x} y={y - 33} textAnchor="middle" className={id === silenced ? "silenced-label" : "node-value"}>{id === silenced ? "SILENCED" : value ?? "—"}</text>
          <title>{id}: {value === undefined ? "no retained sample" : `normalized activity ${value}`} at step {step}{id === silenced ? "; declared silence intervention" : ""}</title>
        </g>;
      })}
    </svg>
    <div className="network-legend"><span><i className="cyan-dot" />Recorded activity</span>{silenced && <><span><i className="red-dot" />Silenced</span><span><i className="amber-dot" />Alternate path</span></>}<span className="network-weight-note">Edges: provenance weights</span></div>
  </figure>;
}
