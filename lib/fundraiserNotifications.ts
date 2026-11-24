import { sendHmsiNotification } from './hmsiNotifications';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function amount(value: number) {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

function siteUrl(path: string) {
  return `${(process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng').replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function sendFundraiserSubmissionReceived(input: { fundraiserId: string; title: string; targetAmount: number; recipientEmail: string }) {
  const title = escapeHtml(input.title);
  const target = amount(input.targetAmount);
  return sendHmsiNotification({
    sender: 'notifications',
    to: [input.recipientEmail],
    subject: 'Help Request Received — HMSI review confirmation',
    text: `Help Meet Shine Initiative has received your help request, “${input.title}”.\n\nCampaign target: ${target}\n\nYour request is queued for review. Publication is subject to verification, safeguarding, and available programme capacity. HMSI may contact you if clarification is needed.\n\nReference: ${input.fundraiserId}`,
    html: `<p>Help Meet Shine Initiative has received your help request, <strong>“${title}”</strong>.</p><p><strong>Campaign target:</strong> ${escapeHtml(target)}</p><p>Your request is queued for review. Publication is subject to verification, safeguarding, and available programme capacity. HMSI may contact you if clarification is needed.</p><p style="color:#66716a;font-size:12px">Reference: ${escapeHtml(input.fundraiserId)}</p>`,
    idempotencyKey: `fundraiser-submission-${input.fundraiserId}`,
  });
}

export async function sendFundraiserApproved(input: { fundraiserId: string; title: string; targetAmount: number; recipientEmail: string }) {
  const liveUrl = siteUrl(`/fundraise/${encodeURIComponent(input.fundraiserId)}`);
  const title = escapeHtml(input.title);
  return sendHmsiNotification({
    sender: 'notifications',
    to: [input.recipientEmail],
    subject: 'Help Request Approved — your HMSI campaign is live',
    text: `Your help request, “${input.title}”, has been approved and activated by Help Meet Shine Initiative.\n\nCampaign target: ${amount(input.targetAmount)}\nLive link: ${liveUrl}\n\nYou can share the link with trusted supporters and community partners. Please do not publish private contact details or sensitive beneficiary information on social media.\n\nHelp Meet Shine Initiative`,
    html: `<p>Your help request, <strong>“${title}”</strong>, has been approved and activated by Help Meet Shine Initiative.</p><p><strong>Campaign target:</strong> ${escapeHtml(amount(input.targetAmount))}</p><p><a href="${escapeHtml(liveUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open your live campaign</a></p><p>You can share the link with trusted supporters and community partners. Please do not publish private contact details or sensitive beneficiary information on social media.</p>`,
    idempotencyKey: `fundraiser-approval-${input.fundraiserId}`,
  });
}
