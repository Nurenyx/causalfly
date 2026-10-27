import type { ReactNode } from "react";

export function MeasuredDeltaCard({ label, delta, control, perturbed, note, tone = "red" }: {
  label: string; delta: ReactNode; control: ReactNode; perturbed: ReactNode; note: string; tone?: string;
}) {
  return <article className={`measured-delta ${tone}`}><h3>{label}</h3><div className="delta-comparison"><div><span>CONTROL</span><b>{control}</b></div><span className="delta-arrow" aria-hidden="true">→</span><div><span>PERTURBED</span><b>{perturbed}</b></div><strong>{delta}</strong></div><small>{note}</small></article>;
}
