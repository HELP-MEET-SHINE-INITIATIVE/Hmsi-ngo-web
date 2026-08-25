import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ supporters: [], availability: 'unavailable' });
  const { data, error } = await admin
    .from('donations')
    .select('id,campaign_name_snapshot,verified_at,paid_at,status')
    .eq('status', 'success')
    .order('verified_at', { ascending: false })
    .limit(5);
  if (error) return NextResponse.json({ supporters: [], availability: 'unavailable' });
  return NextResponse.json({
    availability: 'ready',
    supporters: (data || []).map((donation) => ({ id: donation.id, campaign: donation.campaign_name_snapshot || 'HMSI community work', receivedAt: donation.verified_at || donation.paid_at })),
  });
}
