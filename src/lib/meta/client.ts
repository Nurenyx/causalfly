import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import OpenAI from "openai";
import { addMetaProviderErrorContext } from "./provider-errors";

export interface MetaRequest {
  readonly task: "design" | "interpret";
  readonly system: string;
  /** Serialized data prevents a client from obtaining mutable evidence references. */
  readonly inputJson: string;
  readonly responseSchema: Readonly<Record<string, unknown>>;
}

export interface MetaClient {
  readonly mode: "META LIVE" | "FAKE META CLIENT";
  complete(request: MetaRequest): Promise<string>;
}

export type MetaEnvironment = Readonly<{
  META_API_KEY?: string;
  META_BASE_URL?: string;
  META_MODEL?: string;
  META_TIMEOUT_MS?: string;
}>;

export function readMetaEnvironment(): MetaEnvironment {
  return {
    META_API_KEY: process.env.META_API_KEY,
    META_BASE_URL: process.env.META_BASE_URL,
    META_MODEL: process.env.META_MODEL,
    META_TIMEOUT_MS: process.env.META_TIMEOUT_MS,
  };
}

export function readLiveConfiguration(env: MetaEnvironment) {
  const missing = (["META_API_KEY", "META_BASE_URL", "META_MODEL"] as const)
    .filter((key) => !env[key]?.trim());
  if (missing.length) {
    throw new Error(`META LIVE requires: ${missing.join(", ")}. Configure all three Meta variables or explicitly use fake mode.`);
  }
  const baseURL = env.META_BASE_URL!.trim();
  try {
    const url = new URL(baseURL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error();
    }
  } catch {
    throw new Error("META_BASE_URL must be an HTTPS API base URL without credentials, query, or fragment.");
  }
  const timeoutText = env.META_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutText === undefined ? 120_000 : Number(timeoutText);
  if ((timeoutText !== undefined && !/^\d+$/.test(timeoutText)) ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) {
    throw new Error("META_TIMEOUT_MS must be a positive integer between 1 and 2147483647 milliseconds.");
  }
  return { apiKey: env.META_API_KEY!.trim(), baseURL, model: env.META_MODEL!.trim(), timeoutMs };
}

export interface MetaTransportOptions {
  /** The smoke command deliberately makes one attempt. Other callers retry by default. */
  readonly retry?: boolean;
  readonly onRetry?: (message: string) => void;
  /** Injectable timing for offline tests; these do not affect experiment randomness. */
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
}

function transientFailure(error: unknown): string | undefined {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.APIConnectionError) return "connection error";
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429 || (error.status !== undefined && error.status >= 500 && error.status <= 599)) {
      return `HTTP ${error.status}`;
    }
  }
  return undefined;
}

export class LiveMetaClient implements MetaClient {
  readonly mode = "META LIVE" as const;
  private readonly sdk: OpenAI;
  private readonly model: string;
  private readonly transport: MetaTransportOptions;

  constructor(
    env: MetaEnvironment = readMetaEnvironment(),
    fetchImplementation?: typeof fetch,
    transport: MetaTransportOptions = {},
  ) {
    const config = readLiveConfiguration(env);
    this.model = config.model;
    this.transport = transport;
    this.sdk = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: 0,
      timeout: config.timeoutMs,
      // Print provider information only through the safe application diagnostics.
      logLevel: "off",
      ...(fetchImplementation ? { fetch: fetchImplementation } : {}),
    });
  }

  async complete(request: MetaRequest): Promise<string> {
    let completion;
    const maxRetries = this.transport.retry === false ? 0 : 2;
    for (let retry = 0; ; retry++) {
      try {
        completion = await this.sdk.chat.completions.create({
          model: this.model,
          messages: [
            { role: "system", content: `${request.system}\nReturn only JSON matching this schema:\n${JSON.stringify(request.responseSchema)}` },
            { role: "user", content: request.inputJson },
          ],
          response_format: { type: "json_object" },
        });
        break;
      } catch (error: unknown) {
        const reason = transientFailure(error);
        if (!reason || retry >= maxRetries) {
          addMetaProviderErrorContext(error, { apiKey: this.sdk.apiKey ?? "", request });
          throw error;
        }
        const log = this.transport.onRetry ?? ((message: string) => console.error(message));
        log(`transient Meta ${reason}; retry ${retry + 1}/${maxRetries}`);
        const jitter = Math.floor((this.transport.random ?? Math.random)() * 100);
        await (this.transport.sleep ?? sleep)(500 * 2 ** retry + jitter);
      }
    }
    const choice = completion.choices[0];
    if (choice?.finish_reason !== "stop" || choice.message.refusal || !choice.message.content) {
      throw new Error("Meta returned an incomplete, refused, or empty response; no response accepted.");
    }
    return choice.message.content;
  }
}
