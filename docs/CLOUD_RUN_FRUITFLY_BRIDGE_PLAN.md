# Sprint 11B: FruitFly XR Cloud Run bridge plan

**DOCUMENT ONLY.** This architecture change belongs to Sprint 11B. No FruitFly XR code, service, dataset, protocol or deployment is changed by Sprint 11A. The current two-port backend must not be deployed unchanged.

The backend must bind `0.0.0.0` and listen on Cloud Run's injected `PORT`. One HTTP/WebSocket ingress server must route `/brain/v1` and `/observatory/v1`, with `/healthz` for lightweight liveness/readiness. Preserve existing telemetry schemas, sequence/session semantics, source identity, bounded frame payloads and observational meaning. Keep brain control authorization separate; CausalFly remains an observatory-only client and sends no interventions to brain control.

Use Toronto `northamerica-northeast2`, initially minimum instances **0** for cost control and maximum instances **1** because simulation state is process-local. A single maximum instance does not make state durable: restarts and revision replacement still lose sessions. Set request timeout up to **3600 seconds**. WebSockets time out and disconnect; implement bounded exponential reconnect/backoff, fresh handshake, session/sequence validation, and explicit stale/retained labels. Do not silently splice evidence across sessions or replay interventions. CausalFly currently has a manual connection/recovery flow; reconnection changes require explicit Sprint 11B implementation and tests.

Expose secure `wss://` using the generated `run.app` URL first. A custom domain is optional later. Do not assume port 8766 is public. Configure CausalFly's server-only `FRUITFLY_XR_OBSERVATORY_URL` to the generated service's `/observatory/v1` URL after verification. No future hostname is hardcoded. Test cold start, timeout, interrupted streams, revision rollover, authentication, browser-to-CausalFly streaming and platform proxy limits before integration.

Package the licensed connectome dataset into the backend image or securely retrieve a pinned, verified copy at startup. Retain attribution, dataset identity and transformation records; never copy proprietary code/data into CausalFly. Plan dataset size, startup latency, memory/CPU, secrets, ingress authorization and spending limits before deployment. Keep credentials out of URLs/logs. Validate simulation resource needs before choosing CPU allocation/concurrency.

Telemetry remains **connectome-backed simulated neural dynamics**, never living-fly recordings or causal biological findings. The controlled synthetic CausalFly engine remains a separate evidence path.

Acceptance: one ingress with both WebSocket paths and `/healthz`; protocol compatibility; cold start and reconnect tests; one-instance process-local limits documented; secure observatory-only connection from CausalFly; retained provenance separated from Meta interpretation; no claim of durable or living-fly data.

References: [Cloud Run WebSockets and reconnect/timeouts](https://docs.cloud.google.com/run/docs/triggering/websockets), [best-effort session affinity](https://docs.cloud.google.com/run/docs/configuring/session-affinity). A connection's affinity cannot guarantee that a later connection reaches the same process.
