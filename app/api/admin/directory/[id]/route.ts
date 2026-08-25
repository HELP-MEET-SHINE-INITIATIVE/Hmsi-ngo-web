import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });
  const { id } = await params;
  try {
    const worker = await admin.from('workers').select('id,name,email,phone,role,status,onboarding_status,onboarded_at,created_at,auth_user_id').eq('id', id).maybeSingle();
    if (worker.error) throw worker.error;
    if (!worker.data) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 });
    const [card, assignments, events] = await Promise.all([
      admin.from('hmsi_id_cards').select('member_number,role_display,status,issued_at,activated_at,expires_at').eq('holder_role', 'worker').eq('holder_id', id).eq('status', 'active').order('issued_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('work_assignments').select('id,title,description,kind,status,due_at,created_at,updated_at').eq('assigned_worker_id', id).order('created_at', { ascending: false }).limit(100),
      admin.from('portal_access_events').select('id,event_type,actor_email,metadata,created_at').eq('worker_id', id).order('created_at', { ascending: false }).limit(100),
    ]);
    if (card.error || assignments.error || events.error) throw card.error || assignments.error || events.error;
    const completed = (assignments.data || []).filter((assignment) => assignment.status === 'completed');
    return NextResponse.json({
      worker: { ...worker.data, hmsiId: card.data?.member_number || null, idCard: card.data || null },
      assignments: assignments.data || [],
      completedAssignments: completed,
      fieldProofs: [],
      attendance: [],
      activity: events.data || [],
    });
  } catch (cause) {
    console.error('[Admin directory] Worker profile failed:', cause instanceof Error ? cause.message : 'unknown');
    return NextResponse.json({ error: 'Worker profile data is temporarily unavailable.' }, { status: 503 });
  }
}
