import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { del, get, head, issueSignedToken, list, presignUrl } from "@vercel/blob";
import { z } from "zod";
import { MAX_VIDEO_BYTES } from "./contracts";
import { mediaReference, uploadInput, type BlobMediaIdentity } from "./blob-contract";
import { inspectVideo } from "./media";
import { FlightRecorder, retainedRecorder } from "../web/flight-recorder";

export class MediaError extends Error {}

export const MEDIA_LIFETIME_MS = 2 * 60 * 60 * 1000;
// Provider route maxDuration is 240 seconds. Expired tickets cannot start another use.
export const CLEANUP_GRACE_MS = 5 * 60 * 1000;
const PREFIX = "causalfly/tmp/v1/";
const ticketSchema = uploadInput.extend({ mediaId: z.string().uuid(), runId: z.string(), blobPathname: z.string(), expires: z.number().int(), issued: z.number().int() });
type Ticket = z.infer<typeof ticketSchema>;
function secret() {
  const key = process.env.CAUSALFLY_MEDIA_SIGNING_SECRET;
  if (!key || key.length < 32) throw new Error("Secure upload is not configured. Configure the media signing secret and private Blob store.");
  return key;
}
function sign(value: Ticket) {
  const data = Buffer.from(JSON.stringify(value)).toString("base64url");
  return data + "." + createHmac("sha256", secret()).update(data).digest("base64url");
}
export function verifyMediaReference(input: unknown, now = Date.now()): Ticket {
  try {
    const { ticket } = mediaReference.parse(input);
    const [data, signature, extra] = ticket.split(".");
    if (extra || !data || !signature) throw new Error();
    const expected = createHmac("sha256", secret()).update(data).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) throw new Error();
    const value = ticketSchema.parse(JSON.parse(Buffer.from(data, "base64url").toString()));
    const ext = value.contentType === "video/mp4" ? "mp4" : "mov";
    if (value.blobPathname !== `${PREFIX}${value.issued}/${value.mediaId}.${ext}` || value.expires !== value.issued + MEDIA_LIFETIME_MS || value.issued > now || value.expires <= now) throw new Error();
    return value;
  } catch { throw new MediaError("Choose the video again: its secure upload reference is invalid or expired."); }
}
export async function authorizeMedia(input: unknown, storage = { issueSignedToken, presignUrl }) {
  const parsed = uploadInput.parse(input);
  if ((parsed.contentType === "video/mp4") !== /\.mp4$/i.test(parsed.originalFilename)) throw new MediaError("Choose matching MP4/MOV content type and extension.");
  const recorder = new FlightRecorder(), mediaId = randomUUID(), issued = Date.now();
  const blobPathname = `${PREFIX}${issued}/${mediaId}.${parsed.contentType === "video/mp4" ? "mp4" : "mov"}`;
  recorder.event("media.selected", { mediaId });
  const validUntil = issued + 5 * 60 * 1000;
  const constraints = { pathname: blobPathname, validUntil, maximumSizeInBytes: MAX_VIDEO_BYTES, allowedContentTypes: [parsed.contentType] };
  const signed = await storage.issueSignedToken({ ...constraints, operations: ["put"] });
  const { presignedUrl } = await storage.presignUrl(signed, { ...constraints, access: "private", operation: "put", allowOverwrite: false, addRandomSuffix: false, cacheControlMaxAge: 60 });
  recorder.event("media.upload.authorized", { mediaId });
  return { reference: { ticket: sign({ ...parsed, mediaId, runId: recorder.run_id, blobPathname, issued, expires: issued + MEDIA_LIFETIME_MS }) }, presignedUrl };
}
/** Resolves a server-issued pathname in the configured store; never fetch a client URL. */
export async function resolveMedia(input: unknown, storage = { head, get }, inspect = inspectVideo) {
  const ticket = verifyMediaReference(input);
  let metadata;
  try { metadata = await storage.head(ticket.blobPathname); }
  catch { throw new MediaError("Choose the video again: the private upload is unavailable or expired. Retry secure upload."); }
  if (metadata.pathname !== ticket.blobPathname || metadata.size !== ticket.sizeBytes || metadata.size < 1 || metadata.size > MAX_VIDEO_BYTES || metadata.contentType !== ticket.contentType || !new URL(metadata.url).hostname.endsWith(".private.blob.vercel-storage.com")) throw new MediaError("Choose the video again: private Blob metadata does not match the authorized upload.");
  let download;
  try { download = await storage.get(ticket.blobPathname, { access: "private", useCache: false, abortSignal: AbortSignal.timeout(30_000) }); }
  catch { throw new MediaError("Choose the video again: private storage could not retrieve this upload. Retry secure upload."); }
  if (!download || download.statusCode !== 200 || download.blob.etag !== metadata.etag || download.blob.size !== metadata.size || download.blob.contentType !== metadata.contentType) throw new MediaError("Choose the video again: the uploaded Blob is unavailable or changed.");
  const reader = download.stream.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_VIDEO_BYTES || size > metadata.size) { await reader.cancel(); throw new MediaError("Choose a video of at most 20 MiB."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  if (size !== metadata.size) throw new MediaError("Choose the video again: incomplete Blob download.");
  const bytes = Buffer.concat(chunks, size), media = await inspect(bytes);
  const identity: BlobMediaIdentity = { mediaId: ticket.mediaId, blobPathname: ticket.blobPathname, contentType: metadata.contentType, sizeBytes: size, originalFilename: ticket.originalFilename, uploadedAt: metadata.uploadedAt.toISOString(), sha256: createHash("sha256").update(bytes).digest("hex"), runId: ticket.runId, storageProvider: "vercel-blob", storageAccess: "private" };
  const recorder = retainedRecorder(ticket.runId) ?? new FlightRecorder();
  recorder.event("media.upload.completed", { mediaId: identity.mediaId });
  recorder.media(identity); recorder.event("media.validated", { mediaId: identity.mediaId });
  return { file: new File([bytes], ticket.contentType === "video/mp4" ? "stimulus.mp4" : "stimulus.mov", { type: ticket.contentType }), media, identity, recorder };
}
/** Explicit bounded operator sweep. No TTL is claimed. Run repeatedly using the returned cursor. */
export async function cleanupMedia(cursor?: string, storage = { list, del }, now = Date.now()) {
  const page = await storage.list({ prefix: PREFIX, limit: 100, ...(cursor ? { cursor } : {}) });
  let deleted = 0;
  for (const blob of page.blobs) {
    const match = /^causalfly\/tmp\/v1\/(\d+)\/[0-9a-f-]+\.(mp4|mov)$/.exec(blob.pathname);
    if (match && Number(match[1]) + MEDIA_LIFETIME_MS + CLEANUP_GRACE_MS < now && blob.uploadedAt.getTime() + CLEANUP_GRACE_MS < now) { await storage.del(blob.url); deleted++; }
  }
  return { deleted, cursor: page.hasMore ? page.cursor : null };
}
