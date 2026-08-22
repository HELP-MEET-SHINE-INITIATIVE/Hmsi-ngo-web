import { NextResponse } from 'next/server';
import { extractManusTaskState, getAssistantSupabase, getManusAssistantMessages, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';
import { getWorkerSessionFromCookie } from '../../../../../lib/workerSession';

export const runtime = 'nodejs';
type Params = { params: Promise<{ taskId: string }> };
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request, context: Params) {
  const session = getWorkerSessionFromCookie(request.headers.get('cookie'));
  if (!session) return error('Complete HMSI onboarding before using worker assistance.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return error('Worker assistance is temporarily unavailable.', 503);
  const { taskId } = await context.params;
  if (!taskId || taskId.length > 160) return error('Worker task id is required.');
  const task = await admin.from('hmsi_assistant_tasks').select('id,manus_task_id,requested_by_email,actor_role,worker_id,prompt_summary,status,created_at,updated_at').eq('manus_task_id', taskId).eq('requested_by_email', session.email).eq('worker_id', session.workerId).eq('actor_role', 'worker').maybeSingle();
  if (task.error) return error('Worker task could not be loaded.', 503);
  if (!task.data) return error('Worker task not found.', 404);

  let payload: any;
  try { payload = await getManusAssistantMessages(taskId); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'Manus worker assistance is temporarily unavailable.'; return error(message, 502); }
  const state = extractManusTaskState(payload);
  const nextStatus = ['running', 'waiting', 'error'].includes(state.status) ? state.status : 'stopped';
  if (nextStatus !== task.data.status) {
    await admin.from('hmsi_assistant_tasks').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', task.data.id).eq('worker_id', session.workerId);
    if (nextStatus !== 'running') await recordAssistantAudit({ actorEmail: session.email, actorRole: 'worker', action: 'worker_assistant_task_status_read', manusTaskId: taskId, details: { status: nextStatus, eventCount: state.eventCount } });
  }
  return NextResponse.json({ task: { ...task.data, status: nextStatus }, response: state.text });
}
