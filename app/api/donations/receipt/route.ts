import { NextResponse } from 'next/server';
import { createDonorReceiptPdf } from '../../../../lib/donorReceipt';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const referencePattern = /^[A-Za-z0-9._-]{6,120}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON receipt request is required.' }, { status: 400 });
  }

  const reference = typeof body.paystack_reference === 'string' ? body.paystack_reference.trim() : '';
  const donorEmail = typeof body.donor_email === 'string' ? body.donor_email.trim().toLowerCase() : '';
  if (!referencePattern.test(reference) || !emailPattern.test(donorEmail)) {
    return NextResponse.json({ error: 'A valid Paystack reference and donor email are required.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const donation = await admin
    .from('donations')
    .select('id, fundraiser_id, donor_name, donor_email, is_anonymous, amount_ngn, amount_major, paystack_reference, status, currency, channel, paid_at, created_at')
    .eq('paystack_reference', reference)
    .eq('donor_email', donorEmail)
    .eq('status', 'success')
    .maybeSingle();

  if (donation.error) {
    console.error('[Donation Receipt] Failed to read donation:', donation.error);
    return NextResponse.json({ error: 'The receipt could not be retrieved right now.' }, { status: 503 });
  }
  if (!donation.data) return NextResponse.json({ error: 'No verified donation matched those details.' }, { status: 404 });

  let fundraiserTitle: string | null = null;
  if (donation.data.fundraiser_id) {
    const fundraiser = await admin.from('fundraisers').select('title').eq('id', donation.data.fundraiser_id).maybeSingle();
    fundraiserTitle = fundraiser.data?.title || null;
  }

  try {
    const pdf = await createDonorReceiptPdf({
      donationId: donation.data.id,
      donorName: donation.data.donor_name,
      donorEmail: donation.data.donor_email,
      isAnonymous: donation.data.is_anonymous,
      amountMajor: Number(donation.data.amount_major ?? donation.data.amount_ngn),
      currency: donation.data.currency,
      paystackReference: donation.data.paystack_reference,
      channel: donation.data.channel,
      paidAt: donation.data.paid_at,
      createdAt: donation.data.created_at,
      fundraiserTitle,
    });

    return new NextResponse(pdf as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="HMSI-donation-receipt-${reference}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[Donation Receipt] Failed to generate PDF:', error);
    return NextResponse.json({ error: 'The receipt PDF could not be generated right now.' }, { status: 500 });
  }
}
