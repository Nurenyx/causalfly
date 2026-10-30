import { mediaAuthorization } from "@/lib/web/media-action";
export async function POST(request: Request) { return mediaAuthorization(request); }
