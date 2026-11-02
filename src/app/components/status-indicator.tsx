import { StatusChip, type StatusChipState } from "./page-header";
import type { ExecutionMode } from "@/lib/web/contracts";
import type { FruitFlySnapshot, DataSourceKind } from "@/lib/sources/contracts";
import { sessionStatus } from "@/lib/sources/live-session";
import { AccessiblePopover } from "./info-tooltip";
import { SCIENTIFIC_PROVENANCE } from "@/lib/sources/provenance-constants";

export function StatusIndicator({ label, active, working = false, children, tone, state }: {
  label: string;
  active: boolean;
  working?: boolean;
  children: React.ReactNode;
  tone?: "green" | "amber" | "neutral" | "red";
  state?: StatusChipState;
}) {
  const chipState: StatusChipState = state ?? (working ? "ACTIVE" : /error/i.test(label) || tone === "red" ? "ERROR" : /not configured|not connected|disabled|offline|disconnected/i.test(label) ? "OFFLINE" : /connectome.*male-cns/i.test(label) ? "INFORMATIONAL" : /standby|connecting|waiting/i.test(label) ? "STANDBY" : active ? "READY" : "STANDBY");
  const toneClass = tone ? ` tone-${tone}` : active ? " available" : "";
  return (
    <AccessiblePopover
      label={`${label} status`}
      trigger={<StatusChip state={chipState}>{label}</StatusChip>}
      className="status-indicator"
      buttonClassName={`status-indicator-button${toneClass}${working ? " working" : ""}`}
    >
      {children}
    </AccessiblePopover>
  );
}

/**
 * Truthful Meta status semantics:
 * Distinguishes configured/enabled mode from active execution or offline fixtures.
 * Does not falsely claim live provider connection is verified when no call has been made.
 * Surfaces authentication errors cleanly when credentials fail.
 */
export function MetaStatus({
  mode,
  working,
  disabled = false,
  error,
}: {
  mode: ExecutionMode | null;
  working: boolean;
  disabled?: boolean;
  error?: string | null;
}) {
  const live = mode === "META LIVE";
  const isAuthError = Boolean(error && /auth|credential|unauthorized|forbidden|api key/i.test(error));

  let label = "Meta · Not configured";
  let tone: "green" | "amber" | "neutral" = "neutral";
  let active = false;

  if (isAuthError) {
    label = "Meta · Auth error";
    tone = "amber";
    active = false;
  } else if (error) {
    label = "Meta · Request error";
    tone = "amber";
    active = false;
  } else if (working) {
    label = live ? "Meta · Working" : "Meta · Fixture Working";
    tone = live ? "green" : "amber";
    active = true;
  } else if (disabled) {
    label = "Meta · Disabled";
    tone = "neutral";
    active = false;
  } else if (live) {
    label = "Meta · Live mode";
    tone = "amber";
    active = true;
  } else if (mode) {
    label = "Meta · Offline Fixture";
    tone = "neutral";
    active = false;
  }

  return (
    <StatusIndicator label={label} active={active} working={working} tone={tone}>
      <strong>
        {isAuthError
          ? "META AUTHENTICATION ERROR"
          : error
          ? "META REQUEST ERROR"
          : live
          ? "META AI (ON-DEMAND)"
          : mode
          ? "OFFLINE META MODE"
          : disabled
          ? "LIVE META DISABLED"
          : "META CONFIGURATION NEEDED"}
      </strong>
      {isAuthError ? (
        <>
          <span>Meta Model API authentication failed. Check credentials in server configuration.</span>
          <span>No live provider request can run until credentials are restored.</span>
        </>
      ) : error ? (
        <>
          <span>Latest Meta request failed: {error}</span>
          <span>Retained experimental measurements remain unchanged.</span>
        </>
      ) : (
        <span>
          {live
            ? "Live Meta Model API is configured and enabled for on-demand experiment design and scientific interpretation."
            : mode
            ? "Demonstration responses use local deterministic fixtures. No live Meta model requests are being made."
            : disabled
            ? "Live Meta is disabled by the server setting. No provider request can run. Enable it explicitly or choose the offline fixture."
            : "Meta is not configured. Retained measurements remain available."}
        </span>
      )}
      {live && !error && (
        <>
          <span>No live provider ping or health check is performed in the background. Connectivity is verified on explicit request.</span>
          <span>No Meta request occurs until you explicitly choose a Meta AI action. On-demand inference only: no continuous polling or background requests.</span>
        </>
      )}
      <small>
        {working
          ? (live ? "An explicit Meta action is in progress." : "An explicit local fixture action is in progress.")
          : isAuthError
          ? "Authentication error · credentials required"
          : "Availability/configuration indicator · no continuous inference"}
      </small>
    </StatusIndicator>
  );
}

export function FruitFlyStatus({ snapshot, now }: { snapshot: FruitFlySnapshot; now: number | null }) {
  const status = sessionStatus(snapshot, now ?? 0);
  return (
    <StatusIndicator label="LIVE CONNECTOME SIMULATION" active={status.connected}>
      <strong>LIVE CONNECTOME SIMULATION SOURCE</strong>
      <span>Connectome-backed simulated neural dynamics.</span>
      <span>Connection: {status.connected ? "Connected" : snapshot.state === "CONNECTING" ? "Connecting" : "Disconnected"}<br />Telemetry: {status.live ? "Receiving" : snapshot.evidence ? "Last snapshot" : "Waiting"}</span>
      <span>Not recordings from a living fly.</span>
      <small>Source implementation: FruitFly XR Brain Server. This connects to the brain simulation service and does not launch the FruitFly XR Quest application. Connection controls are under Connection details.</small>
    </StatusIndicator>
  );
}

/**
 * Truthful Quest 3 status.
 * Quest video/telemetry streaming is NOT implemented in CausalFly.
 * Never show green connected based on Brain Server, Tailscale, or connectome state.
 */
export function QuestStatus() {
  return (
    <StatusIndicator label="Quest 3 — Not connected" active={false} tone="neutral">
      <strong>QUEST 3 HEADSET</strong>
      <span>Quest 3 streaming is not configured or connected.</span>
      <span>Status: Standalone XR application slot</span>
      <small>CausalFly web client does not maintain an active WebRTC/video stream from Quest 3. Brain Server telemetry is received directly via WebSocket/SSE.</small>
    </StatusIndicator>
  );
}

/**
 * Truthful Brain Server dual-channel status indicator.
 * Distinguishes read-only observatory from closed-loop sensory/control.
 *
 * Primary status semantics:
 * - State 1: Neither channel connected -> "Brain · Disconnected" (neutral)
 * - State 2: Observatory connected waiting for first frame -> "Brain · Telemetry Standby" (amber)
 * - State 3: Retained last snapshot / stale -> "Brain · Telemetry Standby" (amber)
 * - State 4: Fresh/current observatory telemetry -> "Brain · Telemetry Live" (green)
 * - State 5: Fresh telemetry + active closed-loop control -> "Brain · Telemetry + Control" (green)
 */
export function BrainServerStatus({
  snapshot,
  now,
  controlAvailable = false,
  controlStatus = "Configured / standby",
}: {
  snapshot: FruitFlySnapshot;
  now: number | null;
  controlAvailable?: boolean;
  controlStatus?: string;
}) {
  const status = sessionStatus(snapshot, now ?? 0);
  const telemetryConnected = status.connected;
  const isTelemetryLive = status.live;

  let primaryLabel = "Brain · Disconnected";
  let primaryTone: "green" | "amber" | "neutral" = "neutral";
  let active = false;

  if (isTelemetryLive && controlAvailable) {
    // State 5: Fresh telemetry + active closed-loop control
    primaryLabel = "Brain · Telemetry + Control";
    primaryTone = "green";
    active = true;
  } else if (isTelemetryLive) {
    // State 4: Fresh/current observatory telemetry
    primaryLabel = "Brain · Telemetry Live";
    primaryTone = "green";
    active = true;
  } else if (telemetryConnected || status.historical) {
    // State 2 & 3: Connected waiting for first frame, or retained last snapshot / stale
    primaryLabel = controlAvailable ? "Brain · Telemetry Standby + Control" : "Brain · Telemetry Standby";
    primaryTone = "amber";
    active = true;
  } else if (controlAvailable) {
    primaryLabel = "Brain · Control Active";
    primaryTone = "green";
    active = true;
  } else {
    // State 1: Disconnected
    primaryLabel = "Brain · Disconnected";
    primaryTone = "neutral";
    active = false;
  }

  let observatoryDetail = "Disconnected";
  if (snapshot.state === "ERROR") {
    observatoryDetail = `Error: ${snapshot.message}`;
  } else if (snapshot.state === "CONNECTING") {
    observatoryDetail = "Connecting...";
  } else if (isTelemetryLive) {
    observatoryDetail = "Current / fresh (streaming)";
  } else if (status.historical || status.label === "STALE") {
    observatoryDetail = "Last snapshot / stale (no current frames)";
  } else if (telemetryConnected) {
    observatoryDetail = "Connected / waiting for first frame";
  } else {
    observatoryDetail = "Disconnected";
  }

  const closedLoopDetail = controlAvailable ? "Connected / active" : (controlStatus || "Configured / standby");

  return (
    <StatusIndicator label={primaryLabel} active={active} tone={primaryTone} state={snapshot.state === "ERROR" && !controlAvailable ? "ERROR" : isTelemetryLive || controlAvailable ? "ACTIVE" : telemetryConnected || status.historical || snapshot.state === "CONNECTING" ? "STANDBY" : "OFFLINE"}>
      <strong>JAVA BRAIN SERVER CAPABILITIES</strong>
      <span>• Read-only observatory telemetry: {observatoryDetail}</span>
      <span>• Closed-loop sensory/control: {closedLoopDetail}</span>
      <span>Transport: Local/Tailscale WebSocket bridge</span>
      <small>Connectome dynamics are simulated. Does not launch the FruitFly XR Quest headset application.</small>
    </StatusIndicator>
  );
}

/**
 * Concise Connectome status indicator showing verified reference provenance.
 */
export function ConnectomeStatus({ source, snapshot }: { source: DataSourceKind; snapshot: FruitFlySnapshot }) {
  const isConnectome = source === "FRUITFLY_XR";
  const active = isConnectome ? snapshot.state === "CONNECTED" || snapshot.state === "DATA RECEIVED" : true;
  return (
    <StatusIndicator label={`Connectome: ${SCIENTIFIC_PROVENANCE.conciseIdentity.tag}`} active={active} tone={active ? "green" : "neutral"} state="INFORMATIONAL">
      <strong>CONNECTOME PROVENANCE</strong>
      <span>Dataset: {SCIENTIFIC_PROVENANCE.dataset}</span>
      <span>Reference: {SCIENTIFIC_PROVENANCE.citation.authors} ({SCIENTIFIC_PROVENANCE.citation.year}), {SCIENTIFIC_PROVENANCE.citation.journal}</span>
      <span>Published CNS: {SCIENTIFIC_PROVENANCE.primaryCounts.publishedCnsNeurons.toLocaleString()} neurons ({SCIENTIFIC_PROVENANCE.primaryCounts.uniqueCellTypes.toLocaleString()} types)</span>
      <span>Internal loaded: {SCIENTIFIC_PROVENANCE.internalCounts.loadedStructuralGraphNodes.toLocaleString()} structural nodes ({SCIENTIFIC_PROVENANCE.internalCounts.mappedSomaCoordinates.toLocaleString()} mapped somas)</span>
      <span>Sex disclosure: {SCIENTIFIC_PROVENANCE.anatomicalDisclosure.sexMatchNotice}</span>
      <small>Dynamics are simulated; living fly biology is not established.</small>
    </StatusIndicator>
  );
}
