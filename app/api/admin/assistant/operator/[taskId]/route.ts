import { NextResponse } from 'next/server';
import { extractManusTaskState, getAssistantAdminEmail, getAssistantSupabase, getManusAssistantMessages, recordAssistantAudit } from '../../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return error('Admin authentication is required.', 401);
  const { taskId } = await context.params;
  const admin = getAssistantSupabase();
  if (!admin) return error('HMSI Assistant storage is not configured.', 503);
  const action = await admin.from('hmsi_operator_actions').select('id,manus_task_id,requested_by,action_type,status,prompt,preview,result,error_message,created_at,updated_at,expires_at,confirmed_at,executed_at').eq('manus_task_id', taskId).eq('requested_by', adminEmail).maybeSingle();
  if (action.error || !action.data) return error('Operator task not found.', 404);
  if (new Date(action.data.expires_at).getTime() < Date.now() && ['running', 'pending_confirmation'].includes(action.data.status)) {
    await admin.from('hmsi_operator_actions').update({ status: 'error', error_message: 'This operator preview expired before confirmation.', updated_at: new Date().toISOString() }).eq('id', action.data.id);
    return NextResponse.json({ action: { ...action.data, status: 'error', error_message: 'This operator preview expired before confirmation.' } });
  }
  if (!['running', 'pending_confirmation'].includes(action.data.status)) return NextResponse.json({ action: action.data });
  let messages: any;
  try { messages = await getManusAssistantMessages(taskId); } catch { return error('The Manus operator response is temporarily unavailable.', 502); }
  const state = extractManusTaskState(messages);
  const structured = state.structuredOutput?.success ? state.structuredOutput.value as Record<string, unknown> : null;
  const terminal = ['stopped', 'error', 'waiting', 'completed', 'succeeded', 'success'].includes(state.status);
  if (!terminal && !structured) return NextResponse.json({ action: action.data, response: state.text, taskStatus: state.status });
  if (!structured || !['none', 'reply_email', 'newsletter', 'publication', 'volunteer_room_post', 'worker_room_post'].includes(String(structured.action_type))) {
    const updated = await admin.from('hmsi_operator_actions').update({ status: terminal ? 'error' : 'running', error_message: terminal ? 'Manus did not return a valid structured operator proposal.' : null, updated_at: new Date().toISOString() }).eq('id', action.data.id).select('id,manus_task_id,action_type,status,prompt,error_message,created_at,expires_at').single();
    return NextResponse.json({ action: updated.data || action.data, response: state.text, taskStatus: state.status });
  }
  const actionType = String(structured.action_type);
  const nextStatus = actionType === 'none' ? 'pending_confirmation' : 'pending_confirmation';
  const preview = { ...structured, assistant_response: String(structured.response || state.text || '') };
  const updated = await admin.from('hmsi_operator_actions').update({ action_type: actionType, status: nextStatus, preview, updated_at: new Date().toISOString() }).eq('id', action.data.id).select('id,manus_task_id,action_type,status,prompt,preview,created_at,expires_at').single();
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_preview_ready', manusTaskId: taskId, details: { actionType, confirmationRequired: Boolean(structured.confirmation_required) } });
  return NextResponse.json({ action: updated.data || action.data, response: state.text, taskStatus: state.status });
}
