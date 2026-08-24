import { NextResponse } from 'next/server';
import { createManusAssistantTask, getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';
import { getOperatorContext, operatorPrompt, operatorSchema } from '../../../../../lib/hmsiOperator';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

const allowedActionTypes = ['none', 'reply_email', 'newsletter', 'publication', 'volunteer_room_post', 'worker_room_post'];

export async function POST(request: Request) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return error('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return error('HMSI Assistant storage is not configured.', 503);
  const body = await request.json().catch(() => ({}));
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (prompt.length < 2 || prompt.length > 5000) return error('Enter an administrator instruction between 2 and 5,000 characters.');
  let context: Awaited<ReturnType<typeof getOperatorContext>>;
  try { context = await getOperatorContext(admin); }
  catch { return error('The HMSI portal context could not be loaded.', 503); }
  let task: Awaited<ReturnType<typeof createManusAssistantTask>>;
  try { task = await createManusAssistantTask({ prompt: operatorPrompt(prompt, context), title: `HMSI operator: ${prompt.slice(0, 90)}`, structuredOutputSchema: operatorSchema }); }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Gemini Assistant is unavailable.';
    return error(message, message.includes('GEMINI_API_KEY') ? 503 : 502);
  }
  const structured = task.structured_output?.success && task.structured_output.value && typeof task.structured_output.value === 'object' ? task.structured_output.value as Record<string, unknown> : null;
  const actionType = String(structured?.action_type || '');
  if (!structured || !allowedActionTypes.includes(actionType)) return error(task.structured_output?.error || 'Gemini did not return a valid structured operator proposal.', 502);
  const preview = { ...structured, assistant_response: String(structured.response || task.response_text || '') };
  const record = await admin.from('hmsi_operator_actions').insert({ manus_task_id: task.task_id, requested_by: adminEmail, action_type: actionType, status: 'pending_confirmation', prompt, preview }).select('id,manus_task_id,action_type,status,prompt,preview,created_at,expires_at').single();
  if (record.error || !record.data) return error('The Gemini response was received, but its audit record could not be saved.', 503);
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_chat_started', manusTaskId: task.task_id, details: { provider: 'gemini', promptLength: prompt.length, actionType } });
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_preview_ready', manusTaskId: task.task_id, details: { provider: 'gemini', actionType, confirmationRequired: Boolean(structured.confirmation_required) } });
  return NextResponse.json({ task: record.data });
}
