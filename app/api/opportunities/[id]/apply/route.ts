import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const { id: opportunityId } = await params;
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const role = String(body.role || '').trim().toLowerCase();

    if (!name || name.length > 160) return NextResponse.json({ error: 'A valid name is required.' }, { status: 400 });
    if (!email || !email.includes('@')) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    if (!phone) return NextResponse.json({ error: 'A phone number is required.' }, { status: 400 });
    if (!['volunteer', 'worker'].includes(role)) return NextResponse.json({ error: 'Choose volunteer or worker.' }, { status: 400 });

    const { data: opportunity, error: opportunityError } = await admin
      .from('opportunities')
      .select('id,status,audience')
      .eq('id', opportunityId)
      .maybeSingle();

    if (opportunityError) throw opportunityError;
    if (!opportunity || opportunity.status !== 'open') return NextResponse.json({ error: 'This opportunity is no longer open.' }, { status: 404 });
    if (opportunity.audience !== 'both' && opportunity.audience !== role) return NextResponse.json({ error: `This opportunity is for ${opportunity.audience}s.` }, { status: 403 });

    const { data, error } = await admin
      .from('opportunity_applications')
      .insert({ opportunity_id: opportunityId, applicant_name: name, applicant_email: email, applicant_phone: phone, applicant_role: role, status: 'pending' })
      .select('id,opportunity_id,applicant_name,applicant_email,applicant_role,status,created_at')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'You have already applied to this opportunity.' }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('[Opportunities] Failed to submit application:', message);
    return NextResponse.json({ error: `We could not submit your application: ${message}` }, { status: 500 });
  }
}
