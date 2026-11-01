/**
 * Accessible viewport navigation for workflow transitions.
 * Respects prefers-reduced-motion.
 * Moves focus to the active section or primary CTA without double-scrolling.
 */
export function guideViewportTo(elementId: string, focusSelector?: string): void {
  if (typeof window === "undefined") return;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  requestAnimationFrame(() => {
    const section = document.getElementById(elementId);
    if (!section) return;
    section.scrollIntoView({ block: "start", behavior: prefersReduced ? "instant" : "smooth" });
    const target = focusSelector ? section.querySelector<HTMLElement>(focusSelector) : section;
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });
}
