import "server-only";
import { freezeRecord } from "../experiment/engine";
import { readRetainedWindow } from "../sources/retained-evidence";
import { observationalAnalysis } from "../web/observational-analysis";
import { answerObservationalQuestion } from "../web/observational-question";
import { researchQuestionSchema } from "./schemas";

const issued = new WeakSet<object>();

export function createObservationalEvidence(question: string, reference: { retentionId: string; sessionId: string; sequences: readonly number[] }, now = Date.now()) {
  const exactQuestion = researchQuestionSchema.parse(question);
  const { snapshot, frames } = readRetainedWindow(reference.retentionId, reference.sessionId, reference.sequences, now);
  const local = observationalAnalysis(snapshot, frames, now);
  const bundle = freezeRecord({
    source: "FRUITFLY_XR" as const,
    exactQuestion,
    sessionId: reference.sessionId,
    retainedFrameCount: local.history.length,
    capturedAt: new Date(now).toISOString(),
    stream: { state: snapshot.state, status: local.status.label, historical: local.status.historical },
    provenance: structuredClone(snapshot.evidence!.provenance),
    frames: local.history.map(({ receivedAt, telemetry: t }) => ({
      receivedAt, sequence: t.sequence, simulationTick: t.neuralTick, modelTimeMs: t.simulationMs,
      simulatedSpikeEventCount: t.totalSpikeEvents, activeSimulatedNeuronCount: t.activeNeuronCount,
      decoderState: t.motorMode, decoderChannels: t.decodedMotor.map(c => ({ name: c.name, value: c.value })),
      inputReferenceId: t.inputSequence, inputFresh: t.inputFresh,
      displayEventCount: t.displaySpikeEvents, displayTruncated: t.displayTruncated,
      droppedDisplayFrames: t.droppedDisplayFrames, droppedSubscriberMessages: t.droppedSubscriberMessages,
    })),
    decoderAndReferenceTransitions: local.changes,
    localAnswer: answerObservationalQuestion(exactQuestion, snapshot, frames, now),
    scope: "Received frames only; gaps are unknown. Counts are supplied simulation quantities, not biological rates. No intervention was applied by CausalFly.",
  });
  issued.add(bundle);
  return bundle;
}
export type ObservationalEvidence = ReturnType<typeof createObservationalEvidence>;
export function assertObservationalEvidence(evidence: ObservationalEvidence) {
  if (!issued.has(evidence)) throw new Error("Only server-retained evidence is accepted");
}
