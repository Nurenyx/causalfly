import { useEffect, useRef, useState } from "react";
import { dataSources, disconnectedFruitFly, type DataSourceKind, type FruitFlySnapshot } from "@/lib/sources/contracts";
import { Badge } from "./workspace-ui";

export function useFruitFlySource() {
  const [snapshot, setSnapshot] = useState<FruitFlySnapshot>(disconnectedFruitFly);
  const stream = useRef<EventSource | null>(null);
  useEffect(() => () => stream.current?.close(), []);

  function disconnect() {
    stream.current?.close();
    stream.current = null;
    setSnapshot((previous) => ({ ...previous, state: "DISCONNECTED", message: "Disconnected. Any evidence shown is the last received snapshot." }));
  }
  function connect() {
    stream.current?.close();
    setSnapshot({ ...disconnectedFruitFly(), state: "CONNECTING", message: "Opening the read-only research connection." });
    const subscription = new EventSource("/api/sources/fruitfly");
    stream.current = subscription;
    subscription.onmessage = (event) => {
      if (stream.current !== subscription) return;
      const next = JSON.parse(event.data) as FruitFlySnapshot;
      setSnapshot(next);
      if (next.state === "ERROR" || next.state === "DISCONNECTED") {
        subscription.close();
        stream.current = null;
      }
    };
    subscription.onerror = () => {
      if (stream.current !== subscription) return;
      subscription.close();
      stream.current = null;
      setSnapshot((previous) => ({ ...previous, state: "DISCONNECTED", message: "The telemetry connection was lost. Reconnect to receive new data." }));
    };
  }
  return { snapshot, connect, disconnect };
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
    <p id="source-scope-note" className="source-scope-note">FruitFly XR currently provides telemetry and evidence only. Experiment design and Compare use Synthetic Fixture.</p>
  </div>;
}
