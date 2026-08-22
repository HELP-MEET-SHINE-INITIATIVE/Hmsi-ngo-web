import { NextResponse } from 'next/server';
import { getAssistantAdminEmail, getAssistantSupabase, recordAssistantAudit } from '../../../../../../lib/hmsiAssistant';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getId(context: Params) {
  const { id } = await context.params;
  return typeof id === 'string' ? id.trim() : '';
}

export async function GET(request: Request, context: Params) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);
  const id = await getId(context);
  if (!id) return jsonError('Document id is required.');

  const document = await admin.from('hmsi_assistant_documents').select('id,title,category,visibility,status,created_by_email,updated_by_email,created_at,updated_at').eq('id', id).maybeSingle();
  if (document.error) return jsonError('The document could not be loaded.', 503);
  if (!document.data) return jsonError('Document not found.', 404);
  const versions = await admin.from('hmsi_assistant_document_versions').select('id,document_id,version,content,change_summary,created_by_email,created_at').eq('document_id', id).order('version', { ascending: false }).limit(20);
  if (versions.error) return jsonError('Document versions could not be loaded.', 503);

  await recordAssistantAudit({ actorEmail: adminEmail, action: 'document_read', documentId: id, details: { versionCount: versions.data?.length || 0 } });
  return NextResponse.json({ document: document.data, versions: versions.data || [] });
}

export async function PATCH(request: Request, context: Params) {
  const adminEmail = getAssistantAdminEmail(request);
  if (!adminEmail) return jsonError('Admin authentication is required.', 401);
  const admin = getAssistantSupabase();
  if (!admin) return jsonError('HMSI Assistant storage is not configured.', 503);
  const id = await getId(context);
  if (!id) return jsonError('Document id is required.');

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('A valid JSON update is required.'); }
  const title = typeof body.title === 'string' ? body.title.trim() : undefined;
  const category = typeof body.category === 'string' ? body.category.trim().slice(0, 80) : undefined;
  const visibility = body.visibility === 'admin' || body.visibility === 'worker' || body.visibility === 'shared' ? body.visibility : undefined;
  const status = body.status === 'active' || body.status === 'archived' ? body.status : undefined;
  const content = typeof body.content === 'string' ? body.content : undefined;
  const changeSummary = typeof body.changeSummary === 'string' ? body.changeSummary.trim().slice(0, 500) : null;
  if (title !== undefined && (title.length < 3 || title.length > 200)) return jsonError('Document title must be between 3 and 200 characters.');
  if (content !== undefined && (content.trim().length < 1 || content.length > 120_000)) return jsonError('Document content must be between 1 and 120,000 characters.');
  if (title === undefined && category === undefined && visibility === undefined && status === undefined && content === undefined) return jsonError('At least one document field is required.');

  const current = await admin.from('hmsi_assistant_documents').select('id,title,category,visibility,status').eq('id', id).maybeSingle();
  if (current.error) return jsonError('The document could not be loaded.', 503);
  if (!current.data) return jsonError('Document not found.', 404);

  const documentUpdate: Record<string, unknown> = { updated_by_email: adminEmail, updated_at: new Date().toISOString() };
  if (title !== undefined) documentUpdate.title = title;
  if (category !== undefined) documentUpdate.category = category || 'governance';
  if (visibility !== undefined) documentUpdate.visibility = visibility;
  if (status !== undefined) documentUpdate.status = status;
  const updated = await admin.from('hmsi_assistant_documents').update(documentUpdate).eq('id', id).select('id,title,category,visibility,status,created_by_email,updated_by_email,created_at,updated_at').single();
  if (updated.error || !updated.data) return jsonError('The document metadata could not be updated.', 503);

  let version = null;
  if (content !== undefined) {
    const latest = await admin.from('hmsi_assistant_document_versions').select('version').eq('document_id', id).order('version', { ascending: false }).limit(1).maybeSingle();
    if (latest.error) return jsonError('The current document version could not be loaded.', 503);
    const nextVersion = Number(latest.data?.version || 0) + 1;
    const inserted = await admin.from('hmsi_assistant_document_versions').insert({ document_id: id, version: nextVersion, content, change_summary: changeSummary || 'Updated from HMSI Assistant', created_by_email: adminEmail }).select('id,document_id,version,change_summary,created_by_email,created_at').single();
    if (inserted.error) return jsonError('The document metadata changed, but the new version could not be saved.', 503);
    version = inserted.data;
  }

  await recordAssistantAudit({ actorEmail: adminEmail, action: content !== undefined ? 'document_version_created' : 'document_metadata_updated', documentId: id, details: { version: version?.version || null, status: updated.data.status, visibility: updated.data.visibility } });
  return NextResponse.json({ document: updated.data, version });
}
