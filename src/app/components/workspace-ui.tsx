import type { ReactNode } from "react";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}

export function SectionTitle({ index, title, id, children }: { index: string; title: string; id?: string; children?: ReactNode }) {
  return <div className="section-title"><div><span className="section-index">{index}</span><h2 id={id}>{title}</h2></div>{children}</div>;
}

/** Ordered source stages only; callers supply the chain supported by their source. */
export function EvidenceFlow({ stages }: { stages: { label: string; detail: string }[] }) {
  return <ol className="evidence-flow" aria-label="Evidence chain of custody">{stages.map((stage, index) => <li key={stage.label}><span className="section-index">{String(index + 1).padStart(2, "0")}</span><strong>{stage.label}</strong><small>{stage.detail}</small></li>)}</ol>;
}
