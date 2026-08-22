import { getAdminEmailFromCookie } from './adminSession';
import { getSupabaseAdmin } from './supabaseAdmin';

const MANUS_API_BASE = 'https://api.manus.ai';
const MAX_DOCUMENT_CONTENT = 120_000;
const MAX_PROMPT_LENGTH = 8_000;

export function getAssistantAdminEmail(request: Request) {
  return getAdminEmailFromCookie(request.headers.get('cookie'));
}

export function getAssistantSupabase() {
  return getSupabaseAdmin();
}

export function limitDocumentContent(value: string) {
  return value.length > MAX_DOCUMENT_CONTENT ? `${value.slice(0, MAX_DOCUMENT_CONTENT)}\n\n[Document content truncated by HMSI Assistant safety limit.]` : value;
}

export function limitPrompt(value: string) {
  return value.length > MAX_PROMPT_LENGTH ? value.slice(0, MAX_PROMPT_LENGTH) : value;
}

export async function recordAssistantAudit(input: {
  actorEmail: string;
  action: string;
  actorRole?: 'admin' | 'worker';
  documentId?: string | null;
  manusTaskId?: string | null;
  details?: Record<string, unknown>;
}) {
  const admin = getAssistantSupabase();
  if (!admin) return;
  await admin.from('hmsi_assistant_audit_logs').insert({
    actor_email: input.actorEmail,
    actor_role: input.actorRole || 'admin',
    action: input.action,
    document_id: input.documentId || null,
    manus_task_id: input.manusTaskId || null,
    details: input.details || {},
  });
}

function getManusApiKey() {
  return process.env.MANUS_API_KEY?.trim();
}

async function manusRequest(path: string, init: RequestInit = {}) {
  const apiKey = getManusApiKey();
  if (!apiKey) throw new Error('MANUS_API_KEY is not configured on the HMSI server.');
  const response = await fetch(`${MANUS_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-manus-api-key': apiKey,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const message = payload?.error?.message || payload?.message || `Manus API request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

export async function createManusAssistantTask(input: { prompt: string; title: string; structuredOutputSchema?: Record<string, unknown> }) {
  return manusRequest('/v2/task.create', {
    method: 'POST',
    body: JSON.stringify({
      message: { content: limitPrompt(input.prompt) },
      title: input.title.slice(0, 160),
      agent_profile: 'manus-1.6-lite',
      hide_in_task_list: true,
      share_visibility: 'private',
      ...(input.structuredOutputSchema ? { structured_output_schema: input.structuredOutputSchema } : {}),
    }),
  });
}

export async function getManusAssistantMessages(taskId: string) {
  const query = new URLSearchParams({ task_id: taskId });
  return manusRequest(`/v2/task.listMessages?${query.toString()}`, { method: 'GET' });
}

export function extractManusTaskState(payload: any) {
  const events = Array.isArray(payload?.messages) ? payload.messages : Array.isArray(payload?.data?.messages) ? payload.data.messages : [];
  let status = 'running';
  let text = '';
  let structuredOutput: { success: boolean; value: unknown; error: string | null } | null = null;
  for (const event of events) {
    const eventType = event?.type || event?.event_type;
    if (eventType === 'structured_output_result' && event?.structured_output_result) structuredOutput = event.structured_output_result;
    if (eventType === 'status_update') {
      const nextStatus = event?.status || event?.data?.status;
      if (typeof nextStatus === 'string') status = nextStatus;
    }
    const content = event?.content ?? event?.message?.content ?? event?.data?.content;
    if (typeof content === 'string' && content.trim()) text = content.trim();
    if (Array.isArray(content)) {
      const parts = content.map((part: any) => part?.text).filter((part: unknown): part is string => typeof part === 'string');
      if (parts.length) text = parts.join('\n').trim();
    }
  }
  return { status, text, structuredOutput, eventCount: events.length };
}
