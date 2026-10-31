import { useEffect, useId, useState } from "react";
import { dataSources, type DataSourceKind, type FruitFlySnapshot } from "@/lib/sources/contracts";
import { createLiveConnection, emptyLiveSession, receiveSnapshot } from "@/lib/sources/live-session";
import { Badge } from "./workspace-ui";

export function useFruitFlySource(autoConnect = false, configured = false) {
  const [session, setSession] = useState(emptyLiveSession);
  const [now, setNow] = useState<number | null>(null);
  const [connection] = useState(() => createLiveConnection(
    (snapshot) => {
      setSession((previous) => receiveSnapshot(previous, snapshot));
      setNow(Date.now());
    },
    (url) => new EventSource(url),
  ));
  useEffect(() => { if (autoConnect) connection.autoConnect(configured); }, [autoConnect, configured, connection]);
  const hasEvidence = Boolean(session.snapshot.evidence);
  useEffect(() => {
    if (!hasEvidence) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [hasEvidence]);
  useEffect(() => () => connection.dispose(), [connection]);
  return { ...session, now, connect: connection.connect, disconnect: connection.disconnect };
}

export function DataSourcePanel({ source, snapshot, disabled, onSelect, onConnect, onDisconnect }: {
  source: DataSourceKind; snapshot: FruitFlySnapshot; disabled: boolean;
  onSelect: (source: DataSourceKind) => void; onConnect: () => void; onDisconnect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sourcePanelId = useId();
  const active = ["CONNECTING", "CONNECTED", "DATA RECEIVED"].includes(snapshot.state);
  return <div className="source-card source-picker" data-expanded={expanded}>
    <button className="mobile-source-toggle" type="button" aria-expanded={expanded} aria-controls={sourcePanelId} onClick={() => setExpanded(!expanded)}>Sources & connection <span>{dataSources[source].label} · {active ? "Simulation connected" : "Simulation disconnected"} {expanded ? "−" : "+"}</span></button>
    <div id={sourcePanelId} className="source-panel-controls">
    <fieldset disabled={disabled} aria-describedby="source-scope-note">
      <legend className="sidebar-caption">DATA SOURCE</legend>
      {Object.values(dataSources).map((item) => {
        const isFruitFly = item.kind === "FRUITFLY_XR";
        const selected = source === item.kind;
        const status = isFruitFly ? snapshot.state : "READY";
        const tone = status === "READY" || status === "CONNECTED" || status === "DATA RECEIVED" ? "green" : status === "ERROR" ? "red" : status === "CONNECTING" ? "amber" : "muted";
        return <label key={item.kind} className={`source-option${selected ? " selected" : ""}`}>
          <input type="radio" name="data-source" value={item.kind} checked={selected} onChange={() => onSelect(item.kind)} aria-labelledby={`${item.kind}-label`} />
          <span className="source-option-content"><strong id={`${item.kind}-label`}>{item.label}</strong><span className="source-option-subtitle">{isFruitFly ? "Connectome-backed brain server" : "Engineering test network"}</span><span role="status" aria-label={`${item.label} status`}><Badge tone={tone}>{status}</Badge></span></span>
        </label>;
      })}
    </fieldset>
    <div className="source-connection" aria-label="Live connectome connection"><p role="status">{snapshot.state === "ERROR" ? "CONNECTION ERROR" : snapshot.state === "CONNECTING" ? "CONNECTING" : active ? snapshot.evidence ? "CONNECTED" : "WAITING FOR DATA" : snapshot.evidence ? "LAST SNAPSHOT" : "DISCONNECTED"}</p>{snapshot.state === "ERROR" && <p role="alert">{snapshot.message}</p>}<details><summary>Connection details</summary><button disabled={disabled} type="button" className="secondary-button" onClick={active ? onDisconnect : onConnect}>{snapshot.state === "CONNECTING" ? "Cancel connection" : active ? "Disconnect" : "Reconnect simulation"}</button><p role="status">{snapshot.message}</p><p>Source implementation: FruitFly XR Brain Server. Connects to the brain/connectome simulation service; it does not launch the FruitFly XR Quest application. Neural dynamics are simulated, not recordings from a living fly.</p></details></div>
    <p id="source-scope-note" className="source-scope-note">Controlled tests or observational simulation data.</p>
    </div>
  </div>;
}
