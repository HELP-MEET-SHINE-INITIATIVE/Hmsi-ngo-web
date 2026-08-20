import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!getAdminEmailFromCookie(request.headers.get('cookie'))) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  const [fundraisers, volunteers, workers, assignments, opportunities, opportunityApplications] = await Promise.all([
    admin.from('fundraisers').select('id,title,description,category,target_amount,raised_amount,image_url,status,created_at').order('created_at', { ascending: false }),
    admin.from('volunteer_applications').select('id,name,email,phone,interest,message,status,applicant_role,created_at').order('created_at', { ascending: false }),
    admin.from('workers').select('id,name,email,phone,role,status,created_at').order('created_at', { ascending: false }),
    admin.from('work_assignments').select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at').order('created_at', { ascending: false }),
    admin.from('opportunities').select('id,title,description,audience,location,starts_at,ends_at,status,created_at').order('starts_at', { ascending: true }),
    admin.from('opportunity_applications').select('id,opportunity_id,applicant_name,applicant_email,applicant_phone,applicant_role,status,reviewed_at,created_at').order('created_at', { ascending: false }),
  ]);

  const failed = [fundraisers, volunteers, workers, assignments, opportunities, opportunityApplications].find((result) => result.error);
  if (failed?.error) {
    console.error('[Admin] Failed to load overview:', failed.error);
    return NextResponse.json({ error: 'Admin data is temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.json({
    fundraisers: fundraisers.data || [],
    volunteers: volunteers.data || [],
    workers: workers.data || [],
    assignments: assignments.data || [],
    opportunities: opportunities.data || [],
    opportunityApplications: opportunityApplications.data || [],
  });
}
