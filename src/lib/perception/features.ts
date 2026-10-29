import { MAPPING_RULE, type PerceptionMeasurement, type TrackedBox, type VideoMetadata } from "./contracts";

/** Half-open pixel boxes from the official parser. No biological angle is inferred. */
export function extractFeatures(objectId: string, boxes: readonly TrackedBox[], media: VideoMetadata): PerceptionMeasurement {
  if (!Number.isInteger(media.width) || !Number.isInteger(media.height) || media.width <= 0 || media.height <= 0 ||
      !Number.isFinite(media.durationSeconds) || media.durationSeconds <= 0) throw new Error("Invalid media dimensions or duration.");
  const sorted = [...boxes].sort((a, b) => a.frameIndex - b.frameIndex);
  if (sorted.length < 2) throw new Error("At least two tracked frames are required to measure apparent size change.");
  let previousArea = 0, previousTime = -Infinity, previousFrame = -1;
  const frames = sorted.map((box, index) => {
    const { left, top, right, bottom, frameIndex } = box;
    const timeSeconds = media.frameTimes[frameIndex];
    if (![left, top, right, bottom].every(Number.isFinite) || left < 0 || top < 0 || right > media.width || bottom > media.height || right <= left || bottom <= top ||
        !Number.isSafeInteger(frameIndex) || frameIndex <= previousFrame || !Number.isFinite(timeSeconds) || timeSeconds < 0 || timeSeconds >= media.durationSeconds || timeSeconds <= previousTime) {
      throw new Error("SAM returned invalid, duplicate, or out-of-media tracking geometry.");
    }
    const area = (right - left) * (bottom - top) / (media.width * media.height);
    const areaChange = index ? area - previousArea : 0;
    const areaGrowthPerSecond = index ? areaChange / (timeSeconds - previousTime) : 0;
    previousArea = area; previousTime = timeSeconds; previousFrame = frameIndex;
    return { ...box, timeSeconds, area, centroidX: (left + right) / (2 * media.width), centroidY: (top + bottom) / (2 * media.height), areaChange, areaGrowthPerSecond };
  });
  const firstArea = frames[0].area, lastArea = frames.at(-1)!.area;
  const netAreaChange = lastArea - firstArea;
  const expansion = Math.max(0, netAreaChange);
  return { objectId, selectionRule: "longest-track-then-numeric-id", frames, firstArea, lastArea, netAreaChange, expansion,
    amplitude: Math.min(1, expansion / 0.5), mappingRule: MAPPING_RULE };
}

export function selectTrack(tracks: ReadonlyMap<string, readonly TrackedBox[]>): [string, readonly TrackedBox[]] {
  const selected = [...tracks].sort(([a, aa], [b, bb]) => bb.length - aa.length || (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0))[0];
  if (!selected) throw new Error("SAM found no matching object. Try a clearer clip or a more specific concept.");
  return selected;
}
