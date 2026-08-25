import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const view = new URL(request.url).searchParams.get('view') === 'archives' ? 'archives' : 'pending';
  if (view === 'archives') {
    const archive = await admin.from('archived_applications').select('id,source_table,source_id,status_at_archive,archived_at,purge_after,purged_at,snapshot').order('archived_at', { ascending: false }).limit(100);
    if (archive.error) return NextResponse.json({ error: 'Application archives are unavailable.' }, { status: 503 });
    return NextResponse.json({ view, archives: archive.data || [] });
  }
  const [volunteers, members, opportunities] = await Promise.all([
    admin.from('volunteer_applications').select('id,name,email,phone,interest,applicant_role,status,created_at').eq('status', 'pending').is('removal_requested_at', null).order('created_at', { ascending: false }).limit(100),
    admin.from('hmsi_member_applications').select('id,name,email,phone,purpose,status,created_at').eq('status', 'pending').is('removal_requested_at', null).order('created_at', { ascending: false }).limit(100),
    admin.from('opportunity_applications').select('id,applicant_name,applicant_email,applicant_phone,applicant_role,status,created_at').eq('status', 'pending').is('removal_requested_at', null).order('created_at', { ascending: false }).limit(100),
  ]);
  const failed = [volunteers.error, members.error, opportunities.error].find(Boolean);
  if (failed) return NextResponse.json({ error: 'Pending applications are unavailable.' }, { status: 503 });
  return NextResponse.json({ view, pending: { volunteers: volunteers.data || [], members: members.data || [], opportunities: opportunities.data || [] } });
}
