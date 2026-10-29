import { perceptionAction } from "@/lib/web/perception-action";

export const maxDuration = 240;
export async function POST(request: Request) { return perceptionAction(request); }
