import type { ReactNode } from "react";

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}><span className="status-dot" />{children}</span>;
}

export function SectionTitle({ index, title, id, children }: { index: string; title: string; id?: string; children?: ReactNode }) {
  return <div className="section-title"><div><span className="section-index">{index}</span><h2 id={id}>{title}</h2></div>{children}</div>;
}
