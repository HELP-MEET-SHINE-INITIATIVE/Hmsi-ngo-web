'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MessageInbox from '../../components/MessageInbox';
import NewsletterStudio from '../../components/NewsletterStudio';
import FeaturedStoryStudio from '../../components/FeaturedStoryStudio';
import NewsroomStudio from '../../components/NewsroomStudio';
import FundraiserAdminManager from '../../components/FundraiserAdminManager';
import OptionalImageUpload from '../../components/OptionalImageUpload';
import ModerationPanel from '../../components/ModerationPanel';
import AdminPromotionLinks from '../../components/AdminPromotionLinks';
import AdminCampaignLinks from '../../components/AdminCampaignLinks';
import TrafficAnalyticsPanel from '../../components/TrafficAnalyticsPanel';
import TrainingAnalyticsPanel from '../../components/TrainingAnalyticsPanel';
import SponsorshipRequestsPanel from '../../components/SponsorshipRequestsPanel';
import HmsiAssistantPanel from '../../components/HmsiAssistantPanel';
import SchoolAdminPanel from '../../components/SchoolAdminPanel';
import MemberAdminPanel from '../../components/MemberAdminPanel';
import DonationsLedger from '../../components/DonationsLedger';
import { AlertCircle, Calendar, ClipboardList, LogOut, ShieldCheck, UserPlus, Users } from 'lucide-react';

type AdminData = {
  fundraisers: Array<any>;
  volunteers: Array<any>;
  workers: Array<{ id: string; name: string; email: string; phone: string; role?: string; status: string; onboarding_status?: 'not_started' | 'invited' | 'in_progress' | 'completed'; created_at: string }>;
  assignments: Array<any>;
  opportunities: Array<any>;
  opportunityApplications: Array<any>;
};

const emptyData: AdminData = { fundraisers: [], volunteers: [], workers: [], assignments: [], opportunities: [], opportunityApplications: [] };

export default function AdminControlContent() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<AdminData>(emptyData);
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'training' | 'fundraisers' | 'volunteers' | 'opportunities' | 'donations' | 'messages' | 'newsletter' | 'stories' | 'news' | 'moderation' | 'assignments' | 'sponsorships' | 'assistant' | 'school' | 'members'>('overview');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', phone: '' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', description: '', kind: 'assistance', workerId: '', fundraiserId: '', dueAt: '' });
  const [opportunityForm, setOpportunityForm] = useState({ title: '', description: '', audience: 'volunteer', location: 'Nigeria and Africa', image_url: '', image_path: '', startsAt: '', endsAt: '', category: 'general', eligibility_note: '', requires_hmsi_certificate: false, member_visible: false, work_mode: 'on_site' });
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [migrationWarnings, setMigrationWarnings] = useState<string[]>([]);
  const [configurationRequired, setConfigurationRequired] = useState(false);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  const pendingFundraisers = useMemo(() => data.fundraisers.filter((item) => item.status === 'pending'), [data.fundraisers]);
  const pendingVolunteers = useMemo(() => data.volunteers.filter((item) => item.status === 'pending'), [data.volunteers]);
  const pendingWorkerApplications = useMemo(() => pendingVolunteers.filter((item) => item.applicant_role === 'worker'), [pendingVolunteers]);
  const pendingVolunteerApplications = useMemo(() => pendingVolunteers.filter((item) => item.applicant_role !== 'worker'), [pendingVolunteers]);
  const pendingOpportunityApplications = useMemo(() => data.opportunityApplications.filter((item) => item.status === 'pending'), [data.opportunityApplications]);

  const loadOverview = async () => {
    const response = await fetch('/api/admin/overview', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) {
      const message = result.error || 'Admin data is temporarily unavailable.';
      if (response.status === 503 && message.toLowerCase().includes('supabase')) setConfigurationRequired(true);
      throw new Error(message);
    }
    setConfigurationRequired(false);
    setData(result);
    fetch('/api/messages', { cache: 'no-store' })
      .then((messageResponse) => messageResponse.ok ? messageResponse.json() : null)
      .then((messageResult) => { if (messageResult) setMessageUnreadCount(Number(messageResult.unreadCount || 0)); })
      .catch(() => undefined);
    setMigrationWarnings(Array.isArray(result.migrationWarnings) ? result.migrationWarnings : []);
  };

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then(async (result) => {
        if (result.authenticated) {
          setAuthenticated(true);
          await loadOverview();
        }
      })
      .catch((sessionError) => {
        const message = sessionError instanceof Error ? sessionError.message : 'Unable to load the admin workspace.';
        setError(message);
        if (message.toLowerCase().includes('supabase')) setConfigurationRequired(true);
      })
      .finally(() => setSessionChecked(true));
  }, []);

  useEffect(() => {
    const selectedWorkerId = new URLSearchParams(window.location.search).get('assign_worker');
    if (!selectedWorkerId) return;
    setAssignmentForm((current) => current.workerId === selectedWorkerId ? current : { ...current, workerId: selectedWorkerId });
    setActiveView('assignments');
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Invalid admin credentials.');
      setAuthenticated(true);
      setPassword('');
      await loadOverview();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : 'Unable to sign in.';
      setError(message);
      if (message.toLowerCase().includes('supabase')) setConfigurationRequired(true);
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setAuthenticated(false);
    setData(emptyData);
  };

  const updateRecord = async (url: string, body: Record<string, string>, successMessage = 'Update saved.') => {
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update this record.');
      await loadOverview();
      setNotice(url.includes('/fundraisers/') && body.status === 'rejected' ? 'Fundraiser and uploaded image permanently deleted.' : successMessage);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update this record.');
    } finally {
      setIsBusy(false);
    }
  };

  const addWorker = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/workers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(workerForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to add worker.');
      setWorkerForm({ name: '', email: '', phone: '' });
      await loadOverview();
      setNotice('Worker added.');
    } catch (workerError) {
      setError(workerError instanceof Error ? workerError.message : 'Unable to add worker.');
    } finally {
      setIsBusy(false);
    }
  };

  const createOpportunity = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/opportunities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(opportunityForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create opportunity.');
      setOpportunityForm({ title: '', description: '', audience: 'volunteer', location: 'Nigeria and Africa', image_url: '', image_path: '', startsAt: '', endsAt: '', category: 'general', eligibility_note: '', requires_hmsi_certificate: false, member_visible: false, work_mode: 'on_site' });
      await loadOverview();
      setNotice('Opportunity published for applications.');
    } catch (opportunityError) {
      setError(opportunityError instanceof Error ? opportunityError.message : 'Unable to create opportunity.');
    } finally {
      setIsBusy(false);
    }
  };

  const reviewOpportunityApplication = async (id: string, status: string) => {
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch(`/api/admin/opportunity-applications/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to review this application.');
      await loadOverview();
      setNotice(`Opportunity application ${status}.`);
    } catch (applicationError) {
      setError(applicationError instanceof Error ? applicationError.message : 'Unable to review this application.');
    } finally {
      setIsBusy(false);
    }
  };

  const createAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const response = await fetch('/api/admin/assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assignmentForm) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create assignment.');
      setAssignmentForm({ title: '', description: '', kind: 'assistance', workerId: '', fundraiserId: '', dueAt: '' });
      await loadOverview();
      setNotice('Assignment created and sent to the worker queue.');
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Unable to create assignment.');
    } finally {
      setIsBusy(false);
    }
  };

  if (!sessionChecked) return <div className="flex min-h-screen items-center justify-center bg-[#f6f4ef] text-[#66716a]">Checking secure admin session…</div>;

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#17221e] px-6 py-12">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl md:p-10">
          <Link href="/" className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#e1ad45] text-2xl font-black text-[#17221e]">H</Link>
          <div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Private control</p><h1 className="text-3xl font-black tracking-tight text-[#17221e]">HMSI Admin</h1><p className="mt-2 text-sm text-[#66716a]">Sign in to review requests and coordinate workers.</p></div><ShieldCheck className="text-[#1e5b49]" size={28} /></div>
          {error && <div className="mb-5 flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle size={18} className="shrink-0" />{error}</div>}
          <form onSubmit={handleLogin} className="space-y-5"><div><label htmlFor="admin-email" className="mb-2 block text-xs font-black uppercase tracking-widest text-[#17221e]">Admin email</label><input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 outline-none focus:border-[#1e5b49]" /></div><div><label htmlFor="admin-password" className="mb-2 block text-xs font-black uppercase tracking-widest text-[#17221e]">Password</label><input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef] px-4 py-3 outline-none focus:border-[#1e5b49]" /></div><button type="submit" disabled={isBusy} className="w-full rounded-full bg-[#17221e] py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#1e5b49] disabled:opacity-60">{isBusy ? 'Signing in…' : 'Secure sign in'}</button></form>
          <p className="mt-6 text-xs leading-5 text-[#66716a]">This private route is not linked from public navigation. Access is still protected by server-side credentials and a signed HTTP-only session.</p>
        </div>
      </main>
    );
  }

  if (configurationRequired) {
    return <ConfigurationRequired onRetry={() => { setError(''); loadOverview().catch((retryError) => setError(retryError instanceof Error ? retryError.message : 'Supabase is still unavailable.')); }} onLogout={handleLogout} />;
  }

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Traffic analytics' },
    { id: 'training', label: 'Training & safety' },
    { id: 'fundraisers', label: `Fundraisers & campaigns (${pendingFundraisers.length})` },
    { id: 'volunteers', label: `Applications (${pendingVolunteers.length})` },
    { id: 'opportunities', label: `Opportunities (${pendingOpportunityApplications.length})` },
    { id: 'donations', label: 'Donations' },
    { id: 'messages', label: messageUnreadCount > 0 ? `Messages (${messageUnreadCount} unread)` : 'Messages' },
    { id: 'newsletter', label: 'Newsletter' },
    { id: 'stories', label: 'Featured stories' },
    { id: 'news', label: 'Newsroom' },
    { id: 'moderation', label: 'Moderation' },
    { id: 'sponsorships', label: 'Sponsored placements' },
    { id: 'assistant', label: 'HMSI Assistant' },
    { id: 'school', label: 'Human Rights School' },
    { id: 'members', label: 'Members & tasks' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <header className="border-b border-[#d9d6ce] bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">Private HMSI workspace</p><h1 className="text-2xl font-black tracking-tight">Admin control center</h1></div><div className="flex flex-wrap items-center gap-2"><Link href="/volunteer-room" className="rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49] hover:border-[#1e5b49]">Volunteer room</Link><Link href="/worker-room" className="rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49] hover:border-[#1e5b49]">Worker room</Link><Link href="/member-room" className="rounded-full border border-[#d9d6ce] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49] hover:border-[#1e5b49]">Member room</Link><Link href="/dashboard" className="rounded-full bg-[#e9f0e9] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#1e5b49] hover:bg-[#1e5b49] hover:text-white">Volunteer dashboard</Link><Link href="/worker-dashboard" className="rounded-full bg-[#17221e] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#1e5b49]">Worker dashboard</Link><button onClick={handleLogout} className="flex items-center gap-2 rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a] hover:border-red-300 hover:text-red-600"><LogOut size={16} /> Sign out</button></div></div></header>
      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[230px_1fr]">
        <aside><nav className="sticky top-6 space-y-2 rounded-3xl border border-[#d9d6ce] bg-white p-3">{navItems.map((item) => <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-widest transition ${activeView === item.id ? 'bg-[#1e5b49] text-white' : 'text-[#66716a] hover:bg-[#f6f4ef]'}`}>{item.label}</button>)}<div className="mt-3 border-t border-[#f6f4ef] pt-3"><p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#b56b3b]">People & operations</p><Link href="/admin/assignments" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Job Assignments</Link><Link href="/admin/volunteer-assignments" className="block rounded-2xl bg-[#e9f0e9] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#1e5b49] hover:bg-[#1e5b49] hover:text-white">Volunteer Assignments</Link><Link href="/admin/directory" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Worker Directory</Link></div><div className="mt-3 border-t border-[#f6f4ef] pt-3"><p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#b56b3b]">Editorial</p><Link href="/admin/editorial" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Editorial Queue</Link><Link href="/admin/articles" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Content Management</Link></div><div className="mt-3 border-t border-[#f6f4ef] pt-3"><p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#b56b3b]">Launch tools</p><Link href="/admin/templates" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Outreach Templates</Link><Link href="/admin/gallery" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Outreach Gallery</Link><Link href="/admin/system-check" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">System Check</Link></div><div className="mt-3 border-t border-[#f6f4ef] pt-3"><p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#b56b3b]">Secure intake</p><Link href="/admin/intake-routing" className="block rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-[#66716a] hover:bg-[#f6f4ef]">Drive Intake Routing</Link></div></nav></aside>
        <section className="min-w-0 space-y-6">
          {migrationWarnings.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900" role="status"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="font-black uppercase tracking-widest">Database setup needed</p><p className="mt-2 leading-6">The admin workspace is working, but some publishing sections are waiting for their Supabase migration. Run the listed SQL file(s) in Supabase SQL Editor, then tap Check setup again.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-bold">{migrationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>{migrationWarnings.some((warning) => warning.includes('newsroom')) && <a href="https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web/blob/main/supabase/newsroom_patch.sql" target="_blank" rel="noreferrer" className="mt-4 mr-4 inline-block font-black text-[#1e5b49] underline">Open newsroom SQL migration</a>}{migrationWarnings.some((warning) => warning.includes('role_opportunities')) && <a href="https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web/blob/main/supabase/role_opportunities_community_patch.sql" target="_blank" rel="noreferrer" className="mt-4 inline-block font-black text-[#1e5b49] underline">Open opportunities SQL migration</a>}{migrationWarnings.some((warning) => warning.includes('fundraiser_campaigns')) && <a href="https://github.com/HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web/blob/main/supabase/fundraiser_campaigns_patch.sql" target="_blank" rel="noreferrer" className="mt-4 inline-block font-black text-[#1e5b49] underline">Open campaign SQL migration</a>}</div><button type="button" onClick={() => { setError(''); setNotice(''); loadOverview().catch((retryError) => setError(retryError instanceof Error ? retryError.message : 'Unable to check the database setup.')); }} className="shrink-0 rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">Check setup again</button></div></div>}
          {(error || notice) && <div className={`rounded-2xl border p-4 text-sm ${error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`} role="status">{error || notice}</div>}

          <AdminPromotionLinks />

          {activeView === 'overview' && <div className="space-y-6"><div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><StatCard label="Pending fundraisers" value={pendingFundraisers.length} /><StatCard label="Pending volunteers" value={pendingVolunteerApplications.length} /><StatCard label="Pending workers" value={pendingWorkerApplications.length} /><StatCard label="Opportunity applications" value={pendingOpportunityApplications.length} /><StatCard label="Active workers" value={data.workers.filter((worker) => worker.status === 'active').length} /><StatCard label="Open assignments" value={data.assignments.filter((assignment) => assignment.status !== 'completed').length} /></div><div className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><h2 className="mb-2 text-xl font-black">Today’s queue</h2><p className="mb-6 text-sm text-[#66716a]">Review new help requests and volunteer applications, then assign clear next steps to a worker.</p><div className="grid gap-4 md:grid-cols-2"><QueueCard title="Fundraising approvals" count={pendingFundraisers.length} onClick={() => setActiveView('fundraisers')} /><QueueCard title="Volunteer applications" count={pendingVolunteerApplications.length} onClick={() => setActiveView('volunteers')} /><QueueCard title="Worker applications" count={pendingWorkerApplications.length} onClick={() => setActiveView('volunteers')} /><QueueCard title="Opportunity applications" count={pendingOpportunityApplications.length} onClick={() => setActiveView('opportunities')} /></div></div><AdminCampaignLinks campaigns={data.fundraisers.filter((fundraiser) => fundraiser.status === 'active')} /></div>}

          {activeView === 'analytics' && <TrafficAnalyticsPanel />}

          {activeView === 'training' && <TrainingAnalyticsPanel />}

          {activeView === 'fundraisers' && <FundraiserAdminManager fundraisers={data.fundraisers} onRefresh={loadOverview} />}

          {activeView === 'volunteers' && <div className="space-y-4"><SectionHeading title="Volunteer & worker applications" subtitle="Approve volunteers or approve worker applications. Approving a worker application creates or updates the active worker directory record." /><div className="rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-4 text-sm leading-6 text-[#7a5b16]">Worker applications are marked <strong>worker</strong>. Select <strong>Approve worker</strong> to create the worker record used for assignments and worker-room access.</div>{data.volunteers.length === 0 ? <Empty text="No volunteer applications yet." /> : data.volunteers.map((volunteer) => <div key={volunteer.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="mb-2 flex items-center gap-2"><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{volunteer.status}</span><span className="text-xs font-bold text-[#b56b3b]">{volunteer.interest}</span><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{volunteer.applicant_role || 'volunteer'}</span></div><h3 className="text-xl font-black">{volunteer.name}</h3><p className="mt-1 text-sm text-[#66716a]">{volunteer.email} · {volunteer.phone}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-[#17221e]">{volunteer.message}</p></div><div className="flex shrink-0 flex-wrap items-start gap-2">{volunteer.status === 'pending' ? <><button disabled={isBusy} onClick={() => updateRecord(`/api/admin/volunteers/${volunteer.id}`, { status: 'approved' }, volunteer.applicant_role === 'worker' ? 'Worker application approved. The active worker record is now available for assignments and worker-room access.' : 'Volunteer application approved.') } className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">{volunteer.applicant_role === 'worker' ? 'Approve worker' : 'Approve volunteer'}</button><button disabled={isBusy} onClick={() => updateRecord(`/api/admin/volunteers/${volunteer.id}`, { status: 'rejected' }, volunteer.applicant_role === 'worker' ? 'Worker application rejected.' : 'Volunteer application rejected.') } className="rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50">Reject</button></> : <span className="rounded-full bg-[#e9f0e9] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#1e5b49]">{volunteer.status === 'approved' ? 'Approved' : 'Closed'}</span>}</div></div></div>)}</div>}

          {activeView === 'opportunities' && <div className="space-y-6"><SectionHeading title="Opportunities and positions" subtitle="Publish volunteer opportunities, worker positions, or shared roles. Every application stays pending until an admin reviews it." /><form onSubmit={createOpportunity} className="grid gap-4 rounded-3xl border border-[#d9d6ce] bg-white p-6 md:grid-cols-2"><input required placeholder="Opportunity title" value={opportunityForm.title} onChange={(event) => setOpportunityForm({ ...opportunityForm, title: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><textarea required rows={4} placeholder="Describe the position and responsibilities" value={opportunityForm.description} onChange={(event) => setOpportunityForm({ ...opportunityForm, description: event.target.value })} className="resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49] md:col-span-2" /><select value={opportunityForm.category} onChange={(event) => setOpportunityForm({ ...opportunityForm, category: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="general">General opening</option><option value="core_studies">Core studies</option><option value="leadership">Leadership pathway</option></select><input placeholder="Eligibility guidance (required for leadership)" value={opportunityForm.eligibility_note} onChange={(event) => setOpportunityForm({ ...opportunityForm, eligibility_note: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none" /><label className="flex items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-xs font-bold text-[#66716a] md:col-span-2"><input type="checkbox" checked={opportunityForm.member_visible} onChange={(event) => setOpportunityForm({ ...opportunityForm, member_visible: event.target.checked })} /> Show this opening to approved members</label><label className="flex items-center gap-3 rounded-2xl bg-[#f6f4ef] px-4 py-3 text-xs font-bold text-[#66716a] md:col-span-2"><input type="checkbox" checked={opportunityForm.requires_hmsi_certificate} onChange={(event) => setOpportunityForm({ ...opportunityForm, requires_hmsi_certificate: event.target.checked })} /> Require a valid HMSI school completion certificate</label><select value={opportunityForm.work_mode} onChange={(event) => setOpportunityForm({ ...opportunityForm, work_mode: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="remote">Remote work</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select><select value={opportunityForm.audience} onChange={(event) => setOpportunityForm({ ...opportunityForm, audience: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="volunteer">Volunteer position</option><option value="worker">Worker position</option><option value="both">Volunteer + worker</option></select><input required placeholder="Location" value={opportunityForm.location} onChange={(event) => setOpportunityForm({ ...opportunityForm, location: event.target.value })} className="rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none" /><div className="md:col-span-2"><OptionalImageUpload viewer={{ email: 'admin', role: 'admin' }} value={opportunityForm.image_url} onChange={(imageUrl, imagePath) => setOpportunityForm({ ...opportunityForm, image_url: imageUrl, image_path: imagePath || '' })} /></div><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Starts<input required type="datetime-local" value={opportunityForm.startsAt} onChange={(event) => setOpportunityForm({ ...opportunityForm, startsAt: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><label className="text-xs font-black uppercase tracking-widest text-[#66716a]">Ends (optional)<input type="datetime-local" value={opportunityForm.endsAt} onChange={(event) => setOpportunityForm({ ...opportunityForm, endsAt: event.target.value })} className="mt-2 w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm font-normal normal-case tracking-normal outline-none" /></label><button disabled={isBusy} className="rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 md:col-span-2">Publish opportunity</button></form><div className="grid gap-5 md:grid-cols-2">{data.opportunities.map((opportunity) => <div key={opportunity.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{opportunity.audience}</span><span className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">{opportunity.status}</span></div><h3 className="mt-3 text-lg font-black">{opportunity.title}</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{opportunity.description}</p><p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-[#66716a]"><Calendar size={14} />{new Date(opportunity.starts_at).toLocaleString()} · {opportunity.location}{opportunity.work_mode === 'remote' && <span className="rounded-full bg-[#e9f0e9] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">Remote work</span>}</p></div>)}</div><div className="space-y-4"><h3 className="text-xl font-black">Opportunity applications</h3>{data.opportunityApplications.length === 0 ? <Empty text="No opportunity applications yet." /> : data.opportunityApplications.map((application) => <div key={application.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#f6f4ef] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{application.status}</span><span className="rounded-full bg-[#e9f0e9] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1e5b49]">{application.applicant_role}</span></div><h4 className="mt-3 text-lg font-black">{application.applicant_name}</h4><p className="mt-1 text-sm text-[#66716a]">{application.applicant_email} · {application.applicant_phone}</p><p className="mt-2 text-xs font-bold text-[#b56b3b]">{data.opportunities.find((opportunity) => opportunity.id === application.opportunity_id)?.title || 'Opportunity'}</p></div><div className="flex shrink-0 gap-2"><button disabled={isBusy} onClick={() => reviewOpportunityApplication(application.id, 'approved')} className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Approve</button><button disabled={isBusy} onClick={() => reviewOpportunityApplication(application.id, 'rejected')} className="rounded-full border border-red-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-600 disabled:opacity-50">Reject</button></div></div></div>)}</div></div>}

          {activeView === 'donations' && <DonationsLedger />}

          {activeView === 'messages' && <MessageInbox viewer={{ role: 'admin' }} onUnreadChange={setMessageUnreadCount} />}

          {activeView === 'newsletter' && <NewsletterStudio viewer={{ email: 'admin', name: 'HMSI Admin', role: 'admin' }} />}

          {activeView === 'stories' && <FeaturedStoryStudio viewer={{ email: 'admin', name: 'HMSI Admin', role: 'admin' }} />}

          {activeView === 'news' && <NewsroomStudio viewer={{ email: 'admin', name: 'HMSI Admin', role: 'admin' }} />}

          {activeView === 'moderation' && <ModerationPanel />}

          {activeView === 'sponsorships' && <SponsorshipRequestsPanel />}

          {activeView === 'assistant' && <HmsiAssistantPanel />}

          {activeView === 'school' && <SchoolAdminPanel workers={data.workers} volunteers={data.volunteers} />}

          {activeView === 'members' && <MemberAdminPanel />}

          {activeView === 'assignments' && <div className="space-y-6"><SectionHeading title="Workers & assignments" subtitle="Keep the next step simple: add a worker, then assign either assistance or a job with a clear description and due date." /><div className="grid gap-6 xl:grid-cols-2"><form onSubmit={addWorker} className="space-y-4 rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><UserPlus size={20} className="text-[#e1ad45]" /><h2 className="text-lg font-black">Add worker</h2></div><input required placeholder="Full name" value={workerForm.name} onChange={(event) => setWorkerForm({ ...workerForm, name: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input required type="email" placeholder="Email" value={workerForm.email} onChange={(event) => setWorkerForm({ ...workerForm, email: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><input required placeholder="Phone" value={workerForm.phone} onChange={(event) => setWorkerForm({ ...workerForm, phone: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><button disabled={isBusy} className="w-full rounded-full bg-[#17221e] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Add to worker directory</button></form><section className="rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><Users size={20} className="text-[#1e5b49]" /><h2 className="text-lg font-black">Worker directory</h2></div><p className="mt-2 text-xs leading-5 text-[#66716a]">Approved worker records are synchronized here with their contact details and onboarding state. Only active workers with completed onboarding can receive assignments.</p><div className="mt-4 space-y-3">{data.workers.length === 0 ? <Empty text="No worker directory records yet." /> : data.workers.map((worker) => <div key={worker.id} className="rounded-2xl bg-[#f6f4ef] p-4"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="font-black">{worker.name}</p><p className="mt-1 text-xs text-[#66716a]">{worker.email} · {worker.phone}</p></div><div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest"><span className="rounded-full bg-white px-3 py-1 text-[#1e5b49]">{worker.status}</span><span className="rounded-full bg-white px-3 py-1 text-[#b56b3b]">onboarding: {worker.onboarding_status || 'unknown'}</span></div></div></div>)}</div></section><form onSubmit={createAssignment} className="space-y-4 rounded-3xl border border-[#d9d6ce] bg-white p-6"><div className="flex items-center gap-2"><ClipboardList size={20} className="text-[#e1ad45]" /><h2 className="text-lg font-black">Create assignment</h2></div><input required placeholder="Assignment title" value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><textarea required rows={3} placeholder="What needs to be done?" value={assignmentForm.description} onChange={(event) => setAssignmentForm({ ...assignmentForm, description: event.target.value })} className="w-full resize-none rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1e5b49]" /><div className="grid gap-4 sm:grid-cols-2"><select value={assignmentForm.kind} onChange={(event) => setAssignmentForm({ ...assignmentForm, kind: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="assistance">Assistance</option><option value="job">Job</option></select><select required value={assignmentForm.workerId} onChange={(event) => setAssignmentForm({ ...assignmentForm, workerId: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="">Assign to completed worker…</option>{data.workers.filter((worker) => worker.status === 'active' && worker.onboarding_status === 'completed').map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.email} · {worker.phone}</option>)}</select></div><select value={assignmentForm.fundraiserId} onChange={(event) => setAssignmentForm({ ...assignmentForm, fundraiserId: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none"><option value="">Link to fundraiser (optional)</option>{data.fundraisers.map((fundraiser) => <option key={fundraiser.id} value={fundraiser.id}>{fundraiser.title}</option>)}</select><input type="datetime-local" value={assignmentForm.dueAt} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueAt: event.target.value })} className="w-full rounded-2xl bg-[#f6f4ef] px-4 py-3 text-sm outline-none" /><button disabled={isBusy || data.workers.filter((worker) => worker.status === 'active' && worker.onboarding_status === 'completed').length === 0} className="w-full rounded-full bg-[#1e5b49] py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">Create assignment</button><p className="text-xs leading-5 text-[#66716a]">Only active workers with completed onboarding can receive assignments. Approved workers appear here after onboarding is completed.</p></form></div><div className="grid gap-4 md:grid-cols-2">{data.assignments.map((assignment) => <div key={assignment.id} className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b]">{assignment.kind}</span><span className="text-[10px] font-black uppercase tracking-widest text-[#66716a]">{assignment.status}</span></div><h3 className="mt-3 font-black">{assignment.title}</h3><p className="mt-2 text-sm leading-6 text-[#66716a]">{assignment.description}</p><select value={assignment.status} onChange={(event) => updateRecord('/api/admin/assignments', { id: assignment.id, status: event.target.value })} className="mt-4 w-full rounded-xl bg-[#f6f4ef] px-3 py-2 text-xs font-bold outline-none"><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>)}</div></div>}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-[#d9d6ce] bg-white p-5"><p className="text-3xl font-black text-[#1e5b49]">{value}</p><p className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#66716a]">{label}</p></div>;
}

function QueueCard({ title, count, onClick }: { title: string; count: number; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center justify-between rounded-2xl bg-[#f6f4ef] p-5 text-left transition hover:bg-[#e9f0e9]"><span className="flex items-center gap-3 text-sm font-black"><Users size={18} className="text-[#1e5b49]" />{title}</span><span className="rounded-full bg-[#e1ad45] px-3 py-1 text-xs font-black">{count}</span></button>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="text-2xl font-black tracking-tight">{title}</h2><p className="mt-2 text-sm text-[#66716a]">{subtitle}</p></div>;
}

function ConfigurationRequired({ onRetry, onLogout }: { onRetry: () => void; onLogout: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f4ef] px-6 py-12">
      <div className="w-full max-w-2xl rounded-[32px] border border-[#f0caca] bg-white p-8 shadow-xl md:p-10">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-600">Admin connection required</p>
        <h1 className="text-3xl font-black tracking-tight text-[#17221e]">Supabase is not configured on the server.</h1>
        <p className="mt-4 leading-7 text-[#66716a]">Your admin login is valid, but the dashboard cannot read its fundraiser, volunteer, worker, and assignment data yet. No empty counts are being shown because they could be mistaken for real records.</p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-6 text-[#17221e]"><li>Add <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> (or <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">SUPABASE_URL</code>) and <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> (or <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">SUPABASE_SECRET_KEY</code>) to the live hosting environment.</li><li>Run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/schema.sql</code> in the Supabase SQL Editor.</li><li>For the private donation ledger, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/donations_patch.sql</code> and add server-only <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">PAYSTACK_SECRET_KEY</code>.</li><li>For contact inbox notifications and replies, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/messaging_patch.sql</code>.</li><li>For newsletter subscribers and approvals, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/newsletter_patch.sql</code>. Add server-only <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">RESEND_API_KEY</code> and a verified <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">RESEND_FROM_EMAIL</code> before sending.</li><li>For homepage featured stories, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/featured_stories_patch.sql</code>. Approved workers and volunteers can submit stories, while administrators approve and publish them.</li><li>For newsroom submissions and approvals, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/newsroom_patch.sql</code>. Approved workers and volunteers can submit news, while administrators approve and publish it.</li><li>For fundraiser completion controls, run <code className="rounded bg-[#f6f4ef] px-1.5 py-0.5">supabase/fundraiser_management_patch.sql</code> so completed records can be hidden from public pages.</li><li>Redeploy the website, then return to this page and try again.</li></ol>
        <div className="mt-8 flex flex-wrap gap-3"><button onClick={onRetry} className="rounded-full bg-[#1e5b49] px-5 py-3 text-xs font-black uppercase tracking-widest text-white">Try again</button><button onClick={onLogout} className="rounded-full border border-[#d9d6ce] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#66716a]">Sign out</button></div>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-3xl border border-dashed border-[#d9d6ce] bg-white p-10 text-center text-sm italic text-[#66716a]">{text}</div>;
}
