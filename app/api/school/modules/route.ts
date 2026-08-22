import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ modules: [], setupRequired: true });
  const result = await admin.from('hmsi_school_modules').select('id,code,title,description,level,duration_minutes,status').eq('status', 'published').order('level', { ascending: true }).order('title', { ascending: true }).limit(50);
  if (result.error) return NextResponse.json({ error: 'The HMSI school catalog is temporarily unavailable.' }, { status: 503 });
  return NextResponse.json({ modules: result.data || [], setupRequired: false });
}
