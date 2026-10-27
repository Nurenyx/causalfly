import { loadEnvConfig } from "@next/env";

export function loadProjectEnvironment(): void {
  loadEnvConfig(process.cwd());
}
