import { NextResponse } from 'next/server';
import { extractManusTaskState, getAssistantAdminEmail, getAssistantSupabase, getManusAssistantMessages, recordAssistantAudit } from '../../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

type Params = { params: Promise<{ taskId: string }> };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, context: Params) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);
  const { taskId } = await context.params;
  if (!taskId || taskId.length > 160) return jsonError('Task id is required.');

  const taskRecord = await admin.from('hmsi_assistant_tasks').select('id,manus_task_id,requested_by_email,prompt_summary,document_ids,status,created_at,updated_at').eq('manus_task_id', taskId).eq('requested_by_email', adminEmail).maybeSingle();
  if (taskRecord.error) return jsonError('The HMSI Assistant task could not be loaded.', 503);
  if (!taskRecord.data) return jsonError('Assistant task not found.', 404);

  let payload: any;
  try { payload = await getManusAssistantMessages(taskId); } catch (error) {
    const message = error instanceof Error ? error.message : 'Manus task status is temporarily unavailable.';
    return jsonError(message, 502);
  }
  const state = extractManusTaskState(payload);
  const normalizedStatus = ['running', 'stopped', 'waiting', 'error'].includes(state.status) ? state.status : 'running';
  if (normalizedStatus !== taskRecord.data.status) {
    await admin.from('hmsi_assistant_tasks').update({ status: normalizedStatus, updated_at: new Date().toISOString() }).eq('id', taskRecord.data.id);
    if (normalizedStatus === 'stopped' || normalizedStatus === 'error' || normalizedStatus === 'waiting') {
      await recordAssistantAudit({ actorEmail: adminEmail, action: 'assistant_task_status_read', manusTaskId: taskId, details: { status: normalizedStatus, eventCount: state.eventCount } });
    }
  }
  return NextResponse.json({ task: { ...taskRecord.data, status: normalizedStatus }, response: state.text, eventCount: state.eventCount });
}
