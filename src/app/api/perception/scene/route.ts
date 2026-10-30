import { sceneAction } from "@/lib/web/scene-action";

export const maxDuration = 240;
export async function POST(request: Request) { return sceneAction(request); }
