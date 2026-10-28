import type { ReactNode } from "react";

export function MeasuredDeltaCard({ label, technicalLabel, delta, control, perturbed, note, tone = "red" }: {
  label: string; technicalLabel?: string; delta: ReactNode; control: ReactNode; perturbed: ReactNode; note: string; tone?: string;
}) {
  return <article className={`measured-delta ${tone}`}><h3 title={technicalLabel}>{label}</h3><div className="delta-comparison"><div><span>CONTROL</span><b>{control}</b></div><span className="delta-arrow" aria-hidden="true">→</span><div><span>INTERVENTION</span><b>{perturbed}</b></div><strong>{delta}</strong></div><small>{note}</small></article>;
}
