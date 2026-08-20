import { getAdminEmailFromCookie } from './adminSession';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MessageViewer = {
  email: string;
  name: string;
  role: 'admin' | 'worker';
};

type ViewerPayload = {
  email?: unknown;
  role?: unknown;
};

export async function getMessageViewer(
  request: Request,
  admin: SupabaseClient,
  payload: ViewerPayload = {},
): Promise<MessageViewer | null> {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (adminEmail) {
    return { email: adminEmail, name: 'HMSI Admin', role: 'admin' };
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const role = payload.role === 'worker' ? 'worker' : null;
  if (!email || !role) return null;

  const worker = await admin
    .from('workers')
    .select('name,email')
    .ilike('email', email)
    .eq('status', 'active')
    .maybeSingle();

  if (worker.error || !worker.data) return null;
  return { email: worker.data.email, name: worker.data.name, role: 'worker' };
}

export function getViewerPayloadFromUrl(request: Request): ViewerPayload {
  const url = new URL(request.url);
  return {
    email: url.searchParams.get('email') || undefined,
    role: url.searchParams.get('role') || undefined,
  };
}
