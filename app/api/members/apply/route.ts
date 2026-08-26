import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { attachApplicationReservation, DUPLICATE_APPLICATION_MESSAGE, releaseApplicationReservation, reserveApplicationEmail } from '../../../../lib/applicationIntake';

export const runtime = 'nodejs';
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export async function POST(request: Request) {
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Member registration is temporarily unavailable.' }, { status: 503 });
  const body = await request.json().catch(() => ({})); const name = clean(body.name, 160); const email = clean(body.email, 320).toLowerCase(); const phone = clean(body.phone, 64); const location = clean(body.location, 160); const purpose = clean(body.purpose, 2000);
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !location || purpose.length < 20) return NextResponse.json({ error: 'Name, a valid email, location, and a short explanation of your interest are required.' }, { status: 400 });
  const reservation = await reserveApplicationEmail(admin, { email, role: 'member', sourceTable: 'hmsi_member_applications' });
  if (reservation.duplicate) return NextResponse.json({ error: DUPLICATE_APPLICATION_MESSAGE, code: 'already_applied' }, { status: 409 });
  const result = await admin.from('hmsi_member_applications').insert({ name, email, phone: phone || null, location, purpose, status: 'pending' }).select('id,name,email,status,created_at').single();
  if (result.error || !result.data) await releaseApplicationReservation(admin, reservation.reservation!.id);
  if (result.error || !result.data) return NextResponse.json({ error: 'Member registration could not be saved.' }, { status: 503 });
  await attachApplicationReservation(admin, reservation.reservation!.id, result.data.id);
  return NextResponse.json({ application: result.data, message: 'Your HMSI membership request was submitted for administrator review.' }, { status: 201 });
}
