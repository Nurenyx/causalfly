import OpenAI from "openai";
import { z } from "zod";

export type MetaFailureCode = "CONFIGURATION_DISABLED" | "CONFIGURATION_INVALID" | "AUTHENTICATION_FAILED" | "PROVIDER_TIMEOUT" | "PROVIDER_RATE_LIMIT" | "PROVIDER_HTTP_ERROR" | "INVALID_PROVIDER_RESPONSE" | "SCHEMA_VALIDATION_FAILED" | "REQUEST_CANCELLED" | "UNKNOWN_PROVIDER_ERROR";

export class MetaFailure extends Error {
  constructor(readonly code: MetaFailureCode, message: string) { super(message); this.name = "MetaFailure"; }
}

/** Codes only. Never serialize SDK exceptions, bodies, headers or validation inputs. */
export function metaFailureCode(error: unknown): MetaFailureCode {
  if (error instanceof MetaFailure) return error.code;
  if (error instanceof z.ZodError) return "SCHEMA_VALIDATION_FAILED";
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "PROVIDER_TIMEOUT";
  if (error instanceof OpenAI.APIUserAbortError || error instanceof Error && error.name === "AbortError") return "REQUEST_CANCELLED";
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return "AUTHENTICATION_FAILED";
    if (error.status === 429) return "PROVIDER_RATE_LIMIT";
    if (error.status !== undefined) return "PROVIDER_HTTP_ERROR";
  }
  if (error instanceof SyntaxError) return "INVALID_PROVIDER_RESPONSE";
  return "UNKNOWN_PROVIDER_ERROR";
}
