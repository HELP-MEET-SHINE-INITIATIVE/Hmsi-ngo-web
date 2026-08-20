import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = String(body.status || '').toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid volunteer status.' }, { status: 400 });

    const { data: application, error: applicationError } = await admin
      .from('volunteer_applications')
      .select('id,name,email,phone,applicant_role')
      .eq('id', id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return NextResponse.json({ error: 'This application was not found.' }, { status: 404 });

    const { data, error } = await admin
      .from('volunteer_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select('id,status,applicant_role')
      .single();

    if (error) throw error;

    if (status === 'approved' && application.applicant_role === 'worker') {
      const { error: workerError } = await admin.from('workers').upsert({ name: application.name, email: application.email, phone: application.phone, role: 'worker', status: 'active' }, { onConflict: 'email' });
      if (workerError) throw workerError;
    }

    return NextResponse.json({ volunteer: data, workerCreated: status === 'approved' && application.applicant_role === 'worker' });
  } catch (error) {
    console.error('[Admin] Failed to update volunteer application:', error);
    return NextResponse.json({ error: 'We could not update this application.' }, { status: 500 });
  }
}
