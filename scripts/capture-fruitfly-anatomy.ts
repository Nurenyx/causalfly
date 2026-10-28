import { mkdir, writeFile } from "node:fs/promises";
import { connectomeHash } from "../src/lib/sources/fruitfly-protocol";
import { parseAnatomy } from "../src/lib/sources/anatomy";

// Explicit, read-only asset capture. Never run by tests, build, or the application.
const endpoint = process.argv[2];
if (!endpoint) throw new Error("Usage: npx tsx scripts/capture-fruitfly-anatomy.ts ws://127.0.0.1:8766/observatory/v1");
const socket = new WebSocket(endpoint);
const chunks = new Map<number, number[][]>();
let count = 0, chunkCount = 0;
const deadline = setTimeout(() => { socket.close(); throw new Error("Static anatomy capture timed out"); }, 10000);
socket.onmessage = async (event) => {
  try {
    const value = JSON.parse(String(event.data));
    if (value.type === "observatoryHello") {
      if (value.version !== 1 || value.dataset !== "male-cns:v1.0" || value.connectomeSha256 !== connectomeHash || value.somaCoordinates !== true || value.coordinateSemantics !== "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED") throw new Error("Unverified anatomy identity");
      count = value.somaCoordinateCount; chunkCount = value.scaffoldChunkCount;
    }
    if (value.type !== "observatoryScaffoldChunk") return;
    if (!count || value.chunkCount !== chunkCount || value.somaCoordinateCount !== count || value.coordinateSemantics !== "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED" || !Number.isInteger(value.chunkIndex) || value.chunkIndex < 0 || value.chunkIndex >= chunkCount || chunks.has(value.chunkIndex)) throw new Error("Inconsistent anatomy chunks");
    chunks.set(value.chunkIndex, value.somaPoints.map((p: { neuronId: number; somaX: number; somaY: number; somaZ: number }) => [p.neuronId, p.somaX, p.somaY, p.somaZ]));
    if (chunks.size !== chunkCount) return;
    clearTimeout(deadline); socket.close();
    const points = [...chunks.entries()].sort(([a], [b]) => a - b).flatMap(([, points]) => points);
    const anatomy = parseAnatomy({ dataset: "male-cns:v1.0", connectomeSha256: connectomeHash, coordinateSemantics: "RAW_NEUPRINT_VOXEL_XYZ_ORIENTATION_UNSPECIFIED", capturedAt: new Date().toISOString(), count, points });
    await mkdir("public/anatomy", { recursive: true });
    await writeFile("public/anatomy/male-cns-v1.json", JSON.stringify(anatomy) + "\n");
    console.log(`Captured ${anatomy.count} verified coordinate records. No simulation or control messages sent.`);
  } catch (error) { clearTimeout(deadline); socket.close(); console.error(error); process.exitCode = 1; }
};
socket.onerror = () => { clearTimeout(deadline); console.error("Anatomy connection failed"); process.exitCode = 1; };
