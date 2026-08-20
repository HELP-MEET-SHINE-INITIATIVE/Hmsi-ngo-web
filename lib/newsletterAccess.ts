import { getAdminEmailFromCookie } from './adminSession';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NewsletterViewer = {
  email: string;
  name: string;
  role: 'admin' | 'worker' | 'volunteer';
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
  const requestedRole = payload.role === 'worker' || payload.role === 'volunteer' ? payload.role : null;
  if (!email || !requestedRole) return null;

  if (requestedRole === 'worker') {
    const worker = await admin.from('workers').select('name,email').ilike('email', email).eq('status', 'active').maybeSingle();
    if (worker.error || !worker.data) return null;
    return { email: worker.data.email, name: worker.data.name, role: 'worker' };
  }

  const volunteer = await admin
    .from('volunteer_applications')
    .select('name,email,applicant_role')
    .ilike('email', email)
    .eq('status', 'approved')
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
