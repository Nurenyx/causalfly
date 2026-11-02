import test from "node:test";
import assert from "node:assert/strict";
import { uploadVideo } from "./upload-client";
import { videoContentType } from "./blob-contract";

test("MP4/MOV omitted and octet-stream MIME normalize; mismatches fail", () => {
  assert.equal(videoContentType("clip.MOV", "application/octet-stream"), "video/quicktime");
  assert.equal(videoContentType("clip.mp4", ""), "video/mp4");
  assert.throws(() => videoContentType("clip.mov", "video/mp4"));
  assert.throws(() => videoContentType("clip.exe", ""));
});

test("failed upload preserves selected file and can retry without refreshing; success is not analysis", async () => {
  const file = new File(["test"], "clip.mov", { type: "application/octet-stream" });
  const stages: string[] = []; let attempt = 0, puts = 0;
  const transport = {
    fetch: (async (_url, options) => {
      assert.equal(JSON.parse(options!.body as string).contentType, "video/quicktime");
      assert.ok(options!.signal);
      if (++attempt === 1) return Response.json({ error: "Private video upload is not enabled on this server." }, { status: 503 });
      return Response.json({ reference: { ticket: "signed-ticket" }, presignedUrl: "https://vercel.com/api/blob/?pathname=clip.mov&signature=opaque" });
    }) as typeof fetch,
    createXHR: () => ({ upload: {}, status: 200, open() { puts++; }, setRequestHeader(_name: string, value: string) { assert.equal(value, "video/quicktime"); }, send(this: { onload: () => void }, sent: File) { assert.equal(sent, file); this.onload(); }, onload() {} }) as unknown as XMLHttpRequest,
  };
  await assert.rejects(uploadVideo(file, stage => stages.push(stage), transport), /not enabled/);
  assert.equal(stages.at(-1), "Upload incomplete · video remains local"); assert.equal(puts, 0);
  assert.deepEqual(await uploadVideo(file, stage => stages.push(stage), transport), { ticket: "signed-ticket" });
  assert.equal(stages.at(-1), "UPLOAD COMPLETE · ANALYSIS PENDING"); assert.equal(puts, 1);
});

test("authorization timeout and unreadable responses end the busy upload stage", async () => {
  const file = new File(["test"], "clip.mp4"); const stages: string[] = [];
  await assert.rejects(uploadVideo(file, s => stages.push(s), { fetch: async () => { throw new DOMException("timeout", "TimeoutError"); }, createXHR: () => { throw new Error("No PUT"); } }), /timed out/);
  assert.match(stages.at(-1)!, /incomplete/);
  await assert.rejects(uploadVideo(file, () => {}, { fetch: async () => new Response("not json"), createXHR: () => { throw new Error("No PUT"); } }), /unreadable/);
});

test("PUT rejection, network loss and timeout permit a fresh signed retry", async () => {
  const file = new File(["clip"], "clip.mp4");
  for (const failure of ["http", "network", "timeout"]) {
    let attempt = 0; const stages: string[] = [];
    const transport = {
      fetch: (async () => Response.json({reference:{ticket:`ticket-${++attempt}`},presignedUrl:"https://vercel.com/api/blob/?pathname=clip.mp4"})) as typeof fetch,
      createXHR: () => ({upload:{},status:attempt === 1 ? 403 : 200,open(){},setRequestHeader(){},onload(){},onerror(){},ontimeout(){},send(this:{onload:()=>void;onerror:()=>void;ontimeout:()=>void}) { if(attempt>1||failure==="http") this.onload(); else if(failure==="timeout") this.ontimeout(); else this.onerror(); }}) as unknown as XMLHttpRequest,
    };
    await assert.rejects(uploadVideo(file,s=>stages.push(s),transport), /failed|interrupted/);
    assert.match(stages.at(-1)!,/incomplete/);
    assert.deepEqual(await uploadVideo(file,s=>stages.push(s),transport),{ticket:"ticket-2"});
    assert.equal(stages.at(-1),"UPLOAD COMPLETE · ANALYSIS PENDING");
  }
});
