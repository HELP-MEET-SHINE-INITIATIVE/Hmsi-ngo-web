import { randomUUID } from 'node:crypto';
import { getAdminEmailFromCookie } from './adminSession';
import { getSupabaseAdmin } from './supabaseAdmin';

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_DOCUMENT_CONTENT = 120_000;
const MAX_PROMPT_LENGTH = 8_000;

type GeminiContentPart = { text: string };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiContentPart[] }; finishReason?: string }>;
  error?: { message?: string };
};

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

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim();
}

function schemaForGemini(schema: Record<string, unknown>): Record<string, unknown> {
  const type = schema.type;
  if (Array.isArray(type)) {
    const nonNullType = type.find((item) => item !== 'null');
    return { ...schema, type: nonNullType, nullable: true };
  }
  if (schema.properties && typeof schema.properties === 'object') {
    return {
      ...schema,
      properties: Object.fromEntries(Object.entries(schema.properties as Record<string, unknown>).map(([key, value]) => [key, schemaForGemini(value as Record<string, unknown>)])),
    };
  }
  if (schema.items && typeof schema.items === 'object') return { ...schema, items: schemaForGemini(schema.items as Record<string, unknown>) };
  return schema;
}

function extractGeminiText(payload: GeminiResponse) {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('\n').trim() || '';
}

function parseStructured(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    return { success: true, value: parsed, error: null } as const;
  } catch {
    return { success: false, value: null, error: 'Gemini returned a non-JSON response for a structured request.' } as const;
  }
}

async function geminiRequest(input: { prompt: string; structuredOutputSchema?: Record<string, unknown> }) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the HMSI server.');
  const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: limitPrompt(input.prompt) }] }],
      generationConfig: {
        temperature: 0.2,
        ...(input.structuredOutputSchema ? { responseMimeType: 'application/json', responseSchema: schemaForGemini(input.structuredOutputSchema) } : {}),
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({})) as GeminiResponse;
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `Gemini API request failed (${response.status}).`);
  const text = extractGeminiText(payload);
  if (!text) throw new Error('Gemini returned an empty response.');
  return { text, structuredOutput: input.structuredOutputSchema ? parseStructured(text) : null };
}

/**
 * The public name is retained for compatibility with existing HMSI routes.
 * The implementation now uses Gemini and returns a local task-shaped result;
 * no provider credential is exposed to the browser.
 */
export async function createManusAssistantTask(input: { prompt: string; title: string; structuredOutputSchema?: Record<string, unknown> }) {
  const result = await geminiRequest(input);
  return {
    task_id: randomUUID(),
    task_url: null,
    provider: 'gemini',
    response_text: result.text,
    structured_output: result.structuredOutput,
  };
}

/** @deprecated Kept only for legacy task routes that still reference the old provider. */
export async function getManusAssistantMessages(_taskId: string) {
  throw new Error('Legacy Manus task polling is disabled; Gemini responses are returned synchronously.');
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
