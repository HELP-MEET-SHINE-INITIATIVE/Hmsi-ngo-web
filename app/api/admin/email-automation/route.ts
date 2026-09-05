import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';

export const runtime = 'nodejs';

function adminEmail(request: Request) {
  return getAdminEmailFromCookie(request.headers.get('cookie'));
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: Request) {
  const email = adminEmail(request);
  if (!email) return errorResponse('Administrator authentication is required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return errorResponse('Supabase is not configured on the server.', 503);

  const [config, templates, outbox] = await Promise.all([
    admin.from('email_automation_config').select('mode,transactional_enabled,marketing_enabled,abandoned_donation_enabled,recurring_donor_enabled,max_batch_size,updated_by,updated_at').eq('id', true).maybeSingle(),
    admin.from('email_templates').select('key,display_name,delivery_class,status,requires_consent,requires_admin_approval,approved_by,approved_at,updated_at').order('delivery_class', { ascending: true }).order('key', { ascending: true }),
    admin.from('email_outbox').select('status,delivery_class').limit(1000),
  ]);
  if (config.error || templates.error || outbox.error || !config.data) return errorResponse('Email automation data is unavailable. Apply supabase/email_automation_patch.sql.', 503);

  const counts = (outbox.data || []).reduce<Record<string, number>>((result, row) => {
    const key = `${row.delivery_class}:${row.status}`;
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  return NextResponse.json({ config: config.data, templates: templates.data || [], outboxCounts: counts });
}

export async function POST(request: Request) {
  const email = adminEmail(request);
  if (!email) return errorResponse('Administrator authentication is required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return errorResponse('Supabase is not configured on the server.', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse('A valid JSON payload is required.');
  }

  if (body.action !== 'update_config') return errorResponse('Unsupported email automation action.');
  const mode = body.mode === 'live' || body.mode === 'paused' || body.mode === 'draft' ? body.mode : null;
  if (!mode) return errorResponse('Mode must be draft, live, or paused.');
  const transactionalEnabled = body.transactional_enabled === true;
  const marketingEnabled = body.marketing_enabled === true;
  const abandonedEnabled = body.abandoned_donation_enabled === true;
  const recurringEnabled = body.recurring_donor_enabled === true;
  if (mode === 'live' && body.confirmation !== 'ENABLE_HMSI_EMAIL_AUTOMATION') return errorResponse('Live email automation requires explicit confirmation.');
  if ((marketingEnabled || abandonedEnabled || recurringEnabled) && body.marketing_confirmation !== 'ENABLE_HMSI_MARKETING_AUTOMATION') return errorResponse('Marketing, abandoned-donation, and recurring-donor automation require explicit marketing confirmation.');
  if (mode !== 'live' && (transactionalEnabled || marketingEnabled || abandonedEnabled || recurringEnabled)) return errorResponse('Delivery flags must be disabled outside live mode.');

  const updatedAt = new Date().toISOString();
  const updated = await admin.from('email_automation_config').update({ mode, transactional_enabled: transactionalEnabled, marketing_enabled: marketingEnabled, abandoned_donation_enabled: abandonedEnabled, recurring_donor_enabled: recurringEnabled, updated_by: email, updated_at: updatedAt }).eq('id', true).select('mode,transactional_enabled,marketing_enabled,abandoned_donation_enabled,recurring_donor_enabled,max_batch_size,updated_by,updated_at').single();
  if (updated.error || !updated.data) return errorResponse('Email automation configuration could not be updated.', 503);
  return NextResponse.json({ ok: true, config: updated.data });
}
