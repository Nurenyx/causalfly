/** Server policy: no NEXT_PUBLIC setting and no environment object crosses the boundary. */
export function developerDiagnosticsEnabled(env: { NODE_ENV?: string; CAUSALFLY_DEVELOPER_DIAGNOSTICS?: string } = process.env): boolean {
  return env.CAUSALFLY_DEVELOPER_DIAGNOSTICS === "1" || env.CAUSALFLY_DEVELOPER_DIAGNOSTICS === undefined && env.NODE_ENV === "development";
}
