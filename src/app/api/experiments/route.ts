import { runWebExperiment } from "@/lib/web/workflow";
import { runGuidedAction } from "@/lib/web/guided-workflow";

export async function POST(request: Request) {
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
      if (size > 512_000) {
        await reader.cancel();
        throw new Error("Body too large");
      }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return Response.json({ ok: false, kind: "validation", error: "Submit a JSON object containing a research question of at most 8,000 characters." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const response = input && typeof input === "object" && "action" in input ? await runGuidedAction(input) : await runWebExperiment(input);
  return Response.json(response, {
    status: response.ok ? 200 : response.kind === "validation" ? 400 : response.kind === "configuration" ? 503 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
