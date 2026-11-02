import { z } from "zod";
import { MAX_VIDEO_BYTES } from "./contracts";

/** Browsers can omit MIME or use octet-stream for local MOV files. */
export function videoContentType(name: string, type: string): "video/mp4" | "video/quicktime" {
  const expected = /\.mp4$/i.test(name) ? "video/mp4" : /\.mov$/i.test(name) ? "video/quicktime" : null;
  if (!expected || type && type !== "application/octet-stream" && type !== expected) throw new Error("Choose an MP4 or MOV video with a matching file type.");
  return expected;
}

export const uploadInput = z.strictObject({
  originalFilename: z.string().min(1).max(160).regex(/^[^/\\?&#\x00-\x1f]+\.(mp4|mov)$/i),
  contentType: z.enum(["video/mp4", "video/quicktime"]),
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_BYTES),
});
export const mediaReference = z.strictObject({ ticket: z.string().min(1).max(2048) });
export type MediaReference = z.infer<typeof mediaReference>;
/** Immutable provenance. No authorization tickets, signed URLs or credentials. */
export interface BlobMediaIdentity {
  mediaId: string; blobPathname: string; contentType: string; sizeBytes: number;
  originalFilename: string; uploadedAt: string; sha256: string; runId: string;
  storageProvider: "vercel-blob"; storageAccess: "private";
}
