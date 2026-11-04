import { useId } from "react";
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
  const descriptionId = useId();
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
          const isUnavailable = !capability.supported || capability.available === false;
          const isActionDisabled = disabled || isUnavailable;

          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={isActionDisabled}
              aria-disabled={isUnavailable ? "true" : undefined}
              className={`instrument-mode-tab ${m.id}-tab${active ? " active" : ""}${isUnsupported ? " unsupported-capability" : ""}${isUnavailable ? " mode-unavailable" : ""}`}
              aria-describedby={isUnavailable ? `${descriptionId}-${m.id}` : undefined}
              onClick={() => {
                if (!isActionDisabled) onSelectMode(m.id);
              }}
              title={isUnavailable ? capability.reason : m.description}
            >
              <span className="mode-icon" aria-hidden="true">{m.icon}</span>
              <span className="mode-label">{m.label}</span>
              {isUnsupported ? (
                <span className="mode-pill">N/A</span>
              ) : isUnavailable ? (
                <span className="mode-pill">Unavailable</span>
              ) : null}
              {isUnavailable && <span id={`${descriptionId}-${m.id}`} className="sr-only">{capability.reason}</span>}
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
