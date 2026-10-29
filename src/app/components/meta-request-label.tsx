/** Announce pending feedback; keep idle text available as the button name. */
export function MetaRequestLabel({ pending, task, children }: { pending: boolean; task: "design" | "explain"; children: React.ReactNode }) {
  return <span className="meta-request-label" role={pending ? "status" : undefined} aria-live="polite" aria-atomic="true">{pending ? <><span className="spinner" aria-hidden="true" />{task === "design" ? "META IS DESIGNING YOUR TEST..." : "META IS EXPLAINING YOUR EVIDENCE..."}</> : children}</span>;
}
