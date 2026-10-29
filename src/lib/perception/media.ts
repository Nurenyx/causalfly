import "server-only";
import { BufferSource, EncodedPacketSink, Input, MP4 } from "mediabunny";
import { MAX_VIDEO_BYTES, MAX_VIDEO_FRAMES, MAX_VIDEO_SECONDS, type VideoMetadata } from "./contracts";

export function validateVideoFile(file: File): void {
  if (!/\.(mp4|mov)$/i.test(file.name) || !["video/mp4", "video/quicktime", "application/octet-stream", ""].includes(file.type)) throw new Error("Choose an MP4 or MOV video.");
  if (!file.size || file.size > MAX_VIDEO_BYTES) throw new Error("Choose a nonempty video of at most 20 MiB.");
}
/** Reads container metadata only; no neural model or video decoder is involved. */
export async function inspectVideo(bytes: Uint8Array): Promise<VideoMetadata> {
  const input = new Input({ source: new BufferSource(bytes), formats: [MP4] });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("No video track.");
    const width = track.displayWidth, height = track.displayHeight;
    if (width < 1 || height < 1 || width > 1920 || height > 1920) throw new Error("Use a clip with each dimension at most 1920 pixels.");
    const packets: { time: number; duration: number }[] = [];
    for await (const packet of new EncodedPacketSink(track).packets(undefined, undefined, { metadataOnly: true })) {
      if (packets.length >= MAX_VIDEO_FRAMES || packet.timestamp < 0 || !Number.isFinite(packet.timestamp) || !Number.isFinite(packet.duration) || packet.duration <= 0 || packet.timestamp + packet.duration > MAX_VIDEO_SECONDS + .001) {
        throw new Error("Use a clip of at most 15 seconds and 900 frames with valid timestamps.");
      }
      packets.push({ time: packet.timestamp, duration: packet.duration });
    }
    packets.sort((a, b) => a.time - b.time);
    if (packets.length < 2 || packets.some((p, i) => i > 0 && p.time <= packets[i - 1].time)) throw new Error("The clip needs at least two distinct video frames.");
    const durationSeconds = Math.max(...packets.map(p => p.time + p.duration));
    return { width, height, durationSeconds, frameTimes: packets.map(p => p.time) };
  } catch (error) {
    if (error instanceof Error && /Use a clip|distinct video/.test(error.message)) throw error;
    throw new Error("Unable to read this MP4/MOV. Export a short H.264 MP4 and try again.");
  } finally { input.dispose(); }
}
