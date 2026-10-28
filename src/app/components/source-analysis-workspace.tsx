import type { DataSourceKind, FruitFlySnapshot, FruitFlyEvidence } from "@/lib/sources/contracts";
import type { WebExperimentResult } from "@/lib/web/contracts";
import { CompareDashboard } from "./compare-dashboard";
import { ScientistView } from "./ai-scientist";
import { FruitFlyCompare, FruitFlyScientist } from "./fruitfly-analysis";

/** Route boundary keeps synthetic measurements out of every FruitFly analysis view. */
export function SourceAnalysisWorkspace({ source, workspace, result, snapshot, frames, now, fruitFlyQuestion, onNext, onFullAnalysis, onEvidence, onLive, onSynthetic, onStart }: {
  source: DataSourceKind; workspace: "compare" | "scientist"; result: WebExperimentResult | null;
  snapshot: FruitFlySnapshot; frames: readonly FruitFlyEvidence[]; now: number | null;
  fruitFlyQuestion?: string;
  onNext: (question: string) => void; onFullAnalysis: () => void; onEvidence: () => void;
  onLive: () => void; onSynthetic: () => void; onStart: () => void;
}) {
  if (source === "FRUITFLY_XR") return workspace === "compare" ? <FruitFlyCompare onLive={onLive} onEvidence={onEvidence} onSynthetic={onSynthetic} /> : <FruitFlyScientist snapshot={snapshot} frames={frames} now={now} question={fruitFlyQuestion} onLive={onLive} onEvidence={onEvidence} />;
  if (!result) return <section className="empty-state"><span className="eyebrow">{workspace === "compare" ? "COMPARE" : "AI SCIENTIST"}</span><h2>Begin with an experiment.</h2><p>Run a research question to explore measured comparisons, scientific analysis, and provenance.</p><button type="button" className="primary-button" onClick={onStart}>Go to Observatory ↗</button></section>;
  return workspace === "compare" ? <CompareDashboard result={result} onNext={onNext} onFullAnalysis={onFullAnalysis} onEvidence={onEvidence} /> : <ScientistView result={result} onNext={onNext} />;
}
