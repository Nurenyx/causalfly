import { runWebObservation } from "@/lib/web/observational-workflow";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return Response.json({ ok: false, kind: "validation", error: "Submit a valid question and retained evidence reference." }, { status: 400, headers });
  }
  const response = await runWebObservation(input);
  return Response.json(response, { status: response.ok ? 200 : response.kind === "provider" ? 502 : response.kind === "configuration" ? 503 : 400, headers });
}
