import "server-only";
import OpenAI from "openai";

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
}>;

export function readMetaEnvironment(): MetaEnvironment {
  return {
    META_API_KEY: process.env.META_API_KEY,
    META_BASE_URL: process.env.META_BASE_URL,
    META_MODEL: process.env.META_MODEL,
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
  return { apiKey: env.META_API_KEY!.trim(), baseURL, model: env.META_MODEL!.trim() };
}

export class LiveMetaClient implements MetaClient {
  readonly mode = "META LIVE" as const;
  private readonly sdk: OpenAI;
  private readonly model: string;

  constructor(env: MetaEnvironment = readMetaEnvironment(), fetchImplementation?: typeof fetch) {
    const config = readLiveConfiguration(env);
    this.model = config.model;
    this.sdk = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: 0,
      timeout: 30_000,
      ...(fetchImplementation ? { fetch: fetchImplementation } : {}),
    });
  }

  async complete(request: MetaRequest): Promise<string> {
    let completion;
    try {
      completion = await this.sdk.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: `${request.system}\nReturn only JSON matching this schema:\n${JSON.stringify(request.responseSchema)}` },
          { role: "user", content: request.inputJson },
        ],
        response_format: { type: "json_object" },
      });
    } catch {
      // Do not surface provider error bodies, request headers, or secrets in CLI logs.
      throw new Error("Meta API request failed. Check server-side configuration and provider availability; no response accepted.");
    }
    const choice = completion.choices[0];
    if (choice?.finish_reason !== "stop" || choice.message.refusal || !choice.message.content) {
      throw new Error("Meta returned an incomplete, refused, or empty response; no response accepted.");
    }
    return choice.message.content;
  }
}
