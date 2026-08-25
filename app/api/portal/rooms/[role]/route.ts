import { NextResponse } from 'next/server';
import { getPortalIdentity, type PortalRole } from '../../../../../lib/portalAuth';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ROLES = new Set<PortalRole>(['worker', 'volunteer', 'member']);

async function authorize(request: Request, rawRole: string) {
  if (!ROLES.has(rawRole as PortalRole)) return { error: NextResponse.json({ error: 'Room not found.' }, { status: 404 }) };
  const identity = await getPortalIdentity(request);
  if (!identity) return { error: NextResponse.json({ error: 'Portal sign-in is required.' }, { status: 401 }) };
  if (identity.role !== rawRole) return { error: NextResponse.json({ error: 'This room is restricted to the matching active HMSI role.' }, { status: 403 }) };
  return { identity, role: rawRole as PortalRole };
}

export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const access = await authorize(request, role);
  if ('error' in access) return access.error;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Room service is unavailable.' }, { status: 503 });
  const messages = await admin.from('role_room_messages').select('id,author_name,content,created_at').eq('room_role', access.role).order('created_at', { ascending: false }).limit(100);
  if (messages.error) return NextResponse.json({ error: 'Room messages are unavailable.' }, { status: 503 });
  return NextResponse.json({ room: access.role, messages: (messages.data || []).reverse() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const access = await authorize(request, role);
  if ('error' in access) return access.error;
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content || content.length > 2000) return NextResponse.json({ error: 'Enter a message between 1 and 2,000 characters.' }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Room service is unavailable.' }, { status: 503 });
  const inserted = await admin.from('role_room_messages').insert({ room_role: access.role, author_auth_user_id: access.identity.authUserId, author_name: access.identity.name, content }).select('id,author_name,content,created_at').single();
  if (inserted.error) return NextResponse.json({ error: 'The message could not be sent.' }, { status: 503 });
  return NextResponse.json({ message: inserted.data }, { status: 201 });
}
