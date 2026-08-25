import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { LAUNCH_SEED_AUTHOR, launchCampaignSeed, launchDispatchSeeds } from '../../../../../lib/launchSeed';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured on the server.' }, { status: 503 });

  try {
    const campaignExisting = await admin.from('fundraisers').select('id').eq('id', launchCampaignSeed.id).maybeSingle();
    if (campaignExisting.error) throw campaignExisting.error;
    let campaignCreated = false;
    if (!campaignExisting.data) {
      const campaignInsert = await admin.from('fundraisers').insert({
        id: launchCampaignSeed.id,
        title: launchCampaignSeed.title,
        description: launchCampaignSeed.description,
        category: launchCampaignSeed.category,
        target_amount: launchCampaignSeed.targetAmount,
        raised_amount: 0,
        image_url: launchCampaignSeed.imageUrl,
        image_path: null,
        status: 'active',
      });
      if (campaignInsert.error) throw campaignInsert.error;
      campaignCreated = true;
    }

    const dispatchResults = await Promise.all(launchDispatchSeeds.map(async (dispatch) => {
      const existing = await admin.from('news_articles').select('id').eq('id', dispatch.id).maybeSingle();
      if (existing.error) throw existing.error;
      let newsCreated = false;
      if (!existing.data) {
        const inserted = await admin.from('news_articles').insert({
          id: dispatch.id,
          headline: dispatch.headline,
          summary: dispatch.summary,
          body: dispatch.body,
          category: dispatch.category,
          image_url: dispatch.imageUrl,
          author_name: LAUNCH_SEED_AUTHOR.name,
          author_email: LAUNCH_SEED_AUTHOR.email,
          author_role: LAUNCH_SEED_AUTHOR.role,
          status: 'published',
          approved_by: adminEmail,
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        }).select('id').single();
        if (inserted.error) throw inserted.error;
        await admin.from('news_approval_events').insert({ news_id: dispatch.id, action: 'published', actor_email: adminEmail, actor_role: 'admin', reason: 'Public launch sample dispatch.' }).then(() => undefined);
        newsCreated = true;
      }
      const storyExisting = await admin.from('featured_story_drafts').select('id').eq('id', dispatch.id).maybeSingle();
      if (storyExisting.error) throw storyExisting.error;
      let storyCreated = false;
      if (!storyExisting.data) {
        const insertedStory = await admin.from('featured_story_drafts').insert({
          id: dispatch.id,
          title: dispatch.headline,
          excerpt: dispatch.summary,
          body: dispatch.body,
          category: dispatch.category,
          image_url: dispatch.imageUrl,
          author_name: LAUNCH_SEED_AUTHOR.name,
          author_email: LAUNCH_SEED_AUTHOR.email,
          author_role: LAUNCH_SEED_AUTHOR.role,
          status: 'published',
          approved_by: adminEmail,
          approved_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        }).select('id').single();
        if (insertedStory.error) throw insertedStory.error;
        await admin.from('featured_story_approval_events').insert({ story_id: dispatch.id, action: 'published', actor_email: adminEmail, actor_role: 'admin', reason: 'Public launch sample dispatch.' }).then(() => undefined);
        storyCreated = true;
      }
      return { id: dispatch.id, newsCreated, storyCreated };
    }));

    return NextResponse.json({
      message: 'Launch seed package is ready. Campaign progress remains at ₦0 until verified donations are recorded.',
      campaign: { id: launchCampaignSeed.id, created: campaignCreated, raisedAmount: 0, targetAmount: launchCampaignSeed.targetAmount },
      dispatches: dispatchResults,
    });
  } catch (error) {
    console.error('[Launch seed] Failed to prepare public launch data:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Launch seed data could not be prepared. Confirm the campaign and newsroom migrations are applied.' }, { status: 503 });
  }
}
