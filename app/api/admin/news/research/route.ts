import { NextResponse } from 'next/server';
import { createManusAssistantTask, getAssistantAdminEmail, getAssistantSupabase, limitPrompt, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

const humanitarianNewsSchema = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
          body: { type: 'string' },
          category: { type: 'string' },
          region: { type: 'string' },
          source_name: { type: 'string' },
          source_url: { type: 'string' },
          source_urls: { type: 'array', items: { type: 'string' } },
          source_published_at: { type: ['string', 'null'] },
          verification_status: { type: 'string', enum: ['candidate', 'source_checked'] },
          verification_notes: { type: 'string' },
          verified_source_count: { type: 'integer' },
        },
        required: ['headline', 'summary', 'body', 'category', 'region', 'source_name', 'source_url', 'source_urls', 'source_published_at', 'verification_status', 'verification_notes', 'verified_source_count'],
        additionalProperties: false,
      },
    },
  },
  required: ['candidates'],
  additionalProperties: false,
} as const;

function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);
  const body = await request.json().catch(() => ({}));
  const scope = typeof body.scope === 'string' ? body.scope.trim() : 'Global humanitarian developments from the last seven days, prioritising active crises and practical humanitarian response updates.';
  if (scope.length < 10 || scope.length > 500) return jsonError('Research scope must be between 10 and 500 characters.');

  const prompt = [
    'You are the HMSI global humanitarian-news research assistant. Investigate current humanitarian developments around the world for the scope below.',
    'Use web research and cite the original page URL for every candidate. Prioritise official primary humanitarian sources: UN OCHA/ReliefWeb, WHO, UNICEF, UNHCR, WFP, IOM, IFRC/ICRC, government disaster agencies, and named NGOs with direct field reporting. Use reputable independent reporting only to corroborate or add context.',
    'A candidate is source_checked only when a primary source is available and the central factual claim is corroborated by a second credible source where feasible. If only one credible source exists, mark it candidate and say that it needs human confirmation. Never treat social media posts, anonymous claims, scraped aggregators, AI summaries, or search snippets as verification.',
    'Write neutral, concise HMSI newsroom copy. Separate sourced facts from context. Include publication dates in the verification notes. Do not invent figures, names, locations, casualty counts, beneficiary identities, funding totals, legal claims, or organisational impact. Avoid graphic detail and protect children, patients, displaced people, and private individuals.',
    'Return no more than ten distinct candidates. Do not copy long passages. Every candidate will be held in a pending administrator review queue; do not say that HMSI has verified or endorsed the report.',
    `RESEARCH SCOPE: ${limitPrompt(scope)}`,
  ].join('\n\n');

  let task: any;
  try { task = await createManusAssistantTask({ prompt, title: `HMSI humanitarian news research: ${scope.slice(0, 70)}`, structuredOutputSchema: humanitarianNewsSchema }); }
  catch (error) { const message = error instanceof Error ? error.message : 'Manus research is unavailable.'; return jsonError(message, message.includes('MANUS_API_KEY') ? 503 : 502); }
  if (!task?.task_id) return jsonError('Manus did not return a research task id.', 502);

  const record = await admin.from('hmsi_news_research_tasks').insert({ manus_task_id: task.task_id, requested_by_email: adminEmail, scope, status: 'running' }).select('id,manus_task_id,scope,status,created_at').single();
  if (record.error || !record.data) return jsonError('The research task started, but HMSI could not record it.', 503);
  await recordAssistantAudit({ actorEmail: adminEmail, action: 'humanitarian_news_research_started', manusTaskId: task.task_id, details: { scope } });
  return NextResponse.json({ task: record.data }, { status: 201 });
}

export { humanitarianNewsSchema };
