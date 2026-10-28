import { useId } from "react";

export function ExperimentPlayback({ steps, index, playing, onSeek, onToggle }: {
  steps: number[]; index: number; playing: boolean; onSeek: (index: number) => void; onToggle: () => void;
}) {
  const id = useId();
  const skipped = steps.some((step, i) => i > 0 && step !== steps[i - 1] + 1);
  return <section className="experiment-playback" aria-label="Synchronized experiment playback">
    <button type="button" className="playback-button" onClick={onToggle} disabled={steps.length < 2} aria-label={playing ? "Pause playback" : "Play recorded activity"}><span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>{playing ? "Pause" : "Play"}</button>
    <div className="playback-track"><label htmlFor={id}>EVIDENCE PLAYBACK <span>Control + intervention · synchronized{skipped ? " · omitted steps skipped" : ""}</span></label><input id={id} type="range" min="0" max={Math.max(0, steps.length - 1)} value={index} onChange={(event) => onSeek(Number(event.target.value))} aria-label="Simulation step" aria-valuetext={`Simulation step ${steps[index]}`} title="Computational step in the deterministic engine" /></div>
    <output className="playback-step" title="Computational step"><span>SIMULATION STEP</span><strong>{String(steps[index]).padStart(2, "0")}</strong><span>/ {steps.at(-1)}</span></output>
  </section>;
}
