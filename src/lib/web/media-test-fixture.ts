// Offline test-only adapter for pre-Blob handler regression cases.
import { createHash, randomUUID } from "node:crypto";
import { inspectVideo, validateVideoFile } from "../perception/media";
import { FlightRecorder } from "./flight-recorder";
import type { BlobMediaIdentity } from "../perception/blob-contract";
const files = new Map<string, File>();
export function referenceBody(form: FormData) {
  const fields = Object.fromEntries(form.entries());
  if (fields.mode === "fixture") return JSON.stringify({ mode: "fixture" });
  const id = randomUUID(), file = fields.video;
  if (file instanceof File) files.set(id, file);
  const { video: _video, ...rest } = fields; void _video;
  return JSON.stringify({ ...rest, mode: "live", media: { ticket: id } });
}
export function fixtureResolver(inspect = inspectVideo) {
  return async (input: unknown) => {
    const file = files.get((input as { ticket: string }).ticket);
    if (!file) throw new Error("Choose a video.");
    validateVideoFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = await inspect(bytes), recorder = new FlightRecorder();
    const identity: BlobMediaIdentity = { mediaId: randomUUID(), blobPathname: "causalfly/tmp/test.mp4", contentType: "video/mp4", sizeBytes: file.size, originalFilename: "stimulus.mp4", uploadedAt: new Date().toISOString(), sha256: createHash("sha256").update(bytes).digest("hex"), runId: recorder.run_id, storageProvider: "vercel-blob", storageAccess: "private" };
    return { file: new File([bytes], /\.mov$/i.test(file.name) ? "stimulus.mov" : "stimulus.mp4", { type: file.type }), media, recorder, identity };
  };
}
