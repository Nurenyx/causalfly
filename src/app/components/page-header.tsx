import type { ReactNode } from "react";

export type StatusChipState = "ACTIVE" | "READY" | "STANDBY" | "OFFLINE" | "ERROR" | "INFORMATIONAL";
export function StatusChip({ state, children }: { state: StatusChipState; children: ReactNode }) {
  return <span className="status-chip" data-status={state}><i aria-hidden="true" />{children}</span>;
}
export function PageHeader({ eyebrow, title, subtitle, status, action }: { eyebrow: string; title: string; subtitle?: string; status?: ReactNode; action?: ReactNode }) {
  return <header className="topbar page-header"><div className="page-header-copy"><span className="breadcrumb">{eyebrow}</span><h1>{title}</h1>{subtitle && <p className="workflow-identity">{subtitle}</p>}</div><div className="page-header-tools">{status && <div className="header-badges">{status}</div>}{action}</div></header>;
}
