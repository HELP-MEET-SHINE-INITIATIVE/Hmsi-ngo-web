import { NextResponse } from 'next/server';
import { getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication is required.' }, { status: 401 });
  const admin = getAssistantSupabase();
  if (!admin) return NextResponse.json({ error: 'HMSI Assistant storage is not configured.' }, { status: 503 });
  const result = await admin.from('hmsi_assistant_audit_logs').select('id,actor_email,actor_role,action,document_id,manus_task_id,details,created_at').order('created_at', { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: 'The HMSI Assistant audit trail is unavailable. Apply supabase/hmsi_assistant_patch.sql first.' }, { status: 503 });
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'audit_log_listed', details: { count: result.data?.length || 0 } });
  return NextResponse.json({ logs: result.data || [] });
}
