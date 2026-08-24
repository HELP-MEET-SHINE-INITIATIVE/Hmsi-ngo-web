import type { SupabaseClient } from '@supabase/supabase-js';
import { createDonorReceiptPdf } from './donorReceipt';
import { recordDonationAcknowledgementEvent } from './donationAcknowledgements';
import { HMSI_SENDERS, verifiedDonationThankYouTemplate } from './hmsiNotifications';
import { sendResendEmailWithRetry } from './resendRetryQueue';

export const supportedDonationCurrencies = new Set(['NGN', 'USD']);
export const supportedPaymentMethods = new Set(['card', 'bank_transfer', 'manual', 'ussd']);

export type DonationRecord = {
  id: string;
  fundraiser_id: string | null;
  donor_name: string;
  donor_email: string;
  donor_phone?: string | null;
  is_anonymous: boolean;
  amount_ngn: number | null;
  amount_major: number | null;
  paystack_reference: string;
  status: string;
  currency: string;
  channel: string | null;
  payment_provider: string;
  payment_method: string | null;
  campaign_name_snapshot: string | null;
  paid_at: string | null;
  created_at: string;
};

export function cleanDonationText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function isDonationReference(value: string) {
  return /^[A-Za-z0-9._:-]{6,120}$/.test(value);
}

export function normalisePaymentMethod(value: unknown, fallback: 'card' | 'bank_transfer' | 'manual' | 'ussd') {
  const method = cleanDonationText(value, 32).toLowerCase();
  return supportedPaymentMethods.has(method) ? method : fallback;
}

export async function getFundraiserSnapshot(admin: SupabaseClient, fundraiserId: string | null) {
  if (!fundraiserId) return { fundraiserId: null, campaignName: null };
  const fundraiser = await admin.from('fundraisers').select('id,title').eq('id', fundraiserId).maybeSingle();
  if (fundraiser.error) throw new Error('Campaign lookup is temporarily unavailable.');
  if (!fundraiser.data) throw new Error('The selected campaign no longer exists.');
  return { fundraiserId: fundraiser.data.id, campaignName: fundraiser.data.title || null };
}

export async function updateFundraiserForVerifiedDonation(admin: SupabaseClient, donation: Pick<DonationRecord, 'fundraiser_id' | 'currency' | 'amount_major'>) {
  if (!donation.fundraiser_id || donation.currency !== 'NGN' || !Number.isFinite(Number(donation.amount_major))) return { updated: donation.currency !== 'NGN' };
  const result = await admin.rpc('increment_fundraiser_raised_amount', { p_fundraiser_id: donation.fundraiser_id, p_amount: Number(donation.amount_major) });
  if (result.error) throw new Error('Campaign progress could not be updated.');
  return { updated: true };
}

export async function dispatchDonationAcknowledgement(input: { admin: SupabaseClient; donation: DonationRecord; idempotencySuffix?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    await recordDonationAcknowledgementEvent({ admin: input.admin, donationId: input.donation.id, eventType: 'failed', eventSource: 'application', detail: 'mailer_not_configured' });
    return { sent: false, error: 'Receipt email delivery is not configured.' };
  }

  await recordDonationAcknowledgementEvent({ admin: input.admin, donationId: input.donation.id, eventType: 'queued', eventSource: 'application' });
  try {
    const acknowledgement = verifiedDonationThankYouTemplate({
      name: input.donation.is_anonymous ? 'supporter' : input.donation.donor_name,
      amountMajor: Number(input.donation.amount_major ?? input.donation.amount_ngn),
      currency: input.donation.currency,
      reference: input.donation.paystack_reference,
      campaignName: input.donation.campaign_name_snapshot || undefined,
    });
    const receiptPdf = await createDonorReceiptPdf({
      donationId: input.donation.id,
      donorName: input.donation.donor_name,
      donorEmail: input.donation.donor_email,
      isAnonymous: input.donation.is_anonymous,
      amountMajor: Number(input.donation.amount_major ?? input.donation.amount_ngn),
      currency: input.donation.currency,
      paystackReference: input.donation.paystack_reference,
      channel: input.donation.payment_method || input.donation.channel,
      paidAt: input.donation.paid_at,
      createdAt: input.donation.created_at,
      fundraiserTitle: input.donation.campaign_name_snapshot || null,
    });
    const result = await sendResendEmailWithRetry(apiKey, {
      from: HMSI_SENDERS.admin,
      to: [input.donation.donor_email],
      subject: `Thank You for Supporting Help Meet Shine Initiative — ${input.donation.paystack_reference}`,
      html: acknowledgement.html,
      text: acknowledgement.text,
      attachments: [{ filename: `HMSI-donation-receipt-${input.donation.paystack_reference}.pdf`, content: Buffer.from(receiptPdf).toString('base64') }],
      idempotencyKey: `donation_thank_you_${input.donation.id}_${input.idempotencySuffix || 'initial'}`,
    }, { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 2500 });
    if (!result.ok) throw new Error(result.error || 'Receipt email could not be delivered.');
    await recordDonationAcknowledgementEvent({ admin: input.admin, donationId: input.donation.id, eventType: 'sent', providerMessageId: result.resendId || null, eventSource: input.idempotencySuffix ? 'manual_reconciliation' : 'application' });
    return { sent: true, messageId: result.resendId || null };
  } catch (error) {
    await recordDonationAcknowledgementEvent({ admin: input.admin, donationId: input.donation.id, eventType: 'failed', eventSource: input.idempotencySuffix ? 'manual_reconciliation' : 'application', detail: 'dispatch_failed' });
    return { sent: false, error: error instanceof Error ? error.message : 'Receipt email could not be delivered.' };
  }
}
