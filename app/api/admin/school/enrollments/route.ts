import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('School records are unavailable.', 503);
  const result = await admin.from('hmsi_school_enrollments').select('id,holder_role,holder_id,holder_name,holder_email,status,enrolled_at,completed_at').order('enrolled_at', { ascending: false }).limit(200);
  if (result.error) return error('School enrollments are unavailable. Apply the HMSI school migration first.', 503);
  return NextResponse.json({ enrollments: result.data || [] });
}

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('School records are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const holderRole = body.holder_role === 'worker' || body.holder_role === 'volunteer' ? body.holder_role : null;
  const holderId = typeof body.holder_id === 'string' ? body.holder_id.trim() : '';
  if (!holderRole || !holderId) return error('An approved worker or volunteer is required.');
  let holder: { id: string; name: string; email: string } | null = null;
  if (holderRole === 'worker') {
    const result = await admin.from('workers').select('id,name,email,status,onboarding_status').eq('id', holderId).maybeSingle();
    if (result.error) return error('Worker records are unavailable.', 503);
    if (!result.data || result.data.status !== 'active' || result.data.onboarding_status !== 'completed') return error('Only active successfully onboarded workers may be enrolled.');
    holder = result.data;
  } else {
    const result = await admin.from('volunteer_applications').select('id,name,email,status,account_status,applicant_role').eq('id', holderId).maybeSingle();
    if (result.error) return error('Volunteer records are unavailable.', 503);
    if (!result.data || result.data.status !== 'approved' || result.data.account_status !== 'active' || result.data.applicant_role === 'worker') return error('Only approved active volunteers may be enrolled.');
    holder = result.data;
  }
  const enrollment = await admin.from('hmsi_school_enrollments').upsert({ holder_role: holderRole, holder_id: holder.id, holder_name: holder.name, holder_email: holder.email.trim().toLowerCase(), status: 'enrolled' }, { onConflict: 'holder_role,holder_id' }).select('id,holder_role,holder_id,holder_name,holder_email,status,enrolled_at,completed_at').single();
  if (enrollment.error || !enrollment.data) return error('The school enrollment could not be saved.', 503);
  return NextResponse.json({ enrollment: enrollment.data, enrolledBy: adminEmail }, { status: 201 });
}
