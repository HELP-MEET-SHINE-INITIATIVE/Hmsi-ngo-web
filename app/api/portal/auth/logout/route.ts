import { NextResponse } from 'next/server';
import { clearPortalSession } from '../../../../../lib/portalAuth';
export const runtime = 'nodejs';
export async function POST() { return clearPortalSession(NextResponse.json({ ok: true })); }
