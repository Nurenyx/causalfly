import "server-only";
import { BlobAccessError, BlobStoreNotFoundError, BlobStoreSuspendedError } from "@vercel/blob";
import { authorizeMedia, cleanupMedia, MediaConfigurationError, MediaError } from "../perception/blob-media";
import { ZodError } from "zod";
import { boundedBody } from "./perception-action";

export async function mediaAuthorization(request: Request, authorize = authorizeMedia) {
  const url = new URL(request.url); url.host = request.headers.get("host") ?? url.host;
  if (request.headers.get("origin") !== url.origin) return Response.json({ error: "Request secure upload from this CausalFly instance." }, { status: 403 });
  try {
    const result = await authorize(JSON.parse((await boundedBody(request, 4096)).toString()));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const config = error instanceof MediaConfigurationError || error instanceof BlobAccessError || error instanceof BlobStoreNotFoundError || error instanceof BlobStoreSuspendedError;
    const invalid = error instanceof ZodError || error instanceof SyntaxError || error instanceof MediaError;
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    return Response.json({ error: config ? error instanceof MediaConfigurationError ? error.message : "Private storage access is unavailable on this host. Ask the host to configure private Blob access." : invalid ? "Choose a nonempty MP4/MOV of at most 20 MiB with a matching file type." : timeout ? "Private storage took too long to respond. Your video remains selected; retry upload." : "Private storage could not authorize this upload. Your video remains selected; retry or ask the host to check storage access.", code: config ? "UPLOAD_NOT_CONFIGURED" : invalid ? "INVALID_VIDEO" : timeout ? "UPLOAD_TIMEOUT" : "STORAGE_UNAVAILABLE" }, { status: config ? 503 : invalid ? 400 : timeout ? 504 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
export async function mediaCleanup(request: Request) {
  const key = process.env.CRON_SECRET;
  if (!key || request.headers.get("authorization") !== `Bearer ${key}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    if (cursor && cursor.length > 2048) throw new Error();
    return Response.json(await cleanupMedia(cursor), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Cleanup failed; retry the sweep." }, { status: 503 }); }
}
