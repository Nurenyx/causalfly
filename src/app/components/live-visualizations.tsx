"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FruitFlyEvidence } from "@/lib/sources/contracts";
import { parseAnatomy, projectAnatomy, type Anatomy } from "@/lib/sources/anatomy";
import { activityRaster, activitySeries, number } from "@/lib/sources/live-session";
import styles from "./live-session.module.css";

export function InstrumentPanel({ title, tag, className = "", children }: { title: string; tag?: string; className?: string; children: ReactNode }) {
  return <section className={`${styles.panel} ${className}`}><header className={styles.panelHeading}><h2>{title}</h2>{tag && <span>{tag}</span>}</header>{children}</section>;
}

function AnatomyProjection({ anatomy, frames, historical }: { anatomy: Anatomy; frames: readonly FruitFlyEvidence[]; historical: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const projection = useMemo(() => projectAnatomy(anatomy), [anatomy]);
  const evidence = frames.at(-1)!;
  const events = evidence.telemetry.spikeEvents;
  const active = useMemo(() => [...new Set(events.map(e => e.neuronId))].flatMap(id => projection.lookup.get(id) ?? []), [events, projection]);
  const geometry = useMemo(() => {
    const points = [...projection.lookup.values()];
    const bounds = points.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x), minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y), minZ: Math.min(b.minZ, p.raw[2]), maxZ: Math.max(b.maxZ, p.raw[2]) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
    return { ...bounds, width: Math.max(1, bounds.maxX - bounds.minX), height: Math.max(1, bounds.maxY - bounds.minY) };
  }, [projection]);
  const recent = useMemo(() => frames.slice(-3).map(f => ({ received: Date.parse(f.receivedAt), sequence: f.telemetry.sequence, points: [...new Set(f.telemetry.spikeEvents.map(e => e.neuronId))].flatMap(id => projection.lookup.get(id) ?? []) })), [frames, projection]);
  // Denser static context uses the same verified coordinate lookup as activity.
  const structurePoints = useMemo(() => [...projection.lookup.values()].filter((_, i) => i % 3 === 0).sort((a, b) => a.raw[2] - b.raw[2]), [projection]);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let animation = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const structure = document.createElement("canvas");
    const glow = document.createElement("canvas"); glow.width = glow.height = 40;
    const glowContext = glow.getContext("2d")!;
    const gradient = glowContext.createRadialGradient(20, 20, 0, 20, 20, 20);
    gradient.addColorStop(0, "#F2F7FAE6"); gradient.addColorStop(.15, "#18E0F4A6"); gradient.addColorStop(.4, "#00D0F04D"); gradient.addColorStop(1, "#00D0F000");
    glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 40, 40);
    let scale = 1, offsetX = 0, offsetY = 0;
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      element.width = width * ratio; element.height = height * ratio;
      structure.width = element.width; structure.height = element.height;
      scale = Math.min(width * .96 / geometry.width, height * .93 / geometry.height);
      offsetX = (width - geometry.width * scale) / 2 - geometry.minX * scale;
      offsetY = (height - geometry.height * scale) / 2 - geometry.minY * scale;
      const base = structure.getContext("2d")!;
      base.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
      base.fillStyle = "#00D0F0";
      for (const p of structurePoints) {
        // Raw Z controls display opacity and point size only; no anatomical orientation is assigned.
        const depth = (p.raw[2] - geometry.minZ) / Math.max(1, geometry.maxZ - geometry.minZ);
        base.globalAlpha = .055 + depth * .27; base.beginPath(); base.arc(p.x, p.y, .38 + depth * .55, 0, Math.PI * 2); base.fill();
      }
      draw();
    };
    const draw = () => {
      cancelAnimationFrame(animation);
      const ctx = element.getContext("2d"); if (!ctx) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1), now = Date.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, element.width, element.height); ctx.drawImage(structure, 0, 0);
      ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
      for (const frame of recent) {
        const current = frame.sequence === evidence.telemetry.sequence;
        const age = Math.max(0, now - frame.received);
        const decay = historical || reducedMotion.matches ? 0 : Math.max(0, 1 - age / 900);
        if (!current && !decay) continue;
        ctx.globalAlpha = current ? 1 : decay * .32;
        for (const p of frame.points) {
          const depth = (p.raw[2] - geometry.minZ) / Math.max(1, geometry.maxZ - geometry.minZ);
          const radius = current ? 5.3 + depth * 2.2 + decay * 1.4 : 3.2;
          ctx.drawImage(glow, p.x - radius, p.y - radius, radius * 2, radius * 2);
          ctx.fillStyle = current ? "#F2F7FA" : "#00D0F0";
          ctx.beginPath(); ctx.arc(p.x, p.y, current ? .95 + depth * .8 : .65, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // A finite receipt-driven transition; never a free-running firing animation.
      if (!historical && !reducedMotion.matches && now - Date.parse(evidence.receivedAt) < 900) animation = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    reducedMotion.addEventListener("change", draw);
    return () => { observer.disconnect(); cancelAnimationFrame(animation); reducedMotion.removeEventListener("change", draw); };
  }, [recent, projection, structurePoints, geometry, evidence, historical]);
  return <div className={styles.projection}>
    <div className={styles.projectionTop}><span>RAW X / Y · Z DEPTH</span><span><i />{historical ? "LAST RECEIVED TICK" : "LATEST RECEIVED TICK"} {number(evidence.telemetry.neuralTick)}</span></div>
    <canvas ref={canvas} className={styles.anatomyCanvas} data-current-ids={active.length} data-history-frames={recent.length} role="img" aria-label={`Actual published soma coordinates. ${number(structurePoints.length)} structural points sampled; ${number(active.length)} supplied spiking IDs have coordinates. Raw voxel X/Y, orientation unspecified. Raw Z determines display opacity and point size. Recent highlights are received events only.`} onPointerLeave={() => setHover(null)} onPointerMove={event => {
      const rect = event.currentTarget.getBoundingClientRect(); const scale = Math.min(rect.width * .96 / geometry.width, rect.height * .93 / geometry.height); const x = (event.clientX - rect.left - (rect.width - geometry.width * scale) / 2) / scale + geometry.minX, y = (event.clientY - rect.top - (rect.height - geometry.height * scale) / 2) / scale + geometry.minY;
      const p = active.find(p => Math.hypot(p.x - x, p.y - y) < 9);
      setHover(p ? `Neuron ${p.id} · raw XYZ ${p.raw.join(", ")}` : null);
    }} />
    <div className={styles.projectionBottom}><span>{hover ?? `${number(active.length)} / ${number(new Set(events.map(e => e.neuronId)).size)} supplied spiking IDs mapped`}</span><span>{number(structurePoints.length)} structural points · orientation unspecified</span></div>
  </div>;
}

function EventRaster({ frames }: { frames: readonly FruitFlyEvidence[] }) {
  const raster = useMemo(() => activityRaster(frames), [frames]);
  const end = frames.at(-1)?.telemetry.simulationMs ?? 0;
  const start = raster.points.length ? Math.min(...raster.points.map(p => p.modelMs)) : end;
  return <div className={styles.rasterWrap}><svg viewBox="0 0 900 330" className={styles.raster} role="img" aria-label="Received spike events by categorical neuron ID and model time; not anatomy.">
    {[0, .25, .5, .75, 1].map(f => <g key={f}><line x1={125 + f * 740} x2={125 + f * 740} y1="20" y2="280" className={styles.gridLine} /><text x={125 + f * 740} y="305" textAnchor="middle">{number(Math.round(start + f * (end - start)))}</text></g>)}
    {raster.ids.filter((_, i) => i % Math.max(1, Math.floor(raster.ids.length / 5)) === 0).map(id => <text key={id} x="110" y={30 + raster.ids.indexOf(id) / Math.max(1, raster.ids.length - 1) * 240} textAnchor="end">{id}</text>)}
    {raster.points.map((p, i) => <circle key={i} cx={125 + (p.modelMs - start) / Math.max(1, end - start) * 740} cy={25 + p.row / Math.max(1, raster.ids.length - 1) * 240} r="2" fill={p.sequence === frames.at(-1)?.telemetry.sequence ? "#FF68A2" : "#18E0F4"}><title>Neuron {p.neuronId} · {p.modelMs} model ms</title></circle>)}
    <text x="480" y="328" textAnchor="middle">Model time (ms) · {raster.ids.length} of {number(raster.totalIds)} supplied IDs · last 24 received frames</text>
  </svg></div>;
}

export function ConnectomeActivityView({ frames, historical }: { frames: readonly FruitFlyEvidence[]; historical: boolean }) {
  const [view, setView] = useState("anatomy");
  const [anatomy, setAnatomy] = useState<Anatomy | null>(null);
  const [failed, setFailed] = useState(false);
  const evidence = frames.at(-1);
  const hash = evidence?.provenance.connectomeSha256;
  useEffect(() => {
    if (!hash) return;
    const controller = new AbortController();
    fetch("/anatomy/male-cns-v1.json", { signal: controller.signal }).then(r => { if (!r.ok) throw new Error("Anatomy unavailable"); return r.json(); }).then(parseAnatomy).then(a => { if (a.connectomeSha256 !== hash) throw new Error("Anatomy identity mismatch"); setAnatomy(a); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [hash]);
  return <InstrumentPanel title="Connectome activity" tag="PUBLISHED ANATOMY" className={styles.connectome}>
    <div className={styles.heroToolbar}><span><i className={styles.cyanKey} /> {historical ? "Last tick" : "Current tick"} <i className={styles.recentKey} /> Recent activity <i className={styles.dimKey} /> Structure</span><div aria-label="Activity visualization"><button aria-pressed={view === "anatomy"} onClick={() => setView("anatomy")}>Anatomy</button><button aria-pressed={view === "raster"} onClick={() => setView("raster")}>ID raster</button></div></div>
    {evidence && (view === "raster" || failed) ? <EventRaster frames={frames} /> : evidence && anatomy ? <AnatomyProjection anatomy={anatomy} frames={frames} historical={historical} /> : <div className={styles.loadingAnatomy}>Loading verified static anatomy…</div>}
    <div className={styles.heroFooter}><div><strong>{evidence ? number(evidence.telemetry.displaySpikeEvents) : "—"}</strong><span>supplied events / latest tick</span></div><div><strong>{anatomy ? number(anatomy.count) : "—"}</strong><span>published soma coordinates</span></div><p>{failed ? "Anatomy unavailable · showing real ID events." : "Cyan marks supplied spiking IDs, not all active neurons. No inferred connections."}</p></div>
  </InstrumentPanel>;
}

export function LiveMetricChart({ frames, metric }: { frames: readonly FruitFlyEvidence[]; metric: "spikes" | "active" }) {
  const series = activitySeries(frames);
  const label = metric === "spikes" ? "Simulated spike events" : "Active simulated neurons";
  const max = Math.max(1, ...series.map(s => s[metric])) * 1.12;
  const first = series[0]?.tick ?? 0, last = series.at(-1)?.tick ?? first;
  const x = (tick: number) => 63 + (tick - first) / Math.max(1, last - first) * 367;
  const y = (value: number) => 150 - value / max * 128;
  const segments: typeof series[] = [];
  series.forEach((p, i) => { const prev = series[i - 1]; if (!prev || p.sequence !== prev.sequence + 1 || p.tick !== prev.tick + 1) segments.push([]); segments.at(-1)!.push(p); });
  return <figure className={`${styles.trace} ${metric === "active" ? styles.magentaTrace : ""}`}>
    <figcaption><span><i />{label.toUpperCase()}</span><strong>{series.length ? number(series.at(-1)![metric]) : "—"}</strong><small>{metric === "spikes" ? "reported in latest tick" : "simulation state · latest tick"}</small></figcaption>
    <svg viewBox="0 0 452 187" preserveAspectRatio="none" role="img" aria-label={`${label} over received simulation ticks. Latest ${series.at(-1)?.[metric] ?? "unavailable"}. Gaps are unjoined.`}>
      <defs><linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".3" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
      {[0, .5, 1].map(f => <g key={f}><line x1="63" x2="430" y1={y(max * f)} y2={y(max * f)} className={styles.gridLine} /><text x="52" y={y(max * f) + 4} textAnchor="end">{number(Math.round(max * f))}</text></g>)}
      {segments.filter(s => s.length > 1).map((s, i) => { const d = s.map((p, j) => `${j ? "L" : "M"}${x(p.tick)},${y(p[metric])}`).join(" "); return <g key={i}><path d={`${d} L${x(s.at(-1)!.tick)},150 L${x(s[0].tick)},150 Z`} fill={`url(#fill-${metric})`} /><path d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></g>; })}
      {!!series.length && <g><line x1={x(last)} x2={x(last)} y1="12" y2="150" stroke="currentColor" opacity=".4" strokeDasharray="3 4" /><circle cx={x(last)} cy={y(series.at(-1)![metric])} r="9" fill="currentColor" opacity=".16" /><circle cx={x(last)} cy={y(series.at(-1)![metric])} r="5" fill="currentColor" opacity=".55" /><circle cx={x(last)} cy={y(series.at(-1)![metric])} r="2.6" fill="#F2F7FA" /></g>}
      {series.map(p => <circle key={p.sequence} cx={x(p.tick)} cy={y(p[metric])} r="2.7" fill="currentColor"><title>Tick {p.tick}: {number(p[metric])}</title></circle>)}
      <text x="63" y="169">{number(first)}</text><text x="430" y="169" textAnchor="end">{last !== first ? number(last) : ""}</text><text x="250" y="185" textAnchor="middle">Simulation tick</text>
    </svg>
  </figure>;
}

export function WaitingForTelemetry({ connected }: { connected: boolean }) {
  return <section className={`${styles.panel} ${styles.waiting}`}><span className={styles.waitingIcon} aria-hidden="true">◉</span><span className={styles.microLabel}>{connected ? "FRUITFLY XR CONNECTED" : "FRUITFLY XR / READ-ONLY OBSERVATORY"}</span><h2>{connected ? "Waiting for simulation" : "Connect to the simulation"}</h2><p>{connected ? "Start a trial with the existing FruitFly XR client." : "Open the research connection to receive validated telemetry."}</p><div className={styles.dataPath}><div><b>01</b><strong>FruitFly XR</strong><span>Simulation source</span></div><i>→</i><div><b>02</b><strong>Connectome simulation</strong><span>Neural events + decoder</span></div><i>→</i><div><b>03</b><strong>CausalFly</strong><span>Observe + inspect evidence</span></div></div><span className={styles.waitingFoot}>REAL TELEMETRY WILL APPEAR HERE · NO FRAME RECEIVED</span></section>;
}
