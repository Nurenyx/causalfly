import "server-only";
import { mediaCapabilities } from "../perception/media-configuration";
import { sceneConfiguration } from "../meta/scene-client";
import { samConfiguration } from "../meta/sam-client";
import { configuredEndpoint } from "../sources/fruitfly-bridge";
import { configuredBrainEndpoint } from "../sources/fruitfly-closed-loop";
const available = (check: () => unknown) => { try { check(); return true; } catch { return false; } };
/** Operator-only module/CLI. No public route and no network calls. */
export function hostCapabilities(env: Readonly<Record<string, string | undefined>> = process.env) {
  const meta = { META_API_KEY:env.META_API_KEY, META_BASE_URL:env.META_BASE_URL, META_MODEL:env.META_MODEL, META_SCENE_MODEL:env.META_SCENE_MODEL, META_TIMEOUT_MS:env.META_TIMEOUT_MS };
  const production = env.NODE_ENV !== "development";
  return {
    ...mediaCapabilities(env),
    metaConfigured: available(() => sceneConfiguration(meta)) && available(() => samConfiguration(meta)),
    metaEnabled: env.CAUSALFLY_META_ENABLED === "1",
    brainEndpointConfigured: available(() => configuredEndpoint(env.FRUITFLY_XR_OBSERVATORY_URL, production)),
    brainControlConfigured: Boolean(configuredBrainEndpoint(env.NEXT_PUBLIC_FRUITFLY_XR_BRAIN_URL, production)),
    providersChecked: false,
  };
}
