"use client";

import { useRef, useState } from "react";

export function ResearchQuestion({ question, busy, underTest, onUse, onEditing }: { question: string; busy: boolean; underTest: boolean; onUse: (question: string) => void; onEditing?: (editing: boolean) => void }) {
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(question);
  const input = useRef<HTMLTextAreaElement>(null);
  function submit() {
    if (busy || !draft.trim()) return;
    onUse(draft.trim()); setEditing(false); onEditing?.(false);
  }
  return <div className="research-question" data-editing={editing}>
    {editing ? <form id="cockpit-question-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label className="cockpit-kicker" htmlFor="research-question">EDIT YOUR RESEARCH QUESTION</label>
      <textarea ref={input} id="research-question" aria-label="Your research question" disabled={busy} required maxLength={8000} rows={2} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.ctrlKey && event.key === "Enter") { event.preventDefault(); submit(); } }} />
      <div className="question-edit-actions"><button type="submit" className="primary-button" disabled={busy || !draft.trim()}>USE THIS QUESTION</button><button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(false); onEditing?.(false); }}>Cancel edit</button><small>Ctrl+Enter · saves locally; Meta design is a separate action</small></div>
    </form> : <><span className="cockpit-kicker">{underTest ? "QUESTION UNDER TEST" : "RETAINED RESEARCH QUESTION"}</span><p className="retained-question">{question}</p><button type="button" className="text-button" disabled={busy} onClick={() => { setDraft(question); setEditing(true); onEditing?.(true); requestAnimationFrame(() => input.current?.focus()); }}>{underTest ? "Ask another question ↗" : "Ask Your Own Question ↗"}</button></>}
  </div>;
}
