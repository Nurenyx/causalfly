import "server-only";

/** Presence/runtime capability only. Never returns values or tests provider access. */
export function mediaCapabilities(env: Readonly<Record<string, string | undefined>> = process.env) {
  const readWriteTokenPresent = Boolean(env.BLOB_READ_WRITE_TOKEN);
  const blobStoreIdPresent = Boolean(env.BLOB_STORE_ID);
  const oidcTokenPresent = Boolean(env.VERCEL_OIDC_TOKEN);
  const vercelRuntime = env.VERCEL === "1";
  return {
    privateStorageConfigured: readWriteTokenPresent || blobStoreIdPresent && (oidcTokenPresent || vercelRuntime),
    mediaSigningConfigured: Boolean(env.CAUSALFLY_MEDIA_SIGNING_SECRET && env.CAUSALFLY_MEDIA_SIGNING_SECRET.length >= 32),
    readWriteTokenPresent, blobStoreIdPresent, oidcTokenPresent, vercelRuntime,
    oidcAuthenticationSupported: true,
    oidcRequestContextRequired: blobStoreIdPresent && vercelRuntime && !oidcTokenPresent,
    credentialsVerified: false,
  };
}
