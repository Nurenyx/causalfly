import "server-only";
import { authorizeMedia, cleanupMedia } from "../perception/blob-media";
import { boundedBody } from "./perception-action";

export async function mediaAuthorization(request: Request) {
  const url = new URL(request.url); url.host = request.headers.get("host") ?? url.host;
  if (request.headers.get("origin") !== url.origin) return Response.json({ error: "Request secure upload from this CausalFly instance." }, { status: 403 });
  try {
    const result = await authorizeMedia(JSON.parse((await boundedBody(request, 4096)).toString()));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Secure upload failed. Check MP4/MOV type, 20 MiB limit and server private Blob configuration, then retry." }, { status: 400 }); }
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
