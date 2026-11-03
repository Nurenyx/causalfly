"use client";

import { useRef, useState } from "react";

export function ResearchQuestion({ question, busy, underTest, completed = false, onUse, onEditing }: { question: string; busy: boolean; underTest: boolean; completed?: boolean; onUse: (question: string) => void; onEditing?: (editing: boolean) => void }) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(question);
  const [fresh, setFresh] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  function open(clean: boolean) {setDraft(clean ? "" : question);setFresh(clean);setEditing(true);onEditing?.(true);requestAnimationFrame(()=>input.current?.focus());}
  function submit() {
    if (busy || !draft.trim()) return;
    onUse(draft.trim()); setEditing(false); onEditing?.(false);
  }
  return <div className="research-question" data-editing={editing}>
    {editing ? <form id="cockpit-question-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label className="cockpit-kicker" htmlFor="research-question">{fresh ? "NEW RESEARCH QUESTION" : "EDIT YOUR RESEARCH QUESTION"}</label>
      <textarea ref={input} id="research-question" aria-label="Your research question" disabled={busy} required maxLength={8000} rows={2} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); submit(); } }} />
      {(underTest || completed) && <p className="question-edit-warning">{underTest && !completed ? "Saving a changed question invalidates the unapproved design. " : ""}Completed evidence is kept in Evidence / history. Nothing changes until you save.</p>}
      <div className="question-edit-actions"><button type="submit" className="primary-button" disabled={busy || !draft.trim()}>USE THIS QUESTION</button><button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(false); onEditing?.(false); }}>Cancel edit</button><small>Ctrl+Enter · saves locally; Meta design is a separate action</small></div>
    </form> : <><div className="retained-question-heading"><span className="cockpit-kicker">{underTest ? "QUESTION UNDER TEST" : "RETAINED RESEARCH QUESTION"}</span><div className="persistent-question-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>open(false)}>EDIT QUESTION</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>open(true)}>NEW QUESTION</button></div></div><p className="retained-question">{question || "Choose a question to begin."}</p></>}
  </div>;
}
