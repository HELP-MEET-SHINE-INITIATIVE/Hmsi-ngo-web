import { getSupabaseAdmin, hasSupabaseConfig } from '../lib/supabaseAdmin';

export interface DeadLetterFailure {
  id: string;
  regional_office_id: string | null;
  office_name: string;
  office_code: string;
  alert_type: string;
  trigger_metric_value: number;
  threshold_value: number;
  recipient_emails: string[];
  sent_at: string;
  error_message?: string;
}

export interface MonitorOptions {
  lookbackHours?: number;
  failureThreshold?: number;
  slackWebhookUrl?: string;
  customFetch?: typeof fetch;
  mockFailures?: DeadLetterFailure[];
}

export interface MonitorResult {
  alerted: boolean;
  failureCount: number;
  threshold: number;
  lookbackHours: number;
  failures: DeadLetterFailure[];
  slackStatus?: number;
  slackError?: string;
  message: string;
}

export function formatSlackPayload(failures: DeadLetterFailure[], lookbackHours: number, threshold: number) {
  const failureCount = failures.length;
  const isCritical = failureCount >= 5;
  const severityEmoji = isCritical ? '🔥 P1 - CRITICAL' : '⚠️ P2 - ATTENTION';
  const headerText = isCritical
    ? 'CRITICAL ALERT: Resend Dispatch Dead-Letter Threshold Breached'
    : 'WARNING: Resend Dispatch Dead-Letter Retry Failures Detected';

  const affectedOffices = Array.from(new Set(failures.map((f) => f.office_name)));
  const failureList = failures
    .slice(0, 5)
    .map((f, idx) => {
      const time = new Date(f.sent_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      const errMsg = f.error_message ? ` · _${f.error_message}_` : '';
      return `*${idx + 1}. [${f.office_code}]* ${f.alert_type} (${time})${errMsg}`;
    })
    .join('\n');

  const extraCount = failureCount > 5 ? `\n_...and ${failureCount - 5} more failures logged._` : '';

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 ${headerText}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Help Meet Shine Initiative (HMSI) Alert Engine* has detected *${failureCount} failed dispatch(es)* in the last *${lookbackHours} hour(s)*, exceeding the operational threshold of *${threshold}*.`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity Level:*\n\`${severityEmoji}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Total Failures:*\n*${failureCount}* (Threshold: ${threshold})`,
          },
          {
            type: 'mrkdwn',
            text: `*Affected Units:*\n${affectedOffices.join(', ') || 'National'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Lookback Window:*\nPast ${lookbackHours} hours`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recent Dead-Letter Failure Logs:*\n${failureList}${extraCount}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔍 Open Admin Audit Console',
              emoji: true,
            },
            url: 'https://www.hmsi.org.ng/hmsi-control',
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🤖 Automated Health Check Monitor · HMSI Infrastructure Operations',
          },
        ],
      },
    ],
  };
}

export async function evaluateDeadLetterQueue(options: MonitorOptions = {}): Promise<MonitorResult> {
  const lookbackHours = options.lookbackHours ?? 24;
  const failureThreshold = options.failureThreshold ?? 2;
  const slackWebhookUrl = options.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL?.trim();
  const fetchFn = options.customFetch ?? fetch;

  let failures: DeadLetterFailure[] = [];

  if (options.mockFailures) {
    failures = options.mockFailures;
  } else if (hasSupabaseConfig()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      const sinceDate = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();

      // Fetch regional offices map
      const { data: offices } = await admin.from('regional_offices').select('id, code, name');
      const officeMap = new Map<string, { code: string; name: string }>();
      for (const off of offices || []) {
        officeMap.set(off.id, { code: off.code, name: off.name });
      }

      // Query failed alerts in window
      const { data: rows, error } = await admin
        .from('training_alert_logs')
        .select('*')
        .gte('sent_at', sinceDate)
        .or('alert_type.ilike.%FAIL%,alert_type.ilike.%ERROR%')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (!error && rows) {
        failures = rows.map((row) => {
          const office = row.regional_office_id ? officeMap.get(row.regional_office_id) : null;
          return {
            id: row.id,
            regional_office_id: row.regional_office_id,
            office_name: office ? office.name : 'National Scope (All Units)',
            office_code: office ? office.code : 'NATIONAL',
            alert_type: row.alert_type,
            trigger_metric_value: Number(row.trigger_metric_value || 0),
            threshold_value: Number(row.threshold_value || 0),
            recipient_emails: Array.isArray(row.recipient_emails) ? row.recipient_emails : [],
            sent_at: row.sent_at,
            error_message: row.error_message || 'Max retries exhausted under network partition.',
          };
        });
      }
    }
  }

  const failureCount = failures.length;
  const shouldAlert = failureCount >= failureThreshold;

  if (!shouldAlert) {
    return {
      alerted: false,
      failureCount,
      threshold: failureThreshold,
      lookbackHours,
      failures,
      message: `Queue healthy: ${failureCount} failure(s) recorded, below threshold of ${failureThreshold}.`,
    };
  }

  // Threshold breached -> Dispatch Slack webhook
  const slackPayload = formatSlackPayload(failures, lookbackHours, failureThreshold);

  if (!slackWebhookUrl) {
    console.warn(`[Dead-Letter Monitor] Threshold breached (${failureCount} failures), but SLACK_WEBHOOK_URL is not configured.`);
    return {
      alerted: true,
      failureCount,
      threshold: failureThreshold,
      lookbackHours,
      failures,
      slackError: 'SLACK_WEBHOOK_URL not configured',
      message: `Threshold breached (${failureCount} failures), Slack alert skipped (no webhook URL).`,
    };
  }

  try {
    const slackRes = await fetchFn(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (slackRes.ok) {
      return {
        alerted: true,
        failureCount,
        threshold: failureThreshold,
        lookbackHours,
        failures,
        slackStatus: slackRes.status,
        message: `Slack notification successfully sent for ${failureCount} dead-letter failure(s).`,
      };
    } else {
      const errText = await slackRes.text().catch(() => '');
      return {
        alerted: true,
        failureCount,
        threshold: failureThreshold,
        lookbackHours,
        failures,
        slackStatus: slackRes.status,
        slackError: `Slack webhook returned HTTP ${slackRes.status}: ${errText}`,
        message: `Threshold breached, but Slack webhook failed with HTTP ${slackRes.status}.`,
      };
    }
  } catch (netErr) {
    return {
      alerted: true,
      failureCount,
      threshold: failureThreshold,
      lookbackHours,
      failures,
      slackError: netErr instanceof Error ? netErr.message : 'Network error reaching Slack',
      message: `Threshold breached, but failed to connect to Slack webhook.`,
    };
  }
}

// Standalone CLI execution
if (process.argv[1]?.endsWith('monitor_dead_letter_queue.ts')) {
  evaluateDeadLetterQueue()
    .then((res) => {
      console.log('Dead-Letter Monitor Run Result:', JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('Fatal Monitor Error:', err);
      process.exit(1);
    });
}
