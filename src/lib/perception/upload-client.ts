import { VideoActionError, classifyVideoFailure } from "./video-failure";
import { mediaReference, videoContentType, type MediaReference } from "./blob-contract";

/** Raw bytes go directly to private Blob, never through a Next request body. */
export async function uploadVideo(file: File, progress: (stage: string) => void, transport = { fetch: ((input, init) => globalThis.fetch(input, init)) as typeof fetch, createXHR: () => new XMLHttpRequest() }): Promise<MediaReference> {
  try {
    const contentType = videoContentType(file.name, file.type);
    progress("Preparing upload");
    const response = await transport.fetch("/api/media/authorize", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(35_000), body: JSON.stringify({ originalFilename: file.name, sizeBytes: file.size, contentType }) });
    let data;
    try { data = await response.json(); } catch { throw new Error("Upload authorization returned an unreadable response. Retry upload."); }
    if (!response.ok) throw new VideoActionError(data.error || "Secure upload authorization failed.", classifyVideoFailure("upload", { code: data.code, kind: data.kind, status: response.status }));
    const reference = mediaReference.parse(data.reference);
    // Signed PUT uses the Blob API host; private object URLs are for reads.
    const destination = new URL(data.presignedUrl);
    if (destination.protocol !== "https:" || destination.username || destination.password) throw new VideoActionError("Private upload destination is unavailable. Ask the host to check storage configuration.", {kind:"configuration",retryable:false,stage:"upload"});
    await new Promise<void>((resolve, reject) => {
      const xhr = transport.createXHR();
      xhr.open("PUT", destination.href); xhr.timeout = 120_000;
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = event => { if (event.lengthComputable) progress(`Uploading — ${Math.round(event.loaded / event.total * 100)}%`); };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Private upload failed or expired. Retry upload with the selected video."));
      xhr.onerror = xhr.ontimeout = () => reject(new Error("Private upload interrupted. Check your connection and retry upload."));
      progress("Uploading — 0%"); xhr.send(file);
    });
    progress("UPLOAD COMPLETE · ANALYSIS PENDING");
    return reference;
  } catch (error) {
    progress("Upload incomplete · video remains local");
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new VideoActionError("Upload authorization timed out. Your video remains selected; retry upload.", {kind:"transient",retryable:true,stage:"upload"});
    if (error instanceof VideoActionError) throw error;
    throw new VideoActionError(error instanceof Error ? error.message : "Upload interrupted. Retry explicitly.", {kind:"transient",retryable:true,stage:"upload"});
  }
}
