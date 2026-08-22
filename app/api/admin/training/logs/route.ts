import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export interface AuditLogEntry {
  id: string;
  regional_office_id: string | null;
  office_name: string;
  office_code: string;
  alert_type: string;
  trigger_metric_value: number;
  threshold_value: number;
  recipient_emails: string[];
  sent_at: string;
  status: 'DELIVERED' | 'FAILED';
}

export interface AuditLogsResponse {
  summary: {
    totalDispatches: number;
    nationalDigestsSent: number;
    regionalBriefingsSent: number;
    thresholdBreachesLogged: number;
    uniqueRecipientsCount: number;
    latestDispatchAt: string | null;
  };
  logs: AuditLogEntry[];
  migrationNeeded: boolean;
}

export async function GET(request: Request) {
  const adminEmail = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!adminEmail) {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  const emptyResponse: AuditLogsResponse = {
    summary: {
      totalDispatches: 0,
      nationalDigestsSent: 0,
      regionalBriefingsSent: 0,
      thresholdBreachesLogged: 0,
      uniqueRecipientsCount: 0,
      latestDispatchAt: null,
    },
    logs: [],
    migrationNeeded: false,
  };

  if (!hasSupabaseConfig()) {
    return NextResponse.json(emptyResponse);
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json(emptyResponse);

  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('type');
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200);

    // 1. Fetch Offices for mapping
    const { data: offices, error: officeErr } = await admin.from('regional_offices').select('id, code, name');
    if (officeErr) {
      console.warn('[Admin Audit Logs] Regional offices table error:', officeErr);
    }
    const officeMap = new Map<string, { code: string; name: string }>();
    for (const off of offices || []) {
      officeMap.set(off.id, { code: off.code, name: off.name });
    }

    // 2. Fetch Logs
    let query = admin.from('training_alert_logs').select('*').order('sent_at', { ascending: false }).limit(limit);
    if (filterType && filterType !== 'ALL') {
      query = query.ilike('alert_type', `%${filterType}%`);
    }

    const { data: logRows, error: logErr } = await query;
    if (logErr) {
      console.warn('[Admin Audit Logs] Alert logs table error:', logErr);
      return NextResponse.json({ ...emptyResponse, migrationNeeded: true });
    }

    const rawLogs = logRows || [];
    const uniqueRecipients = new Set<string>();

    const logs: AuditLogEntry[] = rawLogs.map((row) => {
      const office = row.regional_office_id ? officeMap.get(row.regional_office_id) : null;
      const emails: string[] = Array.isArray(row.recipient_emails) ? row.recipient_emails : [];
      for (const e of emails) uniqueRecipients.add(e.toLowerCase());

      return {
        id: row.id,
        regional_office_id: row.regional_office_id,
        office_name: office ? office.name : 'National Scope (All Units)',
        office_code: office ? office.code : 'NATIONAL',
        alert_type: row.alert_type,
        trigger_metric_value: Number(row.trigger_metric_value || 0),
        threshold_value: Number(row.threshold_value || 0),
        recipient_emails: emails,
        sent_at: row.sent_at,
        status: 'DELIVERED', // Since rows are written after verified Resend dispatch
      };
    });

    const nationalDigestsSent = logs.filter((l) => l.alert_type.includes('NATIONAL_GOVERNANCE_DIGEST')).length;
    const regionalBriefingsSent = logs.filter((l) => l.alert_type.includes('MONDAY_REGIONAL_BRIEFING')).length;
    const thresholdBreachesLogged = logs.filter(
      (l) => l.alert_type.includes('LOW_COMPLETION') || l.alert_type.includes('CRITICAL_DATA_PROTECTION') || l.alert_type.includes('RED') || l.alert_type.includes('AMBER')
    ).length;

    return NextResponse.json({
      summary: {
        totalDispatches: logs.length,
        nationalDigestsSent,
        regionalBriefingsSent,
        thresholdBreachesLogged,
        uniqueRecipientsCount: uniqueRecipients.size,
        latestDispatchAt: logs[0]?.sent_at || null,
      },
      logs,
      migrationNeeded: false,
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('[Admin Audit Logs] Unexpected error loading logs:', error);
    return NextResponse.json({ error: 'Failed to retrieve delivery audit logs.' }, { status: 500 });
  }
}
