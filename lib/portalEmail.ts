function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character); }

export async function sendPortalEmail(input: { to: string; subject: string; text: string; html?: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { sent: false, reason: 'email_not_configured' as const };
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html || `<p>${escapeHtml(input.text).replace(/\n/g, '<br>')}</p>` }) });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(payload.message || `Email delivery failed (${response.status}).`);
  return { sent: true, messageId: typeof payload.id === 'string' ? payload.id : null } as const;
}

function portalLink(path: string) { return `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hmsi.org.ng'}${path}`; }

export function assignmentEmail(input: { workerName: string; assignmentTitle: string; assignmentDescription: string; dueAt: string | null; memberNumber: string | null; activationCode?: string; activated: boolean }) {
  if (!input.memberNumber?.trim()) throw new Error('Worker ID number is required before sending an access email.');
  const idLine = `Your HMSI ID number: ${input.memberNumber.trim()}`;
  const lines = [`Hello ${input.workerName},`, '', `A new HMSI ${input.assignmentTitle} assignment has been issued to your worker portal.`, '', input.assignmentDescription, input.dueAt ? `Due: ${input.dueAt}` : 'No due date was set.', '', idLine, input.activated ? `Sign in at ${portalLink('/login')}` : `Activate your portal at ${portalLink('/portal-activate')} using your ID number and the temporary activation code included below.`, input.activationCode ? `Temporary activation code: ${input.activationCode}` : '', '', 'Never share your password or activation code. If this message was unexpected, contact HMSI through the official website.'];
  return { text: lines.filter((line, index) => line || index === 1).join('\n'), html: `<p>Hello ${escapeHtml(input.workerName)},</p><p>A new HMSI assignment has been issued to your worker portal.</p><p><strong>${escapeHtml(input.assignmentTitle)}</strong></p><p>${escapeHtml(input.assignmentDescription).replace(/\n/g, '<br>')}</p><p>${input.dueAt ? `Due: ${escapeHtml(input.dueAt)}` : 'No due date was set.'}</p><p><strong>Your HMSI ID number:</strong> ${escapeHtml(input.memberNumber.trim())}</p><p>${input.activated ? `Sign in at <a href="${portalLink('/login')}">${portalLink('/login')}</a>.` : `Activate your portal at <a href="${portalLink('/portal-activate')}">${portalLink('/portal-activate')}</a>.`}</p>${input.activationCode ? `<p><strong>Temporary activation code:</strong> ${escapeHtml(input.activationCode)}</p>` : ''}<p>Never share your password or activation code.</p>` };
}

export function accessNoticeEmail(input: { workerName: string; memberNumber: string; activated: boolean; activationCode?: string }) {
  if (!input.memberNumber.trim()) throw new Error('Worker ID number is required before sending an access email.');
  const idLine = `Your HMSI ID number: ${input.memberNumber.trim()}`;
  const text = [`Hello ${input.workerName},`, '', 'This is your HMSI portal access notice.', '', idLine, input.activated ? `Sign in at ${portalLink('/login')}.` : `Activate your portal at ${portalLink('/portal-activate')} using the temporary activation code below.`, input.activationCode ? `Temporary activation code: ${input.activationCode}` : '', '', 'Never share your password or activation code.'].filter(Boolean).join('\n');
  return { text, html: `<p>Hello ${escapeHtml(input.workerName)},</p><p>This is your HMSI portal access notice.</p><p><strong>Your HMSI ID number:</strong> ${escapeHtml(input.memberNumber.trim())}</p><p>${input.activated ? `Sign in at <a href="${portalLink('/login')}">${portalLink('/login')}</a>.` : `Activate your portal at <a href="${portalLink('/portal-activate')}">${portalLink('/portal-activate')}</a>.`}</p>${input.activationCode ? `<p><strong>Temporary activation code:</strong> ${escapeHtml(input.activationCode)}</p>` : ''}<p>Never share your password or activation code.</p>` };
}
