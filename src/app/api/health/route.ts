import { connection } from "next/server";
import { readMetaEnvironment } from "@/lib/meta/client";
import { healthStatus } from "@/lib/web/health";
import packageInfo from "../../../../package.json";

export async function GET() {
  await connection();
  return Response.json({
    ...healthStatus(readMetaEnvironment(), process.env.NODE_ENV, process.env.CAUSALFLY_FAKE_META === "1", process.env.FRUITFLY_XR_OBSERVATORY_URL),
    version: packageInfo.version,
  }, { headers: { "Cache-Control": "no-store" } });
}
