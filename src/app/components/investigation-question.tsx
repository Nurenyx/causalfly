import { useState } from "react";

/** One local question action; the exact submitted text is kept with the session. */
export function InvestigationQuestion({ question, setQuestion, hasEvidence, onChange, onSet }: {
  question: string; setQuestion?: string; hasEvidence: boolean;
  onChange: (question: string) => void; onSet: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const set = setQuestion !== undefined && question === setQuestion;
  const editorOpen = !set || editing;
  return <section className="panel session-question" id="investigation-question" aria-label="Set investigation question" data-set={set && !editing}>
    <form onSubmit={event => { event.preventDefault(); if (question.trim() && !set) { onSet(); setEditing(false); } }}>
      {editorOpen && <label htmlFor="fruitfly-question">What do you want to understand from this simulation?</label>}
      {!editorOpen && <div className="retained-investigation"><span className="cockpit-kicker">RETAINED RESEARCH QUESTION</span><p>{setQuestion}</p></div>}
      <div className="investigation-action">{editorOpen && <textarea id="fruitfly-question" value={question} onChange={event => onChange(event.target.value)} maxLength={8000} required rows={1} placeholder="What changed before the decoder entered ESCAPE?" aria-describedby="investigation-feedback" />}
        <button className="primary-button" type="submit" disabled={!question.trim() || set}>{set ? "Question Set ✓" : "Set Investigation Question"}</button>
        {setQuestion !== undefined && <button className="text-button" type="button" onClick={() => { if (editing) onChange(setQuestion); setEditing(!editing); }}>{editing ? "Cancel editing" : "Change question"}</button>}
      </div>
      <small id="investigation-feedback" role="status" aria-live="polite">{set ? hasEvidence ? "Question set. Next: observe the received activity, then review what happened." : "Question set. Next: wait for relevant simulation data, then review what happened." : setQuestion !== undefined ? "Draft changed. Set the question to update your investigation." : "Set a question to guide observation. Local action · no Meta request."}</small>
    </form>
  </section>;
}
