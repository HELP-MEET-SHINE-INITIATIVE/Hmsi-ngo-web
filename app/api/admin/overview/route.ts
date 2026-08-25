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

  const [fundraisers, volunteers, workers, assignments, messageNotifications, featuredStories, newsArticles, fundraiserCampaigns] = await Promise.all([
    admin.from('fundraisers').select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at').order('created_at', { ascending: false }),
    admin.from('volunteer_applications').select('id,name,email,phone,interest,message,status,account_status,publisher_role,applicant_role,created_at').order('created_at', { ascending: false }),
    admin.from('workers').select('id,name,email,phone,role,status,onboarding_status,created_at').order('created_at', { ascending: false }),
    admin.from('work_assignments').select('id,title,description,kind,status,assigned_worker_id,fundraiser_id,due_at,created_at').eq('is_deleted', false).order('created_at', { ascending: false }),
    admin.from('contact_message_notifications').select('id').limit(1),
    admin.from('featured_story_drafts').select('id').limit(1),
    admin.from('news_articles').select('id').limit(1),
    admin.from('fundraisers').select('id,campaign_type,programme_name'),
  ]);

  const baseResults = { fundraisers, volunteers, workers, assignments };
  const failedBase = Object.entries(baseResults).find(([, result]) => result.error);
  if (failedBase?.[1].error) {
    const [table, result] = failedBase;
    console.error(`[Admin] Failed to load ${table}:`, result.error);
    return NextResponse.json({ error: `Admin data could not be loaded from the ${table} table. ${result.error.message || 'Check the Supabase schema and server key.'}` }, { status: 503 });
  }

  const [volunteersWithRole, opportunities, opportunityApplications] = await Promise.all([
    admin.from('volunteer_applications').select('id,name,email,phone,interest,message,status,account_status,publisher_role,applicant_role,created_at').order('created_at', { ascending: false }),
    admin.from('opportunities').select('id,title,description,audience,location,image_url,image_path,starts_at,ends_at,status,category,eligibility_note,requires_hmsi_certificate,member_visible,created_at').order('starts_at', { ascending: true }),
    admin.from('opportunity_applications').select('id,opportunity_id,applicant_name,applicant_email,applicant_phone,applicant_role,status,reviewed_at,created_at').order('created_at', { ascending: false }),
  ]);

  const migrationWarnings: string[] = [];
  const volunteerRows = volunteersWithRole.error ? volunteers.data || [] : volunteersWithRole.data || [];
  if (volunteersWithRole.error) migrationWarnings.push('Run supabase/role_opportunities_community_patch.sql to add applicant roles.');
  if (opportunities.error || opportunityApplications.error) migrationWarnings.push('Run supabase/role_opportunities_community_patch.sql to enable opportunities and opportunity applications.');
  if (messageNotifications.error) migrationWarnings.push('Run supabase/messaging_patch.sql to show contact messages and enable admin/worker replies.');
  if (featuredStories.error) migrationWarnings.push('Run supabase/featured_stories_patch.sql to enable homepage featured-story submissions and approvals.');
  if (newsArticles.error) migrationWarnings.push('Run supabase/newsroom_patch.sql to enable news submissions and approvals.');
  if (fundraiserCampaigns.error) migrationWarnings.push('Run supabase/fundraiser_campaigns_patch.sql to enable organisation and programme campaign labels.');

  return NextResponse.json({
    fundraisers: (fundraisers.data || []).map((fundraiser) => ({ ...fundraiser, ...(fundraiserCampaigns.data || []).find((campaign) => campaign.id === fundraiser.id) })),
    volunteers: volunteerRows,
    workers: workers.data || [],
    assignments: assignments.data || [],
    opportunities: opportunities.error ? [] : opportunities.data || [],
    opportunityApplications: opportunityApplications.error ? [] : opportunityApplications.data || [],
    migrationWarnings,
  });
}
