import type { MediaReference } from "./blob-contract";



/** Only the small authorization request reaches Next. Raw bytes go to the signed Blob PUT URL. */

export async function uploadVideo(file: File, progress: (stage: string) => void): Promise<MediaReference> {

  progress("Preparing upload");

  const response = await fetch("/api/media/authorize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ originalFilename: file.name, sizeBytes: file.size, contentType: file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4") }) });

  const data = await response.json();

  if (!response.ok) throw new Error(data.error || "Secure upload authorization failed. Retry.");

  await new Promise<void>((resolve, reject) => {

    const xhr = new XMLHttpRequest();

    xhr.open("PUT", data.presignedUrl); xhr.timeout = 120_000;

    xhr.setRequestHeader("Content-Type", file.type || (/\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4"));

    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(`Uploading — ${Math.round(event.loaded / event.total * 100)}%`); };

    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Secure upload failed or expired. Retry upload; use an MP4/MOV of at most 20 MiB."));

    xhr.onerror = xhr.ontimeout = () => reject(new Error("Secure upload interrupted. Check your connection and retry."));

    progress("Uploading — 0%");
    xhr.send(file);

  });

  progress("Upload complete · ready");

  return data.reference;

}
