import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

const EXCLUDED_PATHS = new Set(['/hmsi-control', '/gtm-preview', '/login', '/signup']);
const EVENT_TYPES = new Set(['page_view', 'link_click']);
const MAX_TEXT_LENGTH = 180;

function cleanString(value: unknown, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
  return cleaned || null;
}

function cleanPath(value: unknown) {
  const path = cleanString(value, 240);
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  return path.split('?')[0].split('#')[0] || '/';
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = cleanString(body.eventType, 20);
  const path = cleanPath(body.path);
  const targetPath = cleanPath(body.targetPath);

  if (!eventType || !EVENT_TYPES.has(eventType) || !path || EXCLUDED_PATHS.has(path) || path.startsWith('/api/')) {
    return NextResponse.json({ ok: true });
  }
  if (eventType === 'link_click' && (!targetPath || EXCLUDED_PATHS.has(targetPath) || targetPath.startsWith('/api/'))) {
    return NextResponse.json({ ok: true });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await admin.from('page_views').insert({
    event_type: eventType,
    path,
    target_path: eventType === 'link_click' ? targetPath : null,
    referrer_host: cleanString(body.referrerHost),
    utm_source: cleanString(body.utmSource, 100),
    utm_medium: cleanString(body.utmMedium, 100),
    utm_campaign: cleanString(body.utmCampaign, 160),
  });

  if (error) {
    console.error('[Analytics] Failed to record event:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
