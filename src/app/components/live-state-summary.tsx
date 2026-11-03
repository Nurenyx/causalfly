import type { FruitFlyEvidence, FruitFlySnapshot } from "@/lib/sources/contracts";
import { liveStatePresentation, escapeCompatibility } from "@/lib/web/live-state-presentation";

export function LiveStateSummary({ snapshot, now }: { snapshot: FruitFlySnapshot; now: number }) {
  const state = liveStatePresentation(snapshot, now);
  return <dl className="live-state-summary" aria-label="Server stream and evidence status">
    {Object.entries(state).map(([label,value]) => <div key={label} data-state={value}><dt>{label.toUpperCase()}</dt><dd>{value}</dd></div>)}
  </dl>;
}

export function QuestionCompatibility({ question, snapshot, frames, onEvidence, onReplay }: { question?: string; snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; onEvidence: () => void; onReplay?: () => void }) {
  const match = question ? escapeCompatibility(question, snapshot, frames) : null;
  if (!match) return null;
  return <section className="question-compatibility" aria-label="Question and evidence compatibility" data-blocked={match.blocked}>
    <strong>{match.message}</strong><p>{match.detail}</p>
    <button type="button" className={match.blocked ? "primary-button" : "text-button"} onClick={onEvidence}>{match.blocked ? "INSPECT OBSERVED DECODER STATES" : "Inspect observed decoder states ↗"}</button>
    {onReplay && <button type="button" className="text-button" onClick={onReplay}>Replay available evidence ↗</button>}
  </section>;
}
