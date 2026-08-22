import { NextResponse } from 'next/server';
import { createManusAssistantTask, getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';
import { getOperatorContext, operatorPrompt, operatorSchema } from '../../../../../lib/hmsiOperator';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

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
  let task: any;
  try { task = await createManusAssistantTask({ prompt: operatorPrompt(prompt, context), title: `HMSI operator: ${prompt.slice(0, 90)}`, structuredOutputSchema: operatorSchema }); }
  catch (cause) { const message = cause instanceof Error ? cause.message : 'Manus operator chat is unavailable.'; return error(message, message.includes('MANUS_API_KEY') ? 503 : 502); }
  if (!task?.task_id) return error('Manus did not return an operator task id.', 502);
  const record = await admin.from('hmsi_operator_actions').insert({ manus_task_id: task.task_id, requested_by: adminEmail, action_type: 'none', status: 'running', prompt }).select('id,manus_task_id,action_type,status,prompt,created_at,expires_at').single();
  if (record.error || !record.data) return error('The operator task started, but its audit record could not be saved.', 503);
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'operator_chat_started', manusTaskId: task.task_id, details: { promptLength: prompt.length } });
  return NextResponse.json({ task: record.data });
}
