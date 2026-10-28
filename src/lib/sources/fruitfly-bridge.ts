import "server-only";
import { openRetention, retainSnapshot } from "./retained-evidence";
import { FruitFlyNormalizer } from "./fruitfly-protocol";
import { disconnectedFruitFly, type FruitFlySnapshot } from "./contracts";

type Socket = Pick<WebSocket, "addEventListener" | "close">;
export interface BridgeDependencies {
  endpoint?: string;
  createSocket?: (endpoint: string) => Socket;
  now?: () => Date;
  handshakeTimeoutMs?: number;
  staleAfterMs?: number;
}

/** No default URL: configured only on the server, never supplied by a browser. */
function configuredEndpoint(value: string | undefined) {
  if (!value) throw new Error("Missing endpoint");
  const url = new URL(value);
  if (!["ws:", "wss:"].includes(url.protocol) || url.pathname !== "/observatory/v1" || url.username || url.password || url.search || url.hash) throw new Error("Invalid endpoint");
  return url.toString();
}

/** One read-only research subscription per stream; no send interface exists here. */
export function connectFruitFly(publish: (snapshot: FruitFlySnapshot) => void, dependencies: BridgeDependencies = {}) {
  let snapshot = disconnectedFruitFly();
  let socket: Socket | undefined;
  let finished = false;
  let opened = false;
  let handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  let staleTimer: ReturnType<typeof setTimeout> | undefined;
  const normalizer = new FruitFlyNormalizer();
  const emit = (state: FruitFlySnapshot["state"], message: string) => {
    snapshot = { ...snapshot, state, message };
    publish(snapshot);
  };
  const stop = (state: "ERROR" | "DISCONNECTED", message: string) => {
    if (finished) return;
    finished = true;
    clearTimeout(handshakeTimer);
    clearTimeout(staleTimer);
    emit(state, message);
    socket?.close();
  };
  emit("CONNECTING", "Opening the read-only research connection.");
  try {
    const endpoint = configuredEndpoint(dependencies.endpoint ?? process.env.FRUITFLY_XR_OBSERVATORY_URL);
    socket = (dependencies.createSocket ?? ((url) => new WebSocket(url)))(endpoint);
    handshakeTimer = setTimeout(() => stop("ERROR", "FruitFly XR did not complete its telemetry handshake. Check the server."), dependencies.handshakeTimeoutMs ?? 5000);
    socket.addEventListener("open", () => {
      if (finished) return;
      opened = true;
      emit("CONNECTED", "Connection open; waiting for verified telemetry.");
    });
    socket.addEventListener("message", (event) => {
      if (finished) return;
      try {
        if (!opened || typeof event.data !== "string" || event.data.length > 1_000_000) throw new Error("Invalid message");
        const message: unknown = JSON.parse(event.data);
        const evidence = normalizer.accept(message, (dependencies.now?.() ?? new Date()).toISOString());
        // A valid hello is the only accepted message that clears the handshake deadline.
        if ((message as { type: string }).type === "observatoryHello") {
          clearTimeout(handshakeTimer);
          emit("CONNECTED", "Source verified; waiting for a FruitFly XR trial. No simulation frames received yet.");
        }
        if (evidence) {
          snapshot = { ...snapshot, evidence };
          emit("DATA RECEIVED", "Read-only simulation telemetry received. Inspect Evidence for details.");
          clearTimeout(staleTimer);
          staleTimer = setTimeout(() => {
            if (!finished) emit("CONNECTED", "Connection remains open; no recent frames. Evidence shows the last received snapshot.");
          }, dependencies.staleAfterMs ?? 5000);
        }
      } catch {
        stop("ERROR", "FruitFly XR telemetry was rejected. Check protocol version, source identity and required fields.");
      }
    });
    socket.addEventListener("error", () => stop("ERROR", "Unable to receive FruitFly XR telemetry. Check the server connection configuration."));
    socket.addEventListener("close", () => stop("DISCONNECTED", "FruitFly XR connection closed. Any evidence shown is the last received snapshot."));
  } catch {
    stop("ERROR", "FruitFly XR is unavailable. Configure the server-side research endpoint and check that its server is running.");
  }
  return () => stop("DISCONNECTED", "FruitFly XR disconnected. Any evidence shown is the last received snapshot.");
}

export function fruitFlyStream(signal: AbortSignal, dependencies: BridgeDependencies = {}) {
  const retentionId = openRetention();
  const encoder = new TextEncoder();
  let cleanup: (cancelled?: boolean) => void = () => {};
  let pending: Uint8Array | null = null;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (signal.aborted) { controller.close(); return; }
      let ended = false;
      const send = (snapshot: FruitFlySnapshot) => {
        retainSnapshot(retentionId, snapshot);
        if (ended) return;
        const data = encoder.encode(`data: ${JSON.stringify({ ...snapshot, retentionId })}\n\n`);
        // Latest-only HTTP lane: a slow browser must not build an unbounded backlog.
        if ((controller.desiredSize ?? 0) > 0) {
          pending = null;
          controller.enqueue(data);
        }
        else pending = data;
      };
      const disconnect = connectFruitFly(send, dependencies);
      // Keep the HTTP subscription alive while the instrument is idle.
      const heartbeat = setInterval(() => {
        if (!ended && !pending && (controller.desiredSize ?? 0) > 0) controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);
      cleanup = (cancelled = false) => {
        if (ended) return;
        ended = true;
        clearInterval(heartbeat);
        signal.removeEventListener("abort", onAbort);
        disconnect();
        pending = null;
        if (!cancelled) controller.close();
      };
      const onAbort = () => cleanup();
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) cleanup();
    },
    pull(controller) {
      if (pending) {
        controller.enqueue(pending);
        pending = null;
      }
    },
    cancel() { cleanup(true); },
  });
}
