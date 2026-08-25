import { NextResponse } from 'next/server';
import { getPortalIdentity } from '../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const identity = await getPortalIdentity(request);
  if (!identity) return NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Your task portal is temporarily unavailable.' }, { status: 503 });
  if (identity.role !== 'worker') {
    return NextResponse.json({ identity, assignments: [], message: 'Your active HMSI role does not currently have worker assignments in this task feed.' });
  }
  const assignments = await admin
    .from('work_assignments')
    .select('id,title,description,kind,status,due_at,created_at,updated_at')
    .eq('assigned_worker_id', identity.profileId)
    .order('due_at', { ascending: true, nullsFirst: false })
    .limit(100);
  if (assignments.error) return NextResponse.json({ error: 'Assignments are temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ identity, assignments: assignments.data || [], message: null });
}
