import { fruitFlyStream } from "@/lib/sources/fruitfly-bridge";

export function GET(request: Request) {
  return new Response(fruitFlyStream(request.signal), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
