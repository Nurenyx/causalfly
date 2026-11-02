import test from "node:test";
import assert from "node:assert/strict";
import { classifyVideoFailure, failureFromError, VideoActionError } from "./video-failure";
import { uploadVideo } from "./upload-client";
test("configuration is non-retryable even at 503; temporary 502/503 and timeout remain retryable", () => {
  for (const details of [{code:"UPLOAD_NOT_CONFIGURED",status:503},{kind:"configuration",status:503},{status:401}]) assert.deepEqual(classifyVideoFailure("upload",details),{kind:"configuration",retryable:false,stage:"upload"});
  for (const details of [{status:502},{status:503},{code:"UPLOAD_TIMEOUT"},{kind:"provider"}]) assert.equal(classifyVideoFailure("tracking",details).retryable,true);
  assert.equal(classifyVideoFailure("upload",{code:"INVALID_VIDEO",status:400}).retryable,false);
});
test("upload retains semantic error code across transport without issuing PUT", async () => {
  const file = new File(["test"],"clip.mp4");
  await assert.rejects(uploadVideo(file,()=>{}, {fetch:async()=>Response.json({error:"Storage unavailable on host",code:"UPLOAD_NOT_CONFIGURED"},{status:503}),createXHR:()=>{throw new Error("Must not PUT");}}), error => error instanceof VideoActionError && !error.failure.retryable && error.failure.kind==="configuration");
  assert.equal(failureFromError(new TypeError("Network unavailable"),"upload").retryable,true);
});
