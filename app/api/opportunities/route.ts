import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ opportunities: [] });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ opportunities: [] });

  const { data, error } = await admin
    .from('opportunities')
    .select('id,title,description,audience,location,starts_at,ends_at,status,created_at')
    .eq('status', 'open')
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('[Opportunities] Failed to load opportunities:', error.message);
    return NextResponse.json({ error: 'Opportunities are temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.json({ opportunities: data || [] });
}
