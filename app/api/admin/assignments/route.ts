import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_KINDS = new Set(['assistance', 'job']);
const ALLOWED_STATUSES = new Set(['assigned', 'in_progress', 'completed']);

function isAdmin(request: Request) {
  return Boolean(getAdminEmailFromCookie(request.headers.get('cookie')));
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const kind = String(body.kind || '').toLowerCase();
    const workerId = String(body.workerId || '').trim();
    const fundraiserId = String(body.fundraiserId || '').trim() || null;
    const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;

    if (!title || !description || !workerId || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Title, description, type, and worker are required.' }, { status: 400 });
    }

    const { data, error } = await admin.from('work_assignments').insert({
      title,
      description,
      kind,
      assigned_worker_id: workerId,
      fundraiser_id: fundraiserId,
      due_at: dueAt,
      status: 'assigned',
    }).select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at').single();

    if (error) throw error;
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (error) {
    console.error('[Admin] Failed to create assignment:', error);
    return NextResponse.json({ error: 'We could not create this assignment.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const status = String(body.status || '').toLowerCase();
    if (!id || !ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Assignment and valid status are required.' }, { status: 400 });

    const { data, error } = await admin.from('work_assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('id,status').single();
    if (error) throw error;
    return NextResponse.json({ assignment: data });
  } catch (error) {
    console.error('[Admin] Failed to update assignment:', error);
    return NextResponse.json({ error: 'We could not update this assignment.' }, { status: 500 });
  }
}
