import { getAdminEmailFromCookie } from './adminSession';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getWorkerSessionFromCookie } from './workerSession';
import { getMemberSessionFromCookie } from './memberSession';

export type NewsletterViewer = {
  email: string;
  name: string;
  role: 'admin' | 'worker' | 'volunteer' | 'member';
};

type ViewerPayload = {
  email?: unknown;
  role?: unknown;
};

export async function getNewsletterViewer(
  request: Request,
  admin: SupabaseClient,
  payload: ViewerPayload = {},
): Promise<NewsletterViewer | null> {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (adminEmail) return { email: adminEmail, name: 'HMSI Admin', role: 'admin' };

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const requestedRole = payload.role === 'worker' || payload.role === 'volunteer' || payload.role === 'member' ? payload.role : null;
  if (!email || !requestedRole) return null;

  if (requestedRole === 'worker') {
    const workerSession = getWorkerSessionFromCookie(request.headers.get('cookie'));
    if (!workerSession || workerSession.email.toLowerCase() !== email) return null;
    const worker = await admin.from('workers').select('name,email').eq('id', workerSession.workerId).ilike('email', email).eq('status', 'active').eq('onboarding_status', 'completed').maybeSingle();
    if (worker.error || !worker.data) return null;
    return { email: worker.data.email, name: worker.data.name, role: 'worker' };
  }

  if (requestedRole === 'member') {
    const memberSession = getMemberSessionFromCookie(request.headers.get('cookie'));
    if (!memberSession || memberSession.holderRole !== 'member' || memberSession.email.toLowerCase() !== email) return null;
    const member = await admin.from('hmsi_members').select('name,email').eq('id', memberSession.holderId).ilike('email', email).eq('status', 'active').maybeSingle();
    if (member.error || !member.data) return null;
    return { email: member.data.email, name: member.data.name, role: 'member' };
  }

  const volunteer = await admin
    .from('volunteer_applications')
    .select('name,email,applicant_role,account_status')
    .ilike('email', email)
    .eq('status', 'approved')
    .eq('account_status', 'active')
    .neq('applicant_role', 'worker')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (volunteer.error || !volunteer.data) return null;
  return { email: volunteer.data.email, name: volunteer.data.name, role: 'volunteer' };
}

export function getNewsletterViewerPayload(request: Request): ViewerPayload {
  const url = new URL(request.url);
  return { email: url.searchParams.get('email') || undefined, role: url.searchParams.get('role') || undefined };
}
