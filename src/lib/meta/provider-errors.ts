import "server-only";
import OpenAI from "openai";
import type { MetaRequest } from "./client";

// Keep safe context separate so the original SDK exception is not replaced or mutated.
const diagnostics = new WeakMap<Error, string>();

export function addMetaProviderErrorContext(error: unknown, context: {
  readonly apiKey: string;
  readonly request: MetaRequest;
}): void {
  if (!(error instanceof Error)) return;

  const protectedText = [
    context.apiKey,
    context.request.system,
    context.request.inputJson,
    JSON.stringify(context.request.responseSchema),
  ].flatMap((text) => [text, JSON.stringify(text).slice(1, -1), encodeURIComponent(text)])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  function safeText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    // A provider may echo request data even inside an allowlisted field.
    // Do not emit JSON bodies or authorization headers disguised as messages.
    if (/\{|\[\s*["{\[]|\bauthorization\b|\bbearer\s+/i.test(value)) {
      return "[redacted provider content]";
    }
    let text = value;
    for (const protectedValue of protectedText) {
      text = text.split(protectedValue).join("[redacted]");
    }
    return text.slice(0, 1000);
  }

  const apiError = error instanceof OpenAI.APIError ? error : undefined;
  const body = apiError?.error;
  // SDK error.message may serialize its entire error body if body.message is absent.
  const message = body && typeof body === "object"
    ? ("message" in body && typeof body.message === "string"
      ? body.message : "Provider returned no human-readable error message.")
    : apiError ? apiError.message : "Meta provider request failed.";

  const fields = {
    name: safeText(error.name === "Error" ? error.constructor.name : error.name),
    status: Number.isInteger(apiError?.status) ? apiError!.status : null,
    type: safeText(apiError?.type),
    param: safeText(apiError?.param),
    code: safeText(apiError?.code),
    message: safeText(message),
    requestID: safeText(apiError?.requestID),
  };
  diagnostics.set(error, `Meta API request failed.\n${JSON.stringify(fields, null, 2)}`);
}

/** Only this allowlisted string should be printed for a caught provider error. */
export function formatMetaProviderError(error: unknown): string | undefined {
  return error instanceof Error ? diagnostics.get(error) : undefined;
}
