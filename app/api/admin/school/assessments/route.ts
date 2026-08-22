import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
const monthPattern = /^\d{4}-\d{2}-01$/;
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Assessment records are unavailable.', 503);
  const result = await admin.from('hmsi_monthly_worker_assessments').select('id,worker_id,assessment_month,assessor_email,score,outcome,notes,submitted_at').order('assessment_month', { ascending: false }).order('submitted_at', { ascending: false }).limit(200);
  if (result.error) return error('Monthly assessments are unavailable. Apply the HMSI school migration first.', 503);
  return NextResponse.json({ assessments: result.data || [] });
}

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return error('Admin authentication required.', 401);
  const admin = getSupabaseAdmin();
  if (!admin) return error('Assessment records are unavailable.', 503);
  const body = await request.json().catch(() => ({}));
  const workerId = typeof body.worker_id === 'string' ? body.worker_id.trim() : '';
  const assessmentMonth = typeof body.assessment_month === 'string' ? body.assessment_month.trim() : '';
  const score = Number(body.score);
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  if (!workerId || !monthPattern.test(assessmentMonth) || !Number.isFinite(score) || score < 0 || score > 100) return error('Worker, first day of the assessment month (YYYY-MM-01), and a score from 0 to 100 are required.');
  const worker = await admin.from('workers').select('id,name,email,status,onboarding_status').eq('id', workerId).maybeSingle();
  if (worker.error) return error('Worker records are unavailable.', 503);
  if (!worker.data || worker.data.status !== 'active' || worker.data.onboarding_status !== 'completed') return error('Assessments can only be recorded for active successfully onboarded workers.');
  const outcome = score >= 70 ? 'passed' : 'follow_up';
  const assessment = await admin.from('hmsi_monthly_worker_assessments').upsert({ worker_id: workerId, assessment_month: assessmentMonth, assessor_email: adminEmail, score, outcome, notes }, { onConflict: 'worker_id,assessment_month' }).select('id,worker_id,assessment_month,assessor_email,score,outcome,notes,submitted_at').single();
  if (assessment.error || !assessment.data) return error('The monthly assessment could not be saved.', 503);
  return NextResponse.json({ assessment: assessment.data, worker: worker.data, policy: 'Scores of 70 or higher are marked passed; lower scores are marked follow_up for support and review.' });
}
