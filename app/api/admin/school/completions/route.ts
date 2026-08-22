import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('School records are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const enrollmentId = typeof body.enrollment_id === 'string' ? body.enrollment_id.trim() : '';
  const moduleId = typeof body.module_id === 'string' ? body.module_id.trim() : '';
  const score = body.score == null || body.score === '' ? null : Number(body.score);
  const passed = body.passed === true;
  if (!enrollmentId || !moduleId || (score !== null && (!Number.isFinite(score) || score < 0 || score > 100))) return error('Enrollment, module, and a score from 0 to 100 are required.');
  const completion = await admin.from('hmsi_school_module_completions').upsert({ enrollment_id: enrollmentId, module_id: moduleId, score, passed, completed_at: passed ? new Date().toISOString() : null }, { onConflict: 'enrollment_id,module_id' }).select('id,enrollment_id,module_id,score,passed,completed_at').single();
  if (completion.error || !completion.data) return error('Module completion could not be saved.', 503);
  const published = await admin.from('hmsi_school_modules').select('id').eq('status', 'published').limit(100);
  if (published.error) return error('Published school modules could not be checked.', 503);
  const passedRows = await admin.from('hmsi_school_module_completions').select('module_id').eq('enrollment_id', enrollmentId).eq('passed', true).limit(100);
  if (passedRows.error) return error('Completion progress could not be checked.', 503);
  const passedIds = new Set((passedRows.data || []).map((row) => row.module_id));
  const complete = Boolean(published.data?.length) && (published.data || []).every((module) => passedIds.has(module.id));
  const enrollment = await admin.from('hmsi_school_enrollments').update({ status: complete ? 'completed' : 'in_progress', completed_at: complete ? new Date().toISOString() : null }).eq('id', enrollmentId).select('id,holder_role,holder_id,holder_name,holder_email,status,enrolled_at,completed_at').single();
  if (enrollment.error || !enrollment.data) return error('Enrollment progress could not be updated.', 503);
  return NextResponse.json({ completion: completion.data, enrollment: enrollment.data, recordedBy: adminEmail });
}
