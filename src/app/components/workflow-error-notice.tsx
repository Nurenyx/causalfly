"use client";

import { useEffect, useRef } from "react";
import type { RunDiagnostics } from "@/lib/web/flight-recorder-types";

export interface WorkflowFailure { id: number; summary: string; detail: string; target: string; run_id?: string; diagnostics?: RunDiagnostics }

/** A reserved viewport rail, independent of the user's current scroll position. */
export function WorkflowErrorNotice({ failure, onDismiss, onLocate }: { failure: WorkflowFailure; onDismiss: () => void; onLocate: () => void }) {
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => document.documentElement.style.setProperty("--workflow-error-offset", `${element.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--workflow-error-offset"); };
  }, []);
  return <aside ref={rail} className="workflow-error-notice" role="alert" aria-live="assertive" aria-atomic="true" aria-label="Action failed">
    <strong>{failure.summary}</strong>
    <button type="button" onClick={onLocate}>Show action & recovery</button>
    <button type="button" aria-label="Dismiss error notification" onClick={onDismiss}>Dismiss ×</button>
  </aside>;
}
