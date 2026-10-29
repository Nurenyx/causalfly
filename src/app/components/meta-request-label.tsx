/** Keep request feedback inside the control that starts the request. */
export function MetaRequestLabel({ pending, task, children }: { pending: boolean; task: "design" | "explain"; children: React.ReactNode }) {
  return <span className="meta-request-label" role="status" aria-live="polite" aria-atomic="true">{pending ? <><span className="spinner" aria-hidden="true" />{task === "design" ? "META IS DESIGNING YOUR TEST..." : "META IS EXPLAINING YOUR EVIDENCE..."}</> : children}</span>;
}
