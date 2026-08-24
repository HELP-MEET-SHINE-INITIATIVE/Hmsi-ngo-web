'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock3, Loader2, ShieldCheck } from 'lucide-react';

const workflows = [
  { id: 'task_summary', label: 'Summarise my assigned tasks', help: 'See a plain-language view of your own assigned work.' },
  { id: 'daily_checklist', label: 'Make today’s checklist', help: 'Turn your assigned work into a practical checklist.' },
  { id: 'handover_note', label: 'Draft a supervisor handover', help: 'Prepare a note for your supervisor. It is not sent or saved.' },
] as const;
type Workflow = typeof workflows[number]['id'];

async function json(response: Response) { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Worker assistance is unavailable.'); return result; }

export default function WorkerAssistantPanel() {
  const [workflow, setWorkflow] = useState<Workflow>('task_summary');
  const [privateNote, setPrivateNote] = useState('');
  const [taskId, setTaskId] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const runWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setStatus(''); setResponse(''); setTaskId(''); setBusy(true);
    try {
      const result = await fetch('/api/worker/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflow, privateNote }) }).then(json);
      setTaskId(result.task?.manus_task_id || '');
      setResponse(result.response || '');
      setStatus('Your Gemini assistance response is ready.');
      setBusy(false);
    } catch (cause) { setBusy(false); setError(cause instanceof Error ? cause.message : 'Unable to start Gemini worker assistance.'); }
  };

  return <div className="min-h-screen bg-[#f6f4ef] px-5 py-8 text-[#17221e] sm:px-8"><div className="mx-auto max-w-4xl space-y-6"><div className="rounded-3xl border border-[#d9d6ce] bg-[#17221e] p-6 text-white"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e1ad45] p-3 text-[#17221e]"><ShieldCheck size={24} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1ad45]">HMSI worker assistance</p><h1 className="mt-1 text-2xl font-black">Simple help for your assigned work</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">This assistant can guide you through your own assigned tasks. It cannot open HMSI documents, member records, site files, settings, payments, messages, or newsroom content, and it cannot save or publish anything.</p></div></div></div>{(error || status) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || status}</div>}<form onSubmit={runWorkflow} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="mb-4 flex items-center gap-2"><ClipboardCheck size={18} className="text-[#1e5b49]" /><h2 className="text-lg font-black">Choose a workflow</h2></div><div className="grid gap-3 md:grid-cols-3">{workflows.map((option) => <label key={option.id} className={`cursor-pointer rounded-2xl border p-4 ${workflow === option.id ? 'border-[#1e5b49] bg-[#e9f0e9]' : 'border-[#d9d6ce] bg-[#f6f4ef]'}`}><input type="radio" name="workflow" value={option.id} checked={workflow === option.id} onChange={() => setWorkflow(option.id)} className="sr-only" /><span className="flex items-center gap-2 text-sm font-black">{workflow === option.id && <CheckCircle2 size={16} className="text-[#1e5b49]" />}{option.label}</span><span className="mt-2 block text-xs leading-5 text-[#66716a]">{option.help}</span></label>)}</div><label className="mt-5 block"><span className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Optional private note for this response</span><textarea value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} maxLength={1000} rows={4} placeholder="For example: I finished the first step and need help planning the next one." className="mt-2 w-full resize-none rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49]" /></label><button disabled={busy} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#1e5b49] px-6 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <Clock3 size={14} />}{busy ? 'Preparing assistance…' : 'Start assistance'}</button></form>{response && <section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Response</p><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#17221e]">{response}</div><p className="mt-5 border-t border-[#d9d6ce] pt-4 text-xs leading-5 text-[#66716a]">This response is guidance only. Ask your supervisor or an administrator to make any official HMSI change.</p></section>}</div></div>;
}
