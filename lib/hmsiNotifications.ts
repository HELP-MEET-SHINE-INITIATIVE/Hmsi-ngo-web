import { sendResendEmailWithRetry } from './resendRetryQueue';

export const HMSI_SENDERS = {
  admin: 'HMSI Administration <admin@hmsi.org.ng>',
  onboarding: 'HMSI Onboarding <onboarding@hmsi.org.ng>',
  noreply: 'HMSI Portal <noreply@hmsi.org.ng>',
  president: 'HMSI President\'s Office <president@hmsi.org.ng>',
} as const;

export const PRESIDENT_EMAIL = 'president@hmsi.org.ng';

export type HmsiSender = keyof typeof HMSI_SENDERS;
export type HmsiAlertRow = { label: string; value: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function officialShell(input: { eyebrow: string; title: string; body: string; footer?: string }) {
  return `<div style="margin:0;padding:32px 16px;background:#f4f5f1;font-family:Arial,Helvetica,sans-serif;color:#17221e"><div style="max-width:680px;margin:0 auto;background:#ffffff;border-top:5px solid #1e5b49"><div style="padding:30px 32px 12px"><p style="margin:0 0 10px;color:#a76032;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p><h1 style="margin:0;color:#17221e;font-size:27px;line-height:1.2">${escapeHtml(input.title)}</h1></div><div style="padding:8px 32px 30px;font-size:15px;line-height:1.65">${input.body}</div><div style="padding:18px 32px;background:#f6f7f3;color:#5a655e;font-size:12px;line-height:1.5">${input.footer || 'Help Meet Shine Initiative (HMSI) · Official automated correspondence'}</div></div></div>`;
}

function textRows(rows: HmsiAlertRow[]) {
  return rows.map((row) => `${row.label}: ${row.value}`).join('\n');
}

export function passwordResetTemplate(input: { resetUrl?: string } = {}) {
  const resetUrl = input.resetUrl || '{{ .ConfirmationURL }}';
  const html = officialShell({
    eyebrow: 'HMSI Portal Security',
    title: 'Reset your portal password',
    body: `<p style="margin-top:0">You requested a password reset for your HMSI portal access.</p><p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Reset my password</a></p><p>If you did not request this change, you can safely ignore this email. Do not forward the link or share your password with anyone.</p>`,
    footer: 'This security email was sent from HMSI Portal. For assistance, use the official HMSI website.',
  });
  return { html, text: `HMSI Portal password reset\n\nUse this secure link to reset your password: ${resetUrl}\n\nIf you did not request this, ignore this email. Never share your password or reset link.` };
}

export function workerWelcomeTemplate(input: { name: string; role: 'worker' | 'volunteer' | 'member'; dashboardUrl: string }) {
  const roleLabel = input.role === 'worker' ? 'worker' : input.role === 'volunteer' ? 'volunteer' : 'member';
  const html = officialShell({
    eyebrow: 'HMSI Onboarding',
    title: 'Welcome to Help Meet Shine Initiative',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>Your HMSI ${roleLabel} status is now active. Please complete your onboarding and review your current portal information.</p><p><a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open my HMSI portal</a></p><p>This secure onboarding link is personal to you. Please do not forward it.</p>`,
    footer: 'HMSI Onboarding · Official member, worker, and volunteer correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nWelcome to Help Meet Shine Initiative. Your HMSI ${roleLabel} status is active. Complete your onboarding here: ${input.dashboardUrl}\n\nDo not forward this secure link.` };
}

export function volunteerAssignmentTemplate(input: { name: string; title: string; priority: string; dueAt: string | null; dashboardUrl: string }) {
  const due = input.dueAt ? new Date(input.dueAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date was set';
  const html = officialShell({
    eyebrow: 'HMSI Volunteer Assignment',
    title: 'A new volunteer assignment is ready',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>HMSI has assigned you a new volunteer task: <strong>${escapeHtml(input.title)}</strong>.</p><p><strong>Priority:</strong> ${escapeHtml(input.priority)}<br /><strong>Due:</strong> ${escapeHtml(due)}</p><p><a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open my volunteer tasks</a></p><p>Please use the protected HMSI portal to accept the task, follow the required outcome, and submit any requested private proof link. Do not reply with proof or personal information by email.</p>`,
    footer: 'HMSI Onboarding · Official volunteer assignment correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nHMSI has assigned you a new volunteer task: ${input.title}.\nPriority: ${input.priority}\nDue: ${due}\n\nOpen your protected volunteer tasks: ${input.dashboardUrl}\n\nPlease submit any required proof through the portal, not by email.` };
}

export function passwordSetupTemplate(input: { name: string; hmsiId: string; setupUrl: string }) {
  const html = officialShell({
    eyebrow: 'HMSI Portal Activation',
    title: 'Your HMSI ID and password setup link',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>Your onboarding is complete. Your assigned HMSI ID is:</p><p style="font-size:20px;font-weight:700;letter-spacing:0.5px">${escapeHtml(input.hmsiId)}</p><p><a href="${escapeHtml(input.setupUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Set my portal password</a></p><p>This one-time link expires in 7 days. Do not forward it or share your password. If you did not expect this email, contact HMSI through the official website.</p>`,
    footer: 'HMSI Portal · Official one-time account setup correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nYour HMSI onboarding is complete. Your HMSI ID is ${input.hmsiId}.\n\nSet your portal password with this one-time link (expires in 7 days): ${input.setupUrl}\n\nDo not forward this link or share your password.` };
}

export function verifiedDonationThankYouTemplate(input: { name: string; amountMajor: number; currency: string; reference: string; campaignName?: string }) {
  const currency = input.currency === 'USD' ? 'USD' : 'NGN';
  const amount = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(input.amountMajor);
  const referenceSuffix = input.reference ? `…${input.reference.slice(-6)}` : 'not available';
  const campaign = input.campaignName ? ` for <strong>${escapeHtml(input.campaignName)}</strong>` : '';
  const campaignText = input.campaignName ? ` Campaign: ${input.campaignName}.` : '';
  const html = officialShell({
    eyebrow: 'HMSI Donation Acknowledgement',
    title: 'Thank you for your verified donation',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>Thank you for your verified donation of <strong>${escapeHtml(amount)}</strong>${campaign} to Help Meet Shine Initiative. Your support helps HMSI respond with dignity, strengthen local solutions, and sustain practical community work.</p><p><strong>Receipt summary:</strong> Amount ${escapeHtml(amount)} · Currency ${escapeHtml(currency)} · Reference ending ${escapeHtml(referenceSuffix)}${campaign ? ` · Campaign ${escapeHtml(input.campaignName || '')}` : ''}.</p><p>Your verified payment is recorded in the protected HMSI donation ledger, and your acknowledgement is attached for your records.</p><p>This acknowledgement confirms a verified payment. It is not a tax-exemption certificate or a statement that the donation is tax-deductible.</p><p style="margin-bottom:0">With appreciation,<br /><strong>Help Meet Shine Initiative</strong></p>`,
    footer: 'HMSI Administration · Official verified-donation correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nThank you for your verified donation of ${amount}${input.campaignName ? ` for ${input.campaignName}` : ''} to Help Meet Shine Initiative. Your payment has been confirmed. Receipt summary: Amount ${amount}; currency ${currency}; reference ending ${referenceSuffix}.${campaignText} Your acknowledgement is attached.\n\nThis acknowledgement confirms a verified payment. It is not a tax-exemption certificate or a statement that the donation is tax-deductible.\n\nWith appreciation,\nHelp Meet Shine Initiative` };
}

export function editorialRevisionRequestedTemplate(input: { name: string; headline: string; feedback: string; workspaceUrl: string }) {
  const html = officialShell({
    eyebrow: 'HMSI Editorial Team',
    title: 'Revisions requested for your dispatch',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>The HMSI Editorial Team has requested revisions for your dispatch <strong>${escapeHtml(input.headline)}</strong>.</p><p><strong>Editor feedback:</strong> ${escapeHtml(input.feedback)}</p><p><a href="${escapeHtml(input.workspaceUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Revise my dispatch</a></p><p>Please use the protected publisher workspace to revise and re-submit your dispatch for review.</p>`,
    footer: 'HMSI Administration · Official editorial correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nHMSI Editorial Team has requested revisions for your dispatch: ${input.headline}.\n\nEditor feedback: ${input.feedback}\n\nRevise and re-submit: ${input.workspaceUrl}` };
}

export function hmsiDriveFilesIngestedTemplate(input: { name: string; submissionsUrl: string }) {
  const html = officialShell({
    eyebrow: 'HMSI File Intake',
    title: 'Your submitted files have been archived',
    body: `<p style="margin-top:0">Dear ${escapeHtml(input.name)},</p><p>HMSI administration has confirmed that your submitted files have been secured in the approved HMSI archive.</p><p>Your portal status now shows <strong>Files Ingested / Downloaded</strong>. You may keep the original files in your personal Google Drive or delete them if you need to free storage.</p><p><a href="${escapeHtml(input.submissionsUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open my file submissions</a></p><p>Please do not send replacement files unless HMSI administration asks you to do so.</p>`,
    footer: 'HMSI Administration · Official secure file-intake correspondence',
  });
  return { html, text: `Dear ${input.name},\n\nHMSI administration has confirmed that your submitted files have been secured in the approved HMSI archive. Your portal now shows Files Ingested / Downloaded. You may keep or delete the original files from your personal Google Drive.\n\nOpen your submissions: ${input.submissionsUrl}` };
}

export function presidentAlertTemplate(input: { title: string; summary: string; rows: HmsiAlertRow[]; portalUrl?: string }) {
  const rows = input.rows.map((row) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e6df;color:#66716a;width:42%">${escapeHtml(row.label)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e6df;color:#17221e;font-weight:700">${escapeHtml(row.value)}</td></tr>`).join('');
  const portal = input.portalUrl ? `<p><a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#1e5b49;color:#ffffff;padding:12px 18px;text-decoration:none;font-weight:700">Open HMSI administration</a></p>` : '';
  const html = officialShell({
    eyebrow: 'HMSI Executive Notice',
    title: input.title,
    body: `<p style="margin-top:0">Dear Mr. President,</p><p>${escapeHtml(input.summary)}</p><table style="width:100%;border-collapse:collapse;font-size:14px;margin:22px 0">${rows}</table>${portal}<p style="margin-bottom:0;color:#5a655e">This is an internal operational alert. Review the administration portal for any authorised follow-up.</p>`,
    footer: 'HMSI President\'s Office · Internal automated executive correspondence',
  });
  return { html, text: `Dear Mr. President,\n\n${input.title}\n${input.summary}\n\n${textRows(input.rows)}${input.portalUrl ? `\n\nOpen HMSI administration: ${input.portalUrl}` : ''}` };
}

export async function sendHmsiNotification(input: { sender: HmsiSender; to: string[]; subject: string; html: string; text: string; idempotencyKey?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: 'email_not_configured' as const };
  const result = await sendResendEmailWithRetry(apiKey, {
    from: HMSI_SENDERS[input.sender],
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    idempotencyKey: input.idempotencyKey,
  }, { maxRetries: 3, baseDelayMs: 200, maxDelayMs: 2500 });
  if (!result.ok) throw new Error(result.error || 'HMSI email delivery failed.');
  return { sent: true, messageId: result.resendId || null } as const;
}

export async function sendPresidentInternalAlert(input: { title: string; summary: string; rows: HmsiAlertRow[]; portalUrl?: string; idempotencyKey: string }) {
  const content = presidentAlertTemplate(input);
  return sendHmsiNotification({ sender: 'president', to: [PRESIDENT_EMAIL], subject: `[HMSI Executive] ${input.title}`, ...content, idempotencyKey: input.idempotencyKey });
}
