import "server-only";
import { readLiveConfiguration, type MetaEnvironment } from "../meta/client";
import { sceneConfiguration } from "../meta/scene-client";
import { samConfiguration } from "../meta/sam-client";
import { configuredEndpoint } from "../sources/fruitfly-bridge";

function available(check: () => unknown) {
  try { check(); return true; } catch { return false; }
}

/** Configuration checks only: no network, environment values, or retained data. */
export function healthStatus(env: MetaEnvironment, mode: string | undefined, fake: boolean, endpoint?: string) {
  return {
    status: "ok",
    runtimeMode: mode === "production" ? "production" : mode === "test" ? "test" : "development",
    metaMode: fake ? "offline" : env.CAUSALFLY_META_ENABLED === "1" ? "live" : "disabled",
    metaEnabled: env.CAUSALFLY_META_ENABLED === "1" && !fake,
    configuration: {
      metaConfigured: available(() => readLiveConfiguration(env)),
      sceneModelConfigured: available(() => sceneConfiguration(env)),
      samConfigured: available(() => samConfiguration(env)),
      fruitFlyXR: available(() => configuredEndpoint(endpoint, mode === "production")),
    },
    providersChecked: false,
  };
}
