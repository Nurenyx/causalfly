import { mediaCleanup } from "@/lib/web/media-action";
export async function POST(request: Request) { return mediaCleanup(request); }
