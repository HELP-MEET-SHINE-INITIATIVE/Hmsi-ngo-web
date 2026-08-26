import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const scopes = new Set(['people_approval', 'task_review', 'branch_operations', 'programme_operations', 'finance_review', 'compliance_review']);
const requestTypes = new Set(['governance', 'branch_activation', 'programme_activation', 'delegation', 'finance_exception', 'safeguarding_exception', 'retention_exception']);
const workflowKeys = new Set(['onboarding_readiness', 'approval_queue', 'notification_reconciliation', 'branch_data_quality']);

function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}
function email(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : '';
}
function text(value: unknown, min: number, max: number) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length >= min && normalized.length <= max ? normalized : '';
}
function optionalId(value: unknown) { return typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value.trim()) ? value.trim() : null; }

export async function GET(request: Request) {
  const president = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!president) return error('Administrator authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Governance records are unavailable.', 503);
  const [units, programmes, roles, delegations, approvals, runs] = await Promise.all([
    admin.from('operational_units').select('id,code,name,unit_type,state,country,status,activated_at,deactivated_at,created_at').order('unit_type').order('name').limit(300),
    admin.from('programmes').select('id,code,name,status,starts_at,ends_at,created_at').order('status').order('name').limit(300),
    admin.from('organization_roles').select('id,principal_email,role,operational_unit_id,programme_id,status,assigned_at,revoked_at,notes').order('assigned_at', { ascending: false }).limit(300),
    admin.from('authority_delegations').select('id,delegate_email,authority_scope,operational_unit_id,programme_id,starts_at,ends_at,status,reason,created_at,revoked_at').order('created_at', { ascending: false }).limit(300),
    admin.from('approval_requests').select('id,request_type,title,summary,operational_unit_id,programme_id,requested_by,status,decision_note,decided_by,decided_at,created_at').order('created_at', { ascending: false }).limit(300),
    admin.from('automation_runs').select('id,workflow_key,mode,status,triggered_by,summary,error_code,started_at,completed_at,created_at').order('created_at', { ascending: false }).limit(100),
  ]);
  const failed = [units, programmes, roles, delegations, approvals, runs].find((result) => result.error);
  if (failed?.error) return error('Governance records are not ready. Apply the HMSI governance foundation migration first.', 503);
  return NextResponse.json({
    president: { email: president },
    summary: {
      activeUnits: (units.data || []).filter((unit) => unit.status === 'active').length,
      activeProgrammes: (programmes.data || []).filter((programme) => programme.status === 'active').length,
      activeDelegations: (delegations.data || []).filter((delegation) => delegation.status === 'active' && new Date(delegation.ends_at).getTime() > Date.now()).length,
      pendingApprovals: (approvals.data || []).filter((approval) => approval.status === 'pending').length,
      recentAutomationRuns: runs.data?.length || 0,
    },
    units: units.data || [], programmes: programmes.data || [], roles: roles.data || [], delegations: delegations.data || [], approvals: approvals.data || [], runs: runs.data || [],
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const president = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!president) return error('Administrator authentication required.', 401);
  if (!sameOrigin(request)) return error('Cross-site governance requests are not allowed.', 403);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Governance records are unavailable.', 503);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'create_unit') {
    const code = text(body.code, 2, 40).toUpperCase(); const name = text(body.name, 2, 160); const unitType = typeof body.unitType === 'string' ? body.unitType : '';
    if (!code || !name || !['national', 'branch', 'regional_office', 'programme'].includes(unitType)) return error('A valid unit code, name, and type are required.');
    const inserted = await admin.from('operational_units').insert({ code, name, unit_type: unitType, state: text(body.state, 0, 100) || null, country: text(body.country, 2, 100) || 'Nigeria', coordinator_email: email(body.coordinatorEmail) || null, status: 'draft', created_by: president }).select('id,code,name,unit_type,status').single();
    if (inserted.error) return error(inserted.error.code === '23505' ? 'This operational-unit code already exists.' : 'The operational unit could not be created.', 409);
    return NextResponse.json({ unit: inserted.data, message: 'Operational unit created as draft; activation still requires a recorded approval.' }, { status: 201 });
  }

  if (action === 'create_programme') {
    const code = text(body.code, 2, 40).toUpperCase(); const name = text(body.name, 2, 160);
    if (!code || !name) return error('A valid programme code and name are required.');
    const inserted = await admin.from('programmes').insert({ code, name, description: text(body.description, 0, 5000) || null, lead_email: email(body.leadEmail) || null, status: 'draft', created_by: president }).select('id,code,name,status').single();
    if (inserted.error) return error(inserted.error.code === '23505' ? 'This programme code already exists.' : 'The programme could not be created.', 409);
    return NextResponse.json({ programme: inserted.data, message: 'Programme created as draft; activation still requires a recorded approval.' }, { status: 201 });
  }

  if (action === 'create_delegation') {
    const delegateEmail = email(body.delegateEmail); const authorityScope = typeof body.authorityScope === 'string' ? body.authorityScope : ''; const reason = text(body.reason, 3, 1000); const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : null;
    if (!delegateEmail || !scopes.has(authorityScope) || !reason || !endsAt || !Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= Date.now()) return error('A delegate email, valid scope, reason, and future end date are required.');
    const inserted = await admin.from('authority_delegations').insert({ delegated_by: president, delegate_email: delegateEmail, authority_scope: authorityScope, operational_unit_id: optionalId(body.operationalUnitId), programme_id: optionalId(body.programmeId), ends_at: endsAt.toISOString(), reason }).select('id,delegate_email,authority_scope,status,ends_at').single();
    if (inserted.error) return error('The delegation could not be recorded.', 503);
    return NextResponse.json({ delegation: inserted.data, message: 'Delegation recorded. It is an auditable authority register and does not bypass the existing administrator sign-in boundary.' }, { status: 201 });
  }

  if (action === 'create_approval_request') {
    const requestType = typeof body.requestType === 'string' ? body.requestType : ''; const title = text(body.title, 3, 200); const summary = text(body.summary, 3, 5000);
    if (!requestTypes.has(requestType) || !title || !summary) return error('A valid request type, title, and summary are required.');
    const inserted = await admin.from('approval_requests').insert({ request_type: requestType, title, summary, operational_unit_id: optionalId(body.operationalUnitId), programme_id: optionalId(body.programmeId), requested_by: president }).select('id,request_type,title,status,created_at').single();
    if (inserted.error || !inserted.data) return error('The approval request could not be created.', 503);
    await admin.from('approval_events').insert({ approval_request_id: inserted.data.id, actor_email: president, action: 'created', note: 'Created through the protected President governance workspace.' });
    return NextResponse.json({ approval: inserted.data }, { status: 201 });
  }

  if (action === 'decide_approval') {
    const requestId = optionalId(body.requestId); const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : ''; const note = text(body.note, 3, 5000);
    if (!requestId || !decision || !note) return error('A pending approval request, decision, and rationale are required.');
    const updated = await admin.from('approval_requests').update({ status: decision, decision_note: note, decided_by: president, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', requestId).eq('status', 'pending').select('id,status,decided_at').maybeSingle();
    if (updated.error || !updated.data) return error('This approval request is no longer pending or could not be decided.', 409);
    await admin.from('approval_events').insert({ approval_request_id: requestId, actor_email: president, action: decision, note });
    return NextResponse.json({ approval: updated.data });
  }

  if (action === 'record_dry_run') {
    const workflowKey = typeof body.workflowKey === 'string' ? body.workflowKey : '';
    if (!workflowKeys.has(workflowKey)) return error('A valid governance workflow is required.');
    const inserted = await admin.from('automation_runs').insert({ workflow_key: workflowKey, mode: 'dry_run', status: 'completed', triggered_by: president, idempotency_key: `${workflowKey}:dry-run:${randomUUID()}`, summary: { notice: 'Manual dry run recorded. No notification, task, approval, or data change was executed.' }, started_at: new Date().toISOString(), completed_at: new Date().toISOString() }).select('id,workflow_key,mode,status,created_at').single();
    if (inserted.error) return error('The automation dry run could not be recorded.', 503);
    return NextResponse.json({ run: inserted.data, message: 'Dry run recorded. No recurring schedule or outbound message was enabled.' }, { status: 201 });
  }

  return error('Unsupported governance action.');
}
