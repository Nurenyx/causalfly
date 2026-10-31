import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "causalfly_first_run_dismissed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return true;
}

export function FirstRunBanner({ onDismiss }: { onDismiss?: () => void }) {
  const isStoredDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = useState(false);

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore sessionStorage errors
    }
    setLocalDismissed(true);
    onDismiss?.();
  }

  if (isStoredDismissed || localDismissed) return null;

  return (
    <aside className="first-run-banner" aria-label="First-run instrument introduction">
      <div className="first-run-content">
        <span className="first-run-badge">CausalFly Scientific Instrument</span>
        <p className="first-run-text">
          <strong>Observe</strong> baseline organism and neural state →{" "}
          <strong>Perturb</strong> a supported system →{" "}
          <strong>Compare</strong> retained evidence.
        </p>
      </div>
      <button
        type="button"
        className="first-run-dismiss-btn"
        aria-label="Dismiss first-run introduction"
        onClick={handleDismiss}
      >
        ✕
      </button>
    </aside>
  );
}
