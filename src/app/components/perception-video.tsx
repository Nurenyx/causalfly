"use client";

import { useRef, useState } from "react";
import { Video, type VideoRef } from "@meta-sam/react";
import type { VideoSegmentationSnapshot } from "@meta-sam/parser";
import type { PerceptionRecord } from "@/lib/perception/contracts";

export default function PerceptionVideo({ file, overlay, perception }: { file: File; overlay: VideoSegmentationSnapshot; perception: PerceptionRecord }) {
  const player = useRef<VideoRef>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const observed = perception.measurement.frames.find(f => f.frameIndex === frame);
  async function operation(action: () => Promise<unknown> | undefined) {
    try { await action(); } catch { setError("Frame-accurate playback is unavailable for this codec. Measurements and source geometry remain inspectable below; try H.264 MP4 in a WebCodecs browser."); }
  }
  return <div className="perception-player"><Video ref={player} src={file} result={overlay} muted objectFit="contain" style={{ display: "block", height: "clamp(180px, 65vw, 400px)", aspectRatio: "auto" }} boxLabel={perception.concept} onPlayingChange={setPlaying} onFrame={event => setFrame(event.frameIndex)} onLoadedMetadata={() => setReady(true)} onError={() => setError("This browser could not decode the tracked clip. Try H.264 MP4 in a WebCodecs browser.")} canvasProps={{ "aria-label": "Meta SAM returned object masks and boxes over source video", role: "img" }} />
    <div className="perception-player-controls"><button type="button" className="secondary-button" disabled={!ready || Boolean(error)} onClick={() => { if (playing) player.current?.pause(); else void operation(() => player.current?.play()); }}>{playing ? "Pause video" : "Play tracked video"}</button>
      <input aria-label="Tracked video frame" type="range" min="0" max={perception.media.frameTimes.length - 1} value={frame} disabled={!ready || Boolean(error)} onChange={event => { player.current?.pause(); void operation(() => player.current?.seekToFrame(Number(event.target.value))); }} />
      <output>FRAME {frame + 1} / {perception.media.frameTimes.length}</output>
    </div><small className="amber-text">META SAM / {observed ? `TRACK ${perception.measurement.objectId} · ${(observed.area * 100).toFixed(1)}% BOX AREA` : "NO DETECTION ON THIS FRAME"}</small>
    {error && <p role="alert">{error}</p>}
  </div>;
}
