import type { Workspace } from "@/lib/web/dashboard";

const paths = [
  { workspace: "observatory", index: "01 / ASK → TEST", title: "Run an experiment", description: "Change one thing and measure the effect.", action: "Open Experiment", icon: "↗" },
  { workspace: "live", index: "02 / OBSERVE", title: "Watch a connectome", description: "Observe simulated neural activity across a published connectome.", action: "Open Live Connectome", icon: "◌" },
  { workspace: "evidence", index: "03 / VERIFY", title: "Inspect evidence", description: "See measurements, provenance, diagnostics and how a result was produced.", action: "Open Evidence", icon: "▤" },
] as const;

export function HomeOverview({ disabled, onOpen }: { disabled: boolean; onOpen: (workspace: Workspace) => void }) {
  const nodes = Array.from({ length: 58 }, (_, i) => {
    const angle = i * 2.39996, radius = Math.sqrt((i + 1) / 58);
    return { x: 230 + Math.cos(angle) * radius * 180, y: 190 + Math.sin(angle) * radius * 140 };
  });
  return <div className="home-overview">
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-introduction"><span className="cockpit-kicker">CAUSALFLY / ASK → TEST → UNDERSTAND</span><h2 id="home-title">Ask a nervous system<br />a question.</h2><p className="home-tagline">AI scientist for embodied neural experiments.</p><p className="home-promise">Test one change.<br /><span>See what actually changed.</span></p><p className="home-value">AI-guided experiment design, visual perception and deterministic measurement. One workflow, with evidence behind every result.</p><button type="button" className="primary-button" disabled={disabled} onClick={() => onOpen("observatory")}>Run your first experiment <span aria-hidden="true">↗</span></button></div>
      <div className="home-instrument" aria-hidden="true"><div className="home-instrument-heading"><span>NEURAL EXPERIMENT WORKBENCH</span><span>CONTROL → INTERVENTION</span></div><svg viewBox="0 0 460 380"><defs><radialGradient id="home-glow"><stop stopColor="#06bddc" stopOpacity=".15" /><stop offset="1" stopColor="#06bddc" stopOpacity="0" /></radialGradient></defs><circle cx="230" cy="190" r="185" fill="url(#home-glow)" /><ellipse cx="230" cy="190" rx="205" ry="160" fill="none" stroke="#184451" strokeDasharray="3 8" />{nodes.map((node, i) => <g key={i}>{[7, 13].map(offset => { const target = nodes[(i + offset) % nodes.length]; return <line key={offset} x1={node.x} y1={node.y} x2={target.x} y2={target.y} stroke={i % 9 === 0 ? "#f5d560" : "#1ca5c0"} strokeOpacity={i % 9 === 0 ? .5 : .2} />; })}<circle cx={node.x} cy={node.y} r={i % 9 === 0 ? 5 : 2.5} fill={i % 9 === 0 ? "#f5d560" : "#52dbed"} /></g>)}</svg><div className="home-instrument-caption"><span>ONE CHANGE</span><strong>From activity to understanding.</strong><small>Illustration · no live neural activity shown</small></div></div>
    </section>
    <section className="home-paths" aria-label="Choose a workspace">{paths.map(path => <button type="button" key={path.workspace} disabled={disabled} onClick={() => onOpen(path.workspace)}><span className="cockpit-kicker">{path.index}</span><span className="home-path-icon" aria-hidden="true">{path.icon}</span><h3>{path.title}</h3><p>{path.description}</p><span className="home-path-action">{path.action} <span aria-hidden="true">↗</span></span></button>)}</section>
    <section className="home-trust" aria-label="How CausalFly works"><div><span className="cockpit-kicker">CLEAR ROLES. TRACEABLE RESULTS.</span><h3>Meta reasons. CausalFly measures.</h3></div><ol><li><strong>Meta designs</strong><span>You review & approve</span></li><li><strong>CausalFly runs & measures</strong><span>Matched control + intervention</span></li><li><strong>Meta interprets</strong><span>Only when you ask</span></li></ol></section>
    <p className="home-boundary">Controlled experiments use a synthetic engineering model. Live connectome simulation shows connectome-backed simulated dynamics. Neither is a recording from a living fly; real-fly validation is not established.</p>
  </div>;
}
