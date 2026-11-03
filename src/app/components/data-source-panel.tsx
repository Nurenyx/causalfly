import { useEffect, useId, useState } from "react";
import { dataSources, type DataSourceKind, type FruitFlySnapshot } from "@/lib/sources/contracts";
import { createLiveConnection, emptyLiveSession } from "@/lib/sources/live-session";
import { createLivePresentation, LIVE_PRESENTATION_MS } from "@/lib/web/live-presentation";
import { liveStatePresentation } from "@/lib/web/live-state-presentation";
import { Badge } from "./workspace-ui";

export function useFruitFlySource(autoConnect = false, configured = false) {
  const [view, setView] = useState(() => ({ session: emptyLiveSession(), now: null as number | null }));
  const { session, now } = view;
  // Frame, history and receipt-age clock cross one React state boundary together.
  const [presentation] = useState(() => createLivePresentation(next => setView({ session: next, now: Date.now() })));
  const [connection] = useState(() => createLiveConnection(presentation.receive, (url) => new EventSource(url)));
  useEffect(() => { presentation.resume(); return () => { connection.dispose(); presentation.dispose(); }; }, [connection, presentation]);
  useEffect(() => { if (autoConnect) connection.autoConnect(configured); }, [autoConnect, configured, connection]);
  const hasEvidence = Boolean(session.snapshot.evidence);
  useEffect(() => {
    if (!hasEvidence) return;
    const timer = window.setInterval(() => {
      const time = Date.now();
      // A recent telemetry publication already refreshed age. Keep quiet-stream freshness
      // updates without an independent repaint between every pair of live publications.
      setView(previous => previous.now !== null && time - previous.now < LIVE_PRESENTATION_MS ? previous : { ...previous, now: time });
    }, 250);
    return () => window.clearInterval(timer);
  }, [hasEvidence]);
  return { ...session, now, current: presentation.current, flush: presentation.flush, readSnapshot: () => presentation.current().snapshot, connect: connection.connect, disconnect: connection.disconnect };
}

export function DataSourcePanel({ source, snapshot, now = null, disabled, onSelect, onConnect, onDisconnect }: {
  source: DataSourceKind; snapshot: FruitFlySnapshot; now?: number | null; disabled: boolean;
  onSelect: (source: DataSourceKind) => void; onConnect: () => void; onDisconnect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sourcePanelId = useId();
  const state = liveStatePresentation(snapshot, now ?? 0);
  const active = ["CONNECTING", "CONNECTED", "DATA RECEIVED"].includes(snapshot.state);
  return <div className="source-card source-picker" data-expanded={expanded}>
    <button className="mobile-source-toggle" type="button" aria-expanded={expanded} aria-controls={sourcePanelId} onClick={() => setExpanded(!expanded)}>Sources & connection <span>{dataSources[source].label} · {`Server ${state.server.toLowerCase()}`} {expanded ? "−" : "+"}</span></button>
    <div id={sourcePanelId} className="source-panel-controls">
    <fieldset disabled={disabled} aria-describedby="source-scope-note">
      <legend className="sidebar-caption">DATA SOURCE</legend>
      {Object.values(dataSources).map((item) => {
        const isFruitFly = item.kind === "FRUITFLY_XR";
        const selected = source === item.kind;
        const status = isFruitFly ? state.server : "READY";
        const tone = status === "READY" || status === "CONNECTED" ? "green" : status === "ERROR" ? "red" : status === "CONNECTING" ? "amber" : "muted";
        return <label key={item.kind} className={`source-option${selected ? " selected" : ""}`}>
          <input type="radio" name="data-source" value={item.kind} checked={selected} onChange={() => onSelect(item.kind)} aria-labelledby={`${item.kind}-label`} />
          <span className="source-option-content"><strong id={`${item.kind}-label`}>{item.label}</strong><span className="source-option-subtitle">{isFruitFly ? "Connectome-backed brain server" : "Engineering test network"}</span><span role="status" aria-label={`${item.label} status`}><Badge tone={tone}>{isFruitFly ? `SERVER ${status}` : status}</Badge></span></span>
        </label>;
      })}
    </fieldset>
    <div className="source-connection" aria-label="Live connectome connection"><p role="status">SERVER {state.server}</p><p className="source-state-detail">STREAM {state.stream}<br />EVIDENCE {state.evidence}</p><details><summary>Connection details</summary><button disabled={disabled} type="button" className="secondary-button" onClick={active ? onDisconnect : onConnect}>{snapshot.state === "CONNECTING" ? "Cancel connection" : active ? "Disconnect" : "Reconnect simulation"}</button><p role="status">{snapshot.message}</p><p>Source implementation: FruitFly XR Brain Server. Connects to the brain/connectome simulation service; it does not launch the FruitFly XR Quest application. Neural dynamics are simulated, not recordings from a living fly.</p></details></div>
    <p id="source-scope-note" className="source-scope-note">Controlled tests or observational simulation data.</p>
    </div>
  </div>;
}
