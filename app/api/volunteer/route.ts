import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';
import { sendPresidentInternalAlert } from '../../../lib/hmsiNotifications';
import { attachApplicationReservation, DUPLICATE_APPLICATION_MESSAGE, releaseApplicationReservation, reserveApplicationEmail } from '../../../lib/applicationIntake';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Volunteer applications are not configured yet.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const location = String(body.location || '').trim().slice(0, 160);
    const interest = String(body.interest || '').trim();
    const message = String(body.message || '').trim();
    const applicantRole = String(body.role || 'volunteer').trim().toLowerCase();
    const publisherRole = String(body.publisherRole || '').trim().toLowerCase();

    if (!name || !email || !phone || !location || !interest || !message) {
      return NextResponse.json({ error: 'Please complete all application fields, including location.' }, { status: 400 });
    }
    if (name.length > 160 || message.length > 10000) {
      return NextResponse.json({ error: 'Please shorten the name or message and try again.' }, { status: 400 });
    }
    if (!['volunteer', 'worker'].includes(applicantRole)) {
      return NextResponse.json({ error: 'Choose volunteer or worker.' }, { status: 400 });
    }
    if (publisherRole && !['community_publisher', 'humanitarian_activist', 'independent_field_reporter'].includes(publisherRole)) return NextResponse.json({ error: 'Choose a valid publisher pathway.' }, { status: 400 });
    if (publisherRole && applicantRole !== 'volunteer') return NextResponse.json({ error: 'Publisher pathways are available within the volunteer application.' }, { status: 400 });

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is not configured.');
    const reservation = await reserveApplicationEmail(admin, { email, role: applicantRole as 'volunteer' | 'worker', sourceTable: 'volunteer_applications' });
    if (reservation.duplicate) return NextResponse.json({ error: DUPLICATE_APPLICATION_MESSAGE, code: 'already_applied' }, { status: 409 });

    const { data: application, error } = await admin.from('volunteer_applications').insert({
      name,
      email,
      phone,
      interest,
      message,
      applicant_role: applicantRole,
      publisher_role: publisherRole || null,
      location,
      status: 'pending',
    }).select('id').single();

    if (error || !application) {
      await releaseApplicationReservation(admin, reservation.reservation!.id);
      throw error || new Error('Volunteer application could not be created.');
    }
    await attachApplicationReservation(admin, reservation.reservation!.id, application.id);
    try {
      await sendPresidentInternalAlert({
        title: 'New volunteer registration received',
        summary: 'A new HMSI volunteer application is ready for authorised review.',
        rows: [
          { label: 'Applicant pathway', value: applicantRole === 'worker' ? 'Worker applicant' : 'Volunteer applicant' },
          { label: 'Application status', value: 'Pending review' },
          { label: 'Action required', value: 'Review the application in HMSI administration.' },
        ],
        portalUrl: 'https://www.hmsi.org.ng/admin',
        idempotencyKey: `president_volunteer_registration_${application.id}`,
      });
    } catch (alertError) {
      console.error('[Volunteer] President registration alert failed:', alertError instanceof Error ? alertError.message : 'unknown');
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[Volunteer] Failed to save application:', error);
    return NextResponse.json({ error: 'We could not save your application. Please try again.' }, { status: 500 });
  }
}
