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
  pagerDutyThreshold?: number;
  slackWebhookUrl?: string;
  pagerDutyRoutingKey?: string;
  customFetch?: typeof fetch;
  mockFailures?: DeadLetterFailure[];
}

export interface MonitorResult {
  alerted: boolean;
  pagedOnCall: boolean;
  failureCount: number;
  threshold: number;
  pagerDutyThreshold: number;
  lookbackHours: number;
  failures: DeadLetterFailure[];
  slackStatus?: number;
  slackError?: string;
  pagerDutyStatus?: number;
  pagerDutyDedupKey?: string;
  pagerDutyError?: string;
  message: string;
}

export function formatSlackPayload(
  failures: DeadLetterFailure[],
  lookbackHours: number,
  threshold: number,
  pagedOnCall: boolean
) {
  const failureCount = failures.length;
  const isCritical = failureCount >= 10;
  const severityEmoji = isCritical ? '🔥 P1 - CRITICAL (PAGERDUTY ON-CALL)' : '⚠️ P2 - ATTENTION';
  const headerText = isCritical
    ? 'CRITICAL P1 ALERT: Dead-Letter Threshold Breached & On-Call Paged'
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

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚨 ${headerText}`,
        emoji: true,
      },
    },
  ];

  if (pagedOnCall) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📟 *PAGERDUTY P1 ON-CALL ESCALATION TRIGGERED* — Critical threshold (>10 failures) breached. Primary on-call reliability engineer has been paged automatically.',
      },
    });
  }

  blocks.push(
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
          text: `*Total Failures:*\n*${failureCount}* (P1 Limit: 10)`,
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
    }
  );

  return { blocks };
}

export function formatPagerDutyPayload(
  routingKey: string,
  failures: DeadLetterFailure[],
  lookbackHours: number,
  dedupKey: string
) {
  const failureCount = failures.length;
  const affectedOffices = Array.from(new Set(failures.map((f) => f.office_name)));
  const recentErrors = failures.slice(0, 5).map((f) => `[${f.office_code}] ${f.alert_type}: ${f.error_message || 'Timeout'}`);

  return {
    routing_key: routingKey,
    event_action: 'trigger',
    dedup_key: dedupKey,
    payload: {
      summary: `[CRITICAL P1] HMSI Resend Dispatch Dead-Letter Surge: ${failureCount} failures in past ${lookbackHours}h`,
      source: 'hmsi-governance-alert-engine',
      severity: 'critical',
      component: 'resend-email-dispatcher',
      group: 'infrastructure-alerts',
      class: 'dead-letter-surge',
      custom_details: {
        total_failures: failureCount,
        critical_threshold: 10,
        lookback_hours: lookbackHours,
        affected_units: affectedOffices,
        recent_errors: recentErrors,
        admin_console_url: 'https://www.hmsi.org.ng/hmsi-control',
        timestamp_utc: new Date().toISOString(),
      },
    },
  };
}

export async function evaluateDeadLetterQueue(options: MonitorOptions = {}): Promise<MonitorResult> {
  const lookbackHours = options.lookbackHours ?? 24;
  const failureThreshold = options.failureThreshold ?? 2;
  const pagerDutyThreshold = options.pagerDutyThreshold ?? 10;
  const slackWebhookUrl = options.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL?.trim();
  const pagerDutyRoutingKey = options.pagerDutyRoutingKey || process.env.PAGERDUTY_ROUTING_KEY?.trim();
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
  const shouldPageOnCall = failureCount >= pagerDutyThreshold;

  if (!shouldAlert) {
    return {
      alerted: false,
      pagedOnCall: false,
      failureCount,
      threshold: failureThreshold,
      pagerDutyThreshold,
      lookbackHours,
      failures,
      message: `Queue healthy: ${failureCount} failure(s) recorded, below threshold of ${failureThreshold}.`,
    };
  }

  let pagerDutyStatus: number | undefined;
  let pagerDutyError: string | undefined;
  const dedupKey = `hmsi_resend_dead_letter_critical_${new Date().toISOString().slice(0, 10)}`;

  // Trigger PagerDuty P1 Escalation if critical threshold exceeded
  if (shouldPageOnCall) {
    if (pagerDutyRoutingKey) {
      try {
        const pdPayload = formatPagerDutyPayload(pagerDutyRoutingKey, failures, lookbackHours, dedupKey);
        const pdRes = await fetchFn('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pdPayload),
        });
        pagerDutyStatus = pdRes.status;
        if (!pdRes.ok) {
          const pdText = await pdRes.text().catch(() => '');
          pagerDutyError = `PagerDuty HTTP ${pdRes.status}: ${pdText}`;
        }
      } catch (pdErr) {
        pagerDutyError = pdErr instanceof Error ? pdErr.message : 'Network error reaching PagerDuty';
      }
    } else {
      pagerDutyError = 'PAGERDUTY_ROUTING_KEY not configured';
      console.warn(`[Dead-Letter Monitor] P1 Critical threshold reached (${failureCount} failures), but PAGERDUTY_ROUTING_KEY is not configured.`);
    }
  }

  // Trigger Slack Block Kit notification
  const slackPayload = formatSlackPayload(failures, lookbackHours, failureThreshold, shouldPageOnCall);
  let slackStatus: number | undefined;
  let slackError: string | undefined;

  if (slackWebhookUrl) {
    try {
      const slackRes = await fetchFn(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });
      slackStatus = slackRes.status;
      if (!slackRes.ok) {
        const errText = await slackRes.text().catch(() => '');
        slackError = `Slack webhook returned HTTP ${slackRes.status}: ${errText}`;
      }
    } catch (netErr) {
      slackError = netErr instanceof Error ? netErr.message : 'Network error reaching Slack';
    }
  } else {
    slackError = 'SLACK_WEBHOOK_URL not configured';
  }

  return {
    alerted: true,
    pagedOnCall: shouldPageOnCall,
    failureCount,
    threshold: failureThreshold,
    pagerDutyThreshold,
    lookbackHours,
    failures,
    slackStatus,
    slackError,
    pagerDutyStatus,
    pagerDutyDedupKey: shouldPageOnCall ? dedupKey : undefined,
    pagerDutyError,
    message: shouldPageOnCall
      ? `🚨 P1 CRITICAL SURGE: ${failureCount} dead-letter failures! On-call engineers paged via PagerDuty (Status: ${pagerDutyStatus || 'error'}).`
      : `⚠️ Warning: ${failureCount} dead-letter failures detected. Slack alert dispatched.`,
  };
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
