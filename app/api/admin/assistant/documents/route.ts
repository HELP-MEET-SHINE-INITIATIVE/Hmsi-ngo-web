import { NextResponse } from 'next/server';
import { getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);

  const result = await admin
    .from('hmsi_assistant_documents')
    .select('id,title,category,visibility,status,created_by_email,updated_by_email,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (result.error) return jsonError('The HMSI Assistant document library is unavailable. Apply supabase/hmsi_assistant_patch.sql first.', 503);

  await recordAssistantAudit({ actorEmail: adminEmail, action: 'document_listed', details: { count: result.data?.length || 0 } });
  return NextResponse.json({ documents: result.data || [] });
}

export async function POST(request: Request) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('A valid JSON document is required.'); }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content : '';
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 80) || 'governance' : 'governance';
  const visibility = body.visibility === 'worker' || body.visibility === 'shared' ? body.visibility : 'admin';
  if (title.length < 3 || title.length > 200) return jsonError('Document title must be between 3 and 200 characters.');
  if (content.trim().length < 1 || content.length > 120_000) return jsonError('Document content must be between 1 and 120,000 characters.');

  const document = await admin.from('hmsi_assistant_documents').insert({
    title,
    category,
    visibility,
    created_by_email: adminEmail,
    updated_by_email: adminEmail,
  }).select('id,title,category,visibility,status,created_by_email,updated_by_email,created_at,updated_at').single();
  if (document.error || !document.data) return jsonError('The document could not be created. Apply the HMSI Assistant migration if needed.', 503);

  const version = await admin.from('hmsi_assistant_document_versions').insert({
    document_id: document.data.id,
    version: 1,
    content,
    change_summary: 'Initial document version',
    created_by_email: adminEmail,
  }).select('id,document_id,version,change_summary,created_by_email,created_at').single();
  if (version.error) return jsonError('The document was created but its first version could not be saved.', 503);

  await recordAssistantAudit({ actorEmail: adminEmail, action: 'document_created', documentId: document.data.id, details: { title, category, visibility, version: 1 } });
  return NextResponse.json({ document: document.data, version: version.data }, { status: 201 });
}
