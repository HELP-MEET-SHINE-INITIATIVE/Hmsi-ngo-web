import { getSupabaseAdmin } from './supabaseAdmin';
import { sendHmsiNotification } from './hmsiNotifications';

export type EmailDeliveryClass = 'transactional' | 'marketing';
export type EmailTemplateKey =
  | 'onboarding_access'
  | 'volunteer_approval'
  | 'task_assignment'
  | 'task_reminder'
  | 'task_completion'
  | 'editorial_decision'
  | 'donation_receipt'
  | 'abandoned_donation_followup'
  | 'recurring_donor_stewardship'
  | 'newsletter_launch'
  | 'operations_alert';

export type QueueEmailInput = {
  idempotencyKey: string;
  templateKey: EmailTemplateKey;
  deliveryClass: EmailDeliveryClass;
  recipientEmail: string;
  recipientName?: string | null;
  variables: Record<string, string | number | null | undefined>;
  sourceType?: string | null;
  sourceId?: string | null;
  scheduledFor?: string | null;
};

export type QueueEmailResult =
  | { queued: true; status: 'draft' | 'queued'; outboxId: string; created: boolean }
  | { queued: false; reason: 'consent_required' | 'suppressed' | 'automation_paused' };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeEmail = (value: string) => value.trim().toLowerCase();

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character);
}

function renderTemplate(template: string, variables: Record<string, string | number | null | undefined>, html: boolean) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined) return '';
    return html ? escapeHtml(String(value)) : String(value);
  });
}

function sanitizeProviderError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('rate') || message.includes('429')) return 'provider_rate_limited';
    if (message.includes('timeout') || message.includes('network') || message.includes('fetch')) return 'provider_transient_failure';
    if (message.includes('configured')) return 'provider_not_configured';
  }
  return 'provider_delivery_failed';
}

function isEnabled(config: { mode: string; transactional_enabled: boolean; marketing_enabled: boolean }, deliveryClass: EmailDeliveryClass) {
  if (config.mode === 'paused') return false;
  return deliveryClass === 'transactional' ? config.transactional_enabled : config.marketing_enabled;
}

export async function queueHmsiEmail(input: QueueEmailInput): Promise<QueueEmailResult> {
  const email = safeEmail(input.recipientEmail);
  if (!emailPattern.test(email) || email.length > 320) throw new Error('email_automation:invalid_recipient');
  if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 240) throw new Error('email_automation:invalid_idempotency_key');

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('email_automation:supabase_unavailable');

  const configResult = await admin.from('email_automation_config').select('mode,transactional_enabled,marketing_enabled').eq('id', true).maybeSingle();
  if (configResult.error || !configResult.data) throw new Error('email_automation:config_unavailable');
  const config = configResult.data;
  if (config.mode === 'paused') return { queued: false, reason: 'automation_paused' };

  const templateResult = await admin.from('email_templates').select('key,delivery_class,subject_template,text_template,html_template,status,requires_consent').eq('key', input.templateKey).maybeSingle();
  if (templateResult.error || !templateResult.data || templateResult.data.status === 'disabled') throw new Error('email_automation:template_unavailable');
  const template = templateResult.data;
  if (template.delivery_class !== input.deliveryClass) throw new Error('email_automation:template_class_mismatch');
  if (template.status !== 'approved' && input.deliveryClass === 'marketing') return { queued: false, reason: 'automation_paused' };

  const contactResult = await admin.from('email_contacts').select('marketing_opt_in,transactional_opt_in,unsubscribed_at,suppressed_at').eq('email', email).maybeSingle();
  if (contactResult.error) throw new Error('email_automation:contact_lookup_failed');
  const contact = contactResult.data;
  if (contact?.suppressed_at) return { queued: false, reason: 'suppressed' };
  if (input.deliveryClass === 'marketing' || template.requires_consent) {
    if (!contact?.marketing_opt_in || contact.unsubscribed_at) return { queued: false, reason: 'consent_required' };
  } else if (contact && contact.transactional_opt_in === false) {
    return { queued: false, reason: 'consent_required' };
  }

  const status = isEnabled(config, input.deliveryClass) ? 'queued' : 'draft';
  const insertResult = await admin.from('email_outbox').insert({
    idempotency_key: input.idempotencyKey,
    template_key: input.templateKey,
    delivery_class: input.deliveryClass,
    recipient_email: email,
    recipient_name: input.recipientName || null,
    subject: renderTemplate(template.subject_template, input.variables, false).slice(0, 240),
    text_body: renderTemplate(template.text_template, input.variables, false),
    html_body: renderTemplate(template.html_template, input.variables, true),
    source_type: input.sourceType || null,
    source_id: input.sourceId || null,
    status,
    scheduled_for: input.scheduledFor || null,
  }).select('id,status').maybeSingle();

  if (insertResult.error && insertResult.error.code !== '23505') throw new Error('email_automation:outbox_insert_failed');
  if (!insertResult.data) {
    const existing = await admin.from('email_outbox').select('id,status').eq('idempotency_key', input.idempotencyKey).maybeSingle();
    if (existing.error || !existing.data) throw new Error('email_automation:outbox_lookup_failed');
    return { queued: true, status: existing.data.status, outboxId: existing.data.id, created: false };
  }
  return { queued: true, status: insertResult.data.status, outboxId: insertResult.data.id, created: true };
}

export async function queueDueAbandonedDonationFollowups() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('email_automation:supabase_unavailable');
  const configResult = await admin.from('email_automation_config').select('mode,abandoned_donation_enabled').eq('id', true).maybeSingle();
  if (configResult.error || !configResult.data) throw new Error('email_automation:config_unavailable');
  if (configResult.data.mode !== 'live' || !configResult.data.abandoned_donation_enabled) return { queued: 0, skipped: 'disabled' as const };

  const now = Date.now();
  const oneHourCutoff = new Date(now - 60 * 60 * 1000).toISOString();
  const sessions = await admin.from('donation_checkout_sessions').select('id,checkout_reference,donor_email,donor_name,amount_major,currency,followup_1h_outbox_id,followup_24h_outbox_id,started_at').eq('status', 'started').lte('started_at', oneHourCutoff).is('completed_at', null).limit(100);
  if (sessions.error) throw new Error('email_automation:abandoned_session_read_failed');

  let queued = 0;
  for (const session of sessions.data || []) {
    const contact = await admin.from('email_contacts').select('unsubscribe_token,marketing_opt_in,unsubscribed_at,suppressed_at').eq('email', session.donor_email).maybeSingle();
    if (contact.error || !contact.data?.marketing_opt_in || contact.data.unsubscribed_at || contact.data.suppressed_at) continue;
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng').replace(/\/+$/, '');
    const variables = { name: session.donor_name || 'HMSI supporter', donation_url: `${baseUrl}/#donate`, unsubscribe_url: `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(contact.data.unsubscribe_token)}`, amount: session.amount_major ? `${session.currency} ${session.amount_major}` : 'your selected amount' };

    if (!session.followup_1h_outbox_id && new Date(session.started_at).getTime() <= now - 60 * 60 * 1000) {
      const result = await queueHmsiEmail({ idempotencyKey: `abandoned-donation-1h-${session.id}`, templateKey: 'abandoned_donation_followup', deliveryClass: 'marketing', recipientEmail: session.donor_email, recipientName: session.donor_name, variables, sourceType: 'donation_checkout', sourceId: session.id });
      if (result.queued) {
        await admin.from('donation_checkout_sessions').update({ followup_1h_outbox_id: result.outboxId }).eq('id', session.id).is('followup_1h_outbox_id', null);
        queued += result.created ? 1 : 0;
      }
    }

    if (!session.followup_24h_outbox_id && new Date(session.started_at).getTime() <= now - 24 * 60 * 60 * 1000) {
      const result = await queueHmsiEmail({ idempotencyKey: `abandoned-donation-24h-${session.id}`, templateKey: 'abandoned_donation_followup', deliveryClass: 'marketing', recipientEmail: session.donor_email, recipientName: session.donor_name, variables, sourceType: 'donation_checkout', sourceId: session.id });
      if (result.queued) {
        await admin.from('donation_checkout_sessions').update({ followup_24h_outbox_id: result.outboxId, status: 'abandoned', abandoned_at: new Date().toISOString() }).eq('id', session.id).is('followup_24h_outbox_id', null);
        queued += result.created ? 1 : 0;
      }
    }
  }
  return { queued };
}

export async function queueDueRecurringDonorStewardship() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('email_automation:supabase_unavailable');
  const configResult = await admin.from('email_automation_config').select('mode,recurring_donor_enabled').eq('id', true).maybeSingle();
  if (configResult.error || !configResult.data) throw new Error('email_automation:config_unavailable');
  if (configResult.data.mode !== 'live' || !configResult.data.recurring_donor_enabled) return { queued: 0, skipped: 'disabled' as const };

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const preferences = await admin.from('recurring_donor_preferences').select('id,donor_email,last_stewardship_sent_at').eq('active', true).eq('stewardship_opt_in', true).or(`last_stewardship_sent_at.is.null,last_stewardship_sent_at.lte.${cutoff}`).limit(100);
  if (preferences.error) throw new Error('email_automation:recurring_donor_read_failed');
  let queued = 0;
  for (const preference of preferences.data || []) {
    const contact = await admin.from('email_contacts').select('unsubscribe_token,marketing_opt_in,unsubscribed_at,suppressed_at').eq('email', preference.donor_email).maybeSingle();
    if (contact.error || !contact.data?.marketing_opt_in || contact.data.unsubscribed_at || contact.data.suppressed_at) continue;
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.hmsi.org.ng').replace(/\/+$/, '');
    const result = await queueHmsiEmail({ idempotencyKey: `recurring-donor-stewardship-${preference.id}-${new Date().toISOString().slice(0, 7)}`, templateKey: 'recurring_donor_stewardship', deliveryClass: 'marketing', recipientEmail: preference.donor_email, variables: { preferences_url: `${baseUrl}/donate`, unsubscribe_url: `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(contact.data.unsubscribe_token)}` }, sourceType: 'recurring_donor', sourceId: preference.id });
    if (result.queued && result.created) {
      await admin.from('recurring_donor_preferences').update({ last_stewardship_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', preference.id).eq('stewardship_opt_in', true);
      queued += 1;
    }
  }
  return { queued };
}

export async function processHmsiEmailOutbox(limit = 50) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('email_automation:supabase_unavailable');
  const configResult = await admin.from('email_automation_config').select('mode,transactional_enabled,marketing_enabled,max_batch_size').eq('id', true).maybeSingle();
  if (configResult.error || !configResult.data) throw new Error('email_automation:config_unavailable');
  const config = configResult.data;
  if (config.mode !== 'live' || (!config.transactional_enabled && !config.marketing_enabled)) return { processed: 0, sent: 0, failed: 0, skipped: 'draft_mode' as const };

  const batchLimit = Math.min(Math.max(1, Math.floor(limit)), config.max_batch_size || 50);
  const due = await admin.from('email_outbox').select('id,delivery_class,recipient_email,subject,text_body,html_body,attempts').eq('status', 'queued').or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`).order('created_at', { ascending: true }).limit(batchLimit);
  if (due.error) throw new Error('email_automation:outbox_read_failed');

  let sent = 0;
  let failed = 0;
  for (const row of due.data || []) {
    if (row.delivery_class === 'transactional' ? !config.transactional_enabled : !config.marketing_enabled) continue;
    const contact = await admin.from('email_contacts').select('marketing_opt_in,transactional_opt_in,unsubscribed_at,suppressed_at').eq('email', row.recipient_email).maybeSingle();
    if (contact.error) continue;
    const suppressed = Boolean(contact.data?.suppressed_at || contact.data?.unsubscribed_at || (row.delivery_class === 'marketing' ? !contact.data?.marketing_opt_in : contact.data?.transactional_opt_in === false));
    if (suppressed) {
      await admin.from('email_outbox').update({ status: 'suppressed', last_error: null, updated_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'queued');
      continue;
    }
    const claimed = await admin.from('email_outbox').update({ status: 'sending', attempts: (row.attempts || 0) + 1, updated_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'queued').select('id').maybeSingle();
    if (claimed.error || !claimed.data) continue;
    try {
      const result = await sendHmsiNotification({ sender: 'notifications', to: [row.recipient_email], subject: row.subject, text: row.text_body, html: row.html_body, idempotencyKey: `hmsi-outbox-${row.id}` });
      if (!result.sent) {
        await admin.from('email_outbox').update({ status: 'failed', last_error: 'provider_not_configured', updated_at: new Date().toISOString() }).eq('id', row.id);
        failed += 1;
        continue;
      }
      await admin.from('email_outbox').update({ status: 'sent', provider_message_id: result.messageId, sent_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: null }).eq('id', row.id);
      sent += 1;
    } catch (error) {
      await admin.from('email_outbox').update({ status: 'failed', last_error: sanitizeProviderError(error), updated_at: new Date().toISOString() }).eq('id', row.id);
      failed += 1;
    }
  }
  return { processed: (due.data || []).length, sent, failed };
}
