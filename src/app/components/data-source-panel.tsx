import { useEffect, useState } from "react";
import { dataSources, type DataSourceKind, type FruitFlySnapshot } from "@/lib/sources/contracts";
import { createLiveConnection, emptyLiveSession, receiveSnapshot } from "@/lib/sources/live-session";
import { Badge } from "./workspace-ui";

export function useFruitFlySource() {
  const [session, setSession] = useState(emptyLiveSession);
  const [now, setNow] = useState<number | null>(null);
  const [connection] = useState(() => createLiveConnection(
    (snapshot) => {
      setSession((previous) => receiveSnapshot(previous, snapshot));
      setNow(Date.now());
    },
    (url) => new EventSource(url),
  ));
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
  const external = source === "FRUITFLY_XR";
  const active = ["CONNECTING", "CONNECTED", "DATA RECEIVED"].includes(snapshot.state);
  return <div className="source-card source-picker">
    <fieldset disabled={disabled} aria-describedby="source-scope-note">
      <legend className="sidebar-caption">DATA SOURCE</legend>
      {Object.values(dataSources).map((item) => {
        const isFruitFly = item.kind === "FRUITFLY_XR";
        const selected = source === item.kind;
        const status = isFruitFly ? snapshot.state : "READY";
        const tone = status === "READY" || status === "CONNECTED" || status === "DATA RECEIVED" ? "green" : status === "ERROR" ? "red" : status === "CONNECTING" ? "amber" : "muted";
        return <label key={item.kind} className={`source-option${selected ? " selected" : ""}`}>
          <input type="radio" name="data-source" value={item.kind} checked={selected} onChange={() => onSelect(item.kind)} aria-labelledby={`${item.kind}-label`} />
          <span className="source-option-content"><strong id={`${item.kind}-label`}>{item.label}</strong><span className="source-option-subtitle">{isFruitFly ? "Connectome-backed simulation" : "Engineering test network"}</span><span role="status" aria-label={`${item.label} status`}><Badge tone={tone}>{status}</Badge></span></span>
        </label>;
      })}
    </fieldset>
    {external && <div className="source-connection"><p role="status">{snapshot.message}</p><button type="button" className="secondary-button" onClick={active ? onDisconnect : onConnect}>{snapshot.state === "CONNECTING" ? "Cancel connection" : active ? "Disconnect" : snapshot.state === "ERROR" ? "Retry connection" : "Connect FruitFly XR"}</button><p>Read-only simulated dynamics. Not living-fly recordings.</p></div>}
    <p id="source-scope-note" className="source-scope-note">FruitFly XR powers Live Session, observational AI Scientist and Evidence. Controlled experiments and Compare use Synthetic Fixture.</p>
  </div>;
}
