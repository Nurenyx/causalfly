import type { InstrumentMode } from "@/lib/web/instrument-mode";
import type { DataSourceKind } from "@/lib/sources/contracts";
import { checkModeCapability } from "@/lib/web/instrument-mode";

interface InstrumentModeBarProps {
  currentMode: InstrumentMode;
  source: DataSourceKind;
  hasResult: boolean;
  disabled?: boolean;
  onSelectMode: (mode: InstrumentMode) => void;
  onSelectSource?: (source: DataSourceKind) => void;
}

export function InstrumentModeBar({
  currentMode,
  source,
  hasResult,
  disabled = false,
  onSelectMode,
  onSelectSource,
}: InstrumentModeBarProps) {
  const modes: { id: InstrumentMode; label: string; icon: string; description: string }[] = [
    { id: "observe", label: "Observe", icon: "◉", description: "Baseline organism and neural activity" },
    { id: "perturb", label: "Perturb", icon: "⚡", description: "Controlled intervention or stimulus" },
    { id: "compare", label: "Compare", icon: "⚭", description: "Matched control vs perturbed analysis" },
  ];

  return (
    <div className="instrument-mode-bar" role="toolbar" aria-label="Instrument Workflow Mode">
      <div className="instrument-mode-nav" role="radiogroup" aria-label="Workflow Stage">
        {modes.map((m) => {
          const active = currentMode === m.id;
          const capability = checkModeCapability(m.id, source, hasResult);
          const isUnsupported = !capability.supported;

          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`instrument-mode-tab ${m.id}-tab${active ? " active" : ""}${isUnsupported ? " unsupported-capability" : ""}`}
              onClick={() => onSelectMode(m.id)}
              title={isUnsupported ? capability.reason : m.description}
            >
              <span className="mode-icon" aria-hidden="true">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
              {isUnsupported && <span className="mode-pill">N/A</span>}
            </button>
          );
        })}
      </div>

      {/* When current mode is unsupported for the active source, provide clear scientific reason & one-click fallback */}
      {!checkModeCapability(currentMode, source, hasResult).supported && (
        <div className="mode-capability-banner" role="status">
          <span className="banner-icon" aria-hidden="true">ℹ</span>
          <span className="banner-text">
            {checkModeCapability(currentMode, source, hasResult).reason}
          </span>
          {onSelectSource && (
            <button
              type="button"
              className="banner-switch-btn"
              onClick={() => onSelectSource("SYNTHETIC_FIXTURE")}
            >
              Switch to Synthetic Fixture →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
