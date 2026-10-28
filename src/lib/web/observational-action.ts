import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import type { ObservationalMetaState, WebObservationalResponse } from "./observational-contracts";

/** Explicit event handler only. The closure guards double clicks before React renders. */
export function createObservationalAction(publish: (state: ObservationalMetaState) => void, request: typeof fetch = fetch) {
  let pending = false;
  return async (question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) => {
    if (pending || !question.trim() || !snapshot.evidence || !snapshot.retentionId) return;
    pending = true;
    publish({ pending: true });
    const sessionId = snapshot.evidence.telemetry.sessionId;
    const sequences = [...new Set([...frames, snapshot.evidence].filter(f => f.telemetry.sessionId === sessionId).map(f => f.telemetry.sequence))];
    try {
      const response = await request("/api/sources/fruitfly/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchQuestion: question, retentionId: snapshot.retentionId, sessionId, sequences }) });
      const data = await response.json() as WebObservationalResponse;
      // Browser messages are fixed even if a proxy returns an unexpected body.
      if (!response.ok || !data.ok) publish({ pending: false, error: !data.ok && data.kind === "evidence" ? "The server no longer retains this window. Reconnect to receive telemetry, then retry." : "Meta analysis failed. Check the server configuration and retry." });
      else publish({ pending: false, result: data.result });
    } catch { publish({ pending: false, error: "Unable to complete Meta analysis. Check your connection and retry." }); }
    finally { pending = false; }
  };
}
