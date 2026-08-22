'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, FilePlus2, Loader2, MessageSquareText, Save, ShieldCheck } from 'lucide-react';

type Document = { id: string; title: string; category: string; visibility: 'admin' | 'worker' | 'shared'; status: 'active' | 'archived'; updated_at: string };
type Version = { id: string; version: number; content: string; change_summary: string | null; created_by_email: string; created_at: string };
type AuditLog = { id: string; action: string; actor_email: string; document_id: string | null; created_at: string };

async function readJson(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The HMSI Assistant request failed.');
  return result;
}

export default function HmsiAssistantPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [taskId, setTaskId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newDoc, setNewDoc] = useState({ title: '', category: 'governance', content: '' });

  const selectedDocument = useMemo(() => documents.find((document) => document.id === selectedId) || null, [documents, selectedId]);

  const loadLibrary = useCallback(async () => {
    const [library, audit] = await Promise.all([
      fetch('/api/admin/assistant/documents', { cache: 'no-store' }).then(readJson),
      fetch('/api/admin/assistant/audit', { cache: 'no-store' }).then(readJson),
    ]);
    setDocuments(library.documents || []);
    setAuditLogs(audit.logs || []);
    if (library.documents?.[0]) setSelectedId((current) => current || library.documents[0].id);
  }, []);

  const loadDocument = async (id: string) => {
    if (!id) return;
    const result = await fetch(`/api/admin/assistant/documents/${id}`, { cache: 'no-store' }).then(readJson);
    const latest = result.versions?.[0] || null;
    setSelectedVersion(latest);
    setDraftContent(latest?.content || '');
  };

  useEffect(() => { loadLibrary().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load the HMSI Assistant.')); }, [loadLibrary]);
  useEffect(() => { if (selectedId) loadDocument(selectedId).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load this HMSI document.')); }, [selectedId]);

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    const poll = async () => {
      try {
        const result = await fetch(`/api/admin/assistant/tasks/${taskId}`, { cache: 'no-store' }).then(readJson);
        if (!active) return;
        if (result.response) setResponse(result.response);
        if (['stopped', 'error', 'waiting'].includes(result.task?.status)) {
          setBusy(false);
          if (result.task.status === 'error') setError('Manus reported an error for this request.');
          return;
        }
        window.setTimeout(poll, 2500);
      } catch (pollError) {
        if (active) { setBusy(false); setError(pollError instanceof Error ? pollError.message : 'Unable to read the Manus response.'); }
      }
    };
    poll();
    return () => { active = false; };
  }, [taskId]);

  const askManus = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice(''); setResponse(''); setTaskId('');
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const result = await fetch('/api/admin/assistant/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, documentIds: selectedId ? [selectedId] : [] }) }).then(readJson);
      setTaskId(result.task?.manus_task_id || '');
      if (!result.task?.manus_task_id) setBusy(false);
    } catch (askError) { setBusy(false); setError(askError instanceof Error ? askError.message : 'Unable to start Manus.'); }
  };

  const saveVersion = async () => {
    if (!selectedId || !draftContent.trim()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await fetch(`/api/admin/assistant/documents/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draftContent, changeSummary: 'Saved from HMSI Assistant document workspace' }) }).then(readJson);
      await loadDocument(selectedId); await loadLibrary(); setNotice('New document version saved and audit logged.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save this document version.'); }
    finally { setBusy(false); }
  };

  const createDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await fetch('/api/admin/assistant/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newDoc) }).then(readJson);
      setNewDoc({ title: '', category: 'governance', content: '' }); await loadLibrary(); setSelectedId(result.document.id); setNotice('HMSI document created with version 1.');
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Unable to create this document.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="rounded-3xl border border-[#d9d6ce] bg-[#17221e] p-6 text-white"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#e1ad45] p-3 text-[#17221e]"><ShieldCheck size={24} /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#e1ad45]">Secure HMSI Assistant</p><h2 className="mt-1 text-2xl font-black">Work with approved HMSI documents</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">Manus can analyse the selected document and propose practical drafts. This panel does not expose server files, secrets, payments, email delivery, or permission controls. Saving creates a new version and records an audit event.</p></div></div></div>
    {(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || notice}</div>}
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <aside className="space-y-4"><div className="rounded-3xl border border-[#d9d6ce] bg-white p-4"><div className="mb-3 flex items-center gap-2"><BookOpen size={17} className="text-[#1e5b49]" /><h3 className="text-sm font-black uppercase tracking-widest">Document library</h3></div>{documents.length === 0 ? <p className="text-sm leading-6 text-[#66716a]">No managed documents yet. Create the first approved HMSI record below.</p> : <div className="space-y-2">{documents.map((document) => <button key={document.id} onClick={() => setSelectedId(document.id)} className={`w-full rounded-2xl p-3 text-left ${selectedId === document.id ? 'bg-[#1e5b49] text-white' : 'bg-[#f6f4ef] text-[#17221e]'}`}><p className="text-sm font-black">{document.title}</p><p className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${selectedId === document.id ? 'text-white/70' : 'text-[#66716a]'}`}>{document.category} · {document.visibility}</p></button>)}</div>}</div>
        <form onSubmit={createDocument} className="space-y-3 rounded-3xl border border-[#d9d6ce] bg-white p-4"><div className="flex items-center gap-2"><FilePlus2 size={17} className="text-[#b56b3b]" /><h3 className="text-sm font-black uppercase tracking-widest">New document</h3></div><input required minLength={3} placeholder="Document title" value={newDoc.title} onChange={(event) => setNewDoc({ ...newDoc, title: event.target.value })} className="w-full rounded-xl bg-[#f6f4ef] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input placeholder="Category" value={newDoc.category} onChange={(event) => setNewDoc({ ...newDoc, category: event.target.value })} className="w-full rounded-xl bg-[#f6f4ef] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required rows={5} placeholder="Approved HMSI text or Markdown" value={newDoc.content} onChange={(event) => setNewDoc({ ...newDoc, content: event.target.value })} className="w-full resize-none rounded-xl bg-[#f6f4ef] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><FilePlus2 size={14} /> Create managed document</button></form></aside>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="mb-4 flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Versioned workspace</p><h3 className="mt-1 text-xl font-black">{selectedDocument?.title || 'Select a document'}</h3></div>{selectedVersion && <span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">v{selectedVersion.version}</span>}</div><textarea value={draftContent} onChange={(event) => setDraftContent(event.target.value)} disabled={!selectedDocument || busy} placeholder="Select or create an HMSI document to edit a new version." className="min-h-[320px] w-full resize-y rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={!selectedDocument || busy || !draftContent.trim()} onClick={saveVersion} className="mt-3 flex items-center gap-2 rounded-full bg-[#17221e] px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"><Save size={14} /> Save new version</button></section>
          <section className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="mb-4 flex items-center gap-2"><MessageSquareText size={18} className="text-[#1e5b49]" /><div><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Manus workspace</p><h3 className="mt-1 text-xl font-black">Ask about the selected document</h3></div></div><form onSubmit={askManus} className="space-y-3"><textarea required rows={6} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Example: Draft a neutral safeguarding checklist from this policy. Do not publish it." className="w-full resize-none rounded-2xl bg-[#f6f4ef] p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={busy || !prompt.trim()} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : <MessageSquareText size={14} />} {busy ? 'Manus is working…' : 'Ask Manus privately'}</button></form>{response && <div className="mt-4 max-h-[320px] overflow-y-auto rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] p-4 text-sm leading-6 whitespace-pre-wrap">{response}</div>}{taskId && !response && <p className="mt-4 text-xs font-bold text-[#66716a]">Task started. This panel is checking the private Manus response.</p>}</section></div>
        <section className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="mb-3 flex items-center gap-2"><CheckCircle2 size={17} className="text-[#1e5b49]" /><h3 className="text-sm font-black uppercase tracking-widest">Recent assistant audit events</h3></div>{auditLogs.length === 0 ? <p className="text-sm text-[#66716a]">No assistant events recorded yet.</p> : <div className="grid gap-2 md:grid-cols-2">{auditLogs.slice(0, 12).map((log) => <div key={log.id} className="rounded-xl bg-[#f6f4ef] px-3 py-2"><p className="text-xs font-black text-[#17221e]">{log.action}</p><p className="mt-1 text-[10px] text-[#66716a]">{log.actor_email} · {new Date(log.created_at).toLocaleString()}</p></div>)}</div>}</section>
      </div>
    </div>
  </div>;
}
