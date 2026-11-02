import type { FruitFlySnapshot } from "./contracts";
import { sessionStatus } from "./live-session";

export type TesterLiveState = "OFFLINE" | "CONNECTING" | "READY" | "RUNNING" | "RECORDED_REPLAY" | "ERROR";
export function testerLiveState(snapshot: FruitFlySnapshot, now: number): TesterLiveState {
  if (snapshot.presentation === "RECORDED_REPLAY") return "RECORDED_REPLAY";
  if (snapshot.state === "ERROR") return "ERROR";
  if (snapshot.state === "CONNECTING") return "CONNECTING";
  if (sessionStatus(snapshot, now).live) return "RUNNING";
  if (snapshot.state === "CONNECTED" || snapshot.state === "DATA RECEIVED") return "READY";
  return "OFFLINE";
}
