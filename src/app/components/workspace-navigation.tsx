import type { Workspace } from "@/lib/web/dashboard";

export const primaryWorkspaces = [
  { id: "observatory", label: "Experiment", icon: "◉" },
  { id: "live", label: "Live Connectome", icon: "◌" },
  { id: "evidence", label: "Evidence", icon: "▤" },
] as const;

export function WorkspaceNavigation({
  active,
  disabled,
  onNavigate,
  onOpenOverview,
}: {
  active?: Workspace;
  disabled: boolean;
  onNavigate: (workspace: Workspace) => void;
  onOpenOverview?: () => void;
}) {
  return (
    <nav className="primary-navigation" aria-label="Experiment workspaces">
      {primaryWorkspaces.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-label={view.label}
          disabled={disabled}
          aria-current={active === view.id ? "page" : undefined}
          className={active === view.id ? "active" : ""}
          onClick={() => onNavigate(view.id)}
        >
          <span aria-hidden="true">{view.icon}</span>
          <span>{view.label}</span>
        </button>
      ))}
      {onOpenOverview && (
        <button
          type="button"
          aria-label="Overview & Orientation"
          disabled={disabled}
          className="overview-nav-btn"
          onClick={onOpenOverview}
        >
          <span aria-hidden="true">ℹ</span>
          <span>Overview</span>
        </button>
      )}
    </nav>
  );
}
