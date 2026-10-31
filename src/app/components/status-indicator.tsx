import type { ExecutionMode } from "@/lib/web/contracts";
import type { FruitFlySnapshot } from "@/lib/sources/contracts";
import { sessionStatus } from "@/lib/sources/live-session";
import { AccessiblePopover } from "./info-tooltip";

export function StatusIndicator({ label, active, working = false, children }: { label: string; active: boolean; working?: boolean; children: React.ReactNode }) {
  return <AccessiblePopover label={`${label} status`} trigger={<><span aria-hidden="true">{active ? "●" : "○"}</span> {label}</>} className="status-indicator" buttonClassName={`status-indicator-button${active ? " available" : ""}${working ? " working" : ""}`}>{children}</AccessiblePopover>;
}

export function MetaStatus({ mode, working, disabled = false }: { mode: ExecutionMode | null; working: boolean; disabled?: boolean }) {
  const live = mode === "META LIVE";
  const label = working ? live ? "META WORKING" : "OFFLINE FIXTURE WORKING" : disabled ? "META DISABLED" : mode ?? "META NOT CONFIGURED";
  return <StatusIndicator label={label} active={live} working={working}><strong>{live ? "META AI AVAILABLE" : mode ? "OFFLINE META MODE" : disabled ? "LIVE META DISABLED" : "META CONFIGURATION NEEDED"}</strong><span>{live ? "Muse models are configured for experiment design and scientific interpretation." : mode ? "Demonstration responses use local fixtures. No live Meta model requests are being made." : disabled ? "Live Meta is disabled by the server setting. No provider request can run. Enable it explicitly or choose the offline fixture." : "Meta is not configured. Retained measurements remain available."}</span>{live && <span>No Meta request occurs until you explicitly choose a Meta AI action.</span>}<small>{working ? live ? "An explicit Meta action is in progress." : "An explicit local fixture action is in progress." : "Availability indicator · no continuous inference"}</small></StatusIndicator>;
}

export function FruitFlyStatus({ snapshot, now }: { snapshot: FruitFlySnapshot; now: number | null }) {
  const status = sessionStatus(snapshot, now ?? 0);
  return <StatusIndicator label="LIVE CONNECTOME SIMULATION" active={status.connected}><strong>LIVE CONNECTOME SIMULATION SOURCE</strong><span>Connectome-backed simulated neural dynamics.</span><span>Connection: {status.connected ? "Connected" : snapshot.state === "CONNECTING" ? "Connecting" : "Disconnected"}<br />Telemetry: {status.live ? "Receiving" : snapshot.evidence ? "Last snapshot" : "Waiting"}</span><span>Not recordings from a living fly.</span><small>Source implementation: FruitFly XR Brain Server. This connects to the brain simulation service and does not launch the FruitFly XR Quest application. Connection controls are under Connection details.</small></StatusIndicator>;
}
