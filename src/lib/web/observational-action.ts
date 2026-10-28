import type { FruitFlyEvidence, FruitFlySnapshot } from "../sources/contracts";
import type { ObservationalMetaState, WebObservationalResponse } from "./observational-contracts";
import { observationalAnalysis } from "./observational-analysis";
import { observationalResponseSchema } from "../meta/observational-schema";

export function observationalRequest(question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) {
  if (!question.trim() || !snapshot.evidence || !snapshot.retentionId) return null;
  const sessionId = snapshot.evidence.telemetry.sessionId;
  const sequences = observationalAnalysis(snapshot, frames, 0).history.map(f => f.telemetry.sequence);
  return { researchQuestion: question, retentionId: snapshot.retentionId, sessionId, sequences };
}
export function observationalRequestKey(question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) {
  const input = observationalRequest(question, snapshot, frames);
  return input ? JSON.stringify(input) : undefined;
}

/** Explicit event handler only. The closure guards double clicks before React renders. */
export function createObservationalAction(publish: (state: ObservationalMetaState) => void, request: typeof fetch = fetch) {
  let pending = false;
  const cache = new Map<string, NonNullable<ObservationalMetaState["result"]>>();
  return async (question: string, snapshot: FruitFlySnapshot, frames: readonly FruitFlyEvidence[]) => {
    const input = observationalRequest(question, snapshot, frames);
    if (pending || !input) return;
    const requestKey = JSON.stringify(input);
    const cached = cache.get(requestKey);
    if (cached) { publish({ pending: false, requestKey, result: cached }); return; }
    pending = true;
    publish({ pending: true, requestKey });
    try {
      const response = await request("/api/sources/fruitfly/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input) });
      const data = await response.json() as WebObservationalResponse;
      // Browser messages are fixed even if a proxy returns an unexpected body.
      if (!response.ok || !data.ok) publish({ pending: false, requestKey, error: !data.ok && data.kind === "evidence" ? "The server no longer retains this window. Reconnect to receive telemetry, then retry." : "Meta analysis failed. Check the server configuration and retry." });
      else {
        const result = data.result;
        const analysis = observationalResponseSchema.parse(result.analysis);
        if (analysis.exactQuestion !== question || result.evidence.exactQuestion !== question || result.evidence.sessionId !== input.sessionId ||
          result.evidence.retainedFrameCount !== input.sequences.length || JSON.stringify(result.evidence.frames.map(f => f.sequence)) !== JSON.stringify(input.sequences) ||
          (!result.evidence.localAnswer.sufficient && analysis.evidenceSufficiency !== "INSUFFICIENT") ||
          !["META LIVE", "FAKE META CLIENT"].includes(result.mode)) throw new Error("Response mismatch");
        cache.set(requestKey, result);
        // Bound browser memory; retained results are reused for the lifetime of this app session.
        if (cache.size > 32) cache.delete(cache.keys().next().value!);
        publish({ pending: false, requestKey, result });
      }
    } catch { publish({ pending: false, requestKey, error: "Unable to complete Meta analysis. Check your connection and retry." }); }
    finally { pending = false; }
  };
}
