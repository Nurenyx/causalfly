import { connection } from "next/server";
import { Suspense } from "react";
import { getWebStatus } from "@/lib/web/workflow";
import Observatory from "./observatory";

async function RequestObservatory() {
  await connection();
  return <Observatory initialStatus={getWebStatus()} />;
}

export default function Home() {
  return <Suspense fallback={<main className="boot-screen"><p role="status">Opening CausalFly observatory…</p><small>Synthetic engineering fixture — not a biological model or Drosophila finding.</small></main>}><RequestObservatory /></Suspense>;
}
