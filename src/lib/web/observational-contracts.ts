import type { ObservationalResponse } from "../meta/observational-schema";
import type { ObservationalEvidence } from "../meta/observational-evidence";
import type { ExecutionMode } from "./contracts";

export interface ObservationalResult {
  mode: ExecutionMode;
  evidence: ObservationalEvidence;
  analysis: ObservationalResponse;
}
export type WebObservationalResponse = { ok: true; result: ObservationalResult } |
  { ok: false; kind: "validation" | "evidence" | "configuration" | "provider"; error: string };
export interface ObservationalMetaState {
  pending: boolean;
  requestKey?: string;
  error?: string;
  result?: ObservationalResult;
}
