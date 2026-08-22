import { GET as handleDeadLetterCronGet } from '../app/api/cron/dead-letter-monitor/route';
import {
  evaluateDeadLetterQueue,
  type DeadLetterFailure,
} from './monitor_dead_letter_queue';

async function runDryRunDeadLetterTests() {
  console.log('======================================================');
  console.log('  STARTING 08:30 UTC DEAD-LETTER ENDPOINT DRY RUN     ');
  console.log('======================================================\n');

  process.env.CRON_SECRET = process.env.CRON_SECRET || 'test_cron_secret_key_830utc';

  // ----------------------------------------------------
  // TEST 1: Endpoint Authorization Check (401 vs 200)
  // ----------------------------------------------------
  console.log('[STAGE 1] Testing CRON_SECRET Bearer Authorization on Route Handler...');
  const unauthReq = new Request('http://localhost:3000/api/cron/dead-letter-monitor', { method: 'GET' });
  const unauthRes = await handleDeadLetterCronGet(unauthReq);
  console.log(`  Unauthenticated status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Stage 1 Failed: Expected 401 Unauthorized, got ${unauthRes.status}`);
  }

  const authReq = new Request('http://localhost:3000/api/cron/dead-letter-monitor', {
    method: 'GET',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  const authRes = await handleDeadLetterCronGet(authReq);
  console.log(`  Authorized status: ${authRes.status} (Expected: 200)`);
  if (authRes.status !== 200) {
    throw new Error(`Stage 1 Failed: Expected 200 OK for authorized cron request, got ${authRes.status}`);
  }
  console.log('  ✓ Stage 1 Passed: Endpoint authorization verified.\n');

  // ----------------------------------------------------
  // TEST 2: Dry-Run Scenario A (Mock HTTP 429 & HTTP 500 - 3 Failures)
  // ----------------------------------------------------
  console.log('[STAGE 2] Dry-Run Scenario A: Mock HTTP 429 & HTTP 500 Failures (3 Failures)...');
  const mockFailuresA: DeadLetterFailure[] = [
    {
      id: 'mock-fail-429-1',
      regional_office_id: 'off-lagos',
      office_name: 'Lagos Coordination Hub',
      office_code: 'LAGOS_HUB',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
      trigger_metric_value: 80.0,
      threshold_value: 85.0,
      recipient_emails: ['lagos-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 900000).toISOString(),
      error_message: 'Resend API HTTP 429: Too Many Requests (Rate limit backoff exhausted)',
    },
    {
      id: 'mock-fail-429-2',
      regional_office_id: 'off-delta',
      office_name: 'Delta Outreach Unit',
      office_code: 'DELTA_OUTREACH',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
      trigger_metric_value: 76.0,
      threshold_value: 85.0,
      recipient_emails: ['delta-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 1200000).toISOString(),
      error_message: 'Resend API HTTP 429: Rate limit exceeded on batch dispatch',
    },
    {
      id: 'mock-fail-500-1',
      regional_office_id: null,
      office_name: 'National Scope (All Units)',
      office_code: 'NATIONAL',
      alert_type: 'NATIONAL_GOVERNANCE_DIGEST_FAILED',
      trigger_metric_value: 90.1,
      threshold_value: 85.0,
      recipient_emails: ['contact@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 1500000).toISOString(),
      error_message: 'Resend API HTTP 500: Internal Server Error from upstream mail exchanger',
    },
  ];

  let scenarioASlackPayload: any = null;
  let scenarioAPagerDutyCalled = false;

  const mockFetchA: typeof fetch = async (url, init) => {
    if (String(url).includes('slack')) {
      scenarioASlackPayload = JSON.parse(init?.body as string);
      return new Response('ok', { status: 200 });
    }
    if (String(url).includes('pagerduty')) {
      scenarioAPagerDutyCalled = true;
      return new Response(JSON.stringify({ status: 'success' }), { status: 202 });
    }
    return new Response('ok', { status: 200 });
  };

  const resultA = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    pagerDutyThreshold: 10,
    slackWebhookUrl: 'https://hooks.slack.com/services/DRY_RUN/SCENARIO_A/12345',
    pagerDutyRoutingKey: 'pd_dry_run_key_scenario_a',
    customFetch: mockFetchA,
    mockFailures: mockFailuresA,
  });

  console.log(`  Scenario A Result: alerted=${resultA.alerted}, pagedOnCall=${resultA.pagedOnCall}, failures=${resultA.failureCount}, slackStatus=${resultA.slackStatus}`);
  console.log(`  Slack Header: "${scenarioASlackPayload?.blocks[0]?.text?.text}"`);
  console.log(`  Message: "${resultA.message}"`);

  if (!resultA.alerted || resultA.pagedOnCall || scenarioAPagerDutyCalled || resultA.slackStatus !== 200) {
    throw new Error('Stage 2 Failed: Scenario A should trigger Slack alert only (PagerDuty suppressed under threshold 10).');
  }
  console.log('  ✓ Stage 2 Passed: Scenario A successfully dispatched Slack warning and avoided unnecessary on-call paging.\n');

  // ----------------------------------------------------
  // TEST 3: Dry-Run Scenario B (Mock Critical Outage - 11 Failures)
  // ----------------------------------------------------
  console.log('[STAGE 3] Dry-Run Scenario B: Mock Critical Outage Surge (11 Failures: HTTP 429 & HTTP 500)...');
  const mockFailuresB: DeadLetterFailure[] = Array.from({ length: 11 }, (_, idx) => ({
    id: `mock-critical-fail-${idx + 1}`,
    regional_office_id: idx % 2 === 0 ? 'off-lagos' : 'off-delta',
    office_name: idx % 2 === 0 ? 'Lagos Coordination Hub' : 'Delta Outreach Unit',
    office_code: idx % 2 === 0 ? 'LAGOS_HUB' : 'DELTA_OUTREACH',
    alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
    trigger_metric_value: 78.0,
    threshold_value: 85.0,
    recipient_emails: [`lead-${idx + 1}@hmsi.org.ng`],
    sent_at: new Date(Date.now() - idx * 300000).toISOString(),
    error_message: idx % 2 === 0
      ? `Resend API HTTP 429: Too Many Requests (Attempt ${idx + 1})`
      : `Resend API HTTP 500: Server Outage / Gateway Drop (Attempt ${idx + 1})`,
  }));

  let scenarioBSlackPayload: any = null;
  let scenarioBPagerDutyPayload: any = null;

  const mockFetchB: typeof fetch = async (url, init) => {
    if (String(url).includes('pagerduty')) {
      scenarioBPagerDutyPayload = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ status: 'success', dedup_key: 'pd_dry_run_dedup_b' }), { status: 202 });
    }
    if (String(url).includes('slack')) {
      scenarioBSlackPayload = JSON.parse(init?.body as string);
      return new Response('ok', { status: 200 });
    }
    return new Response('ok', { status: 200 });
  };

  const resultB = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    pagerDutyThreshold: 10,
    slackWebhookUrl: 'https://hooks.slack.com/services/DRY_RUN/SCENARIO_B/67890',
    pagerDutyRoutingKey: 'pd_prod_routing_key_critical_outage',
    customFetch: mockFetchB,
    mockFailures: mockFailuresB,
  });

  console.log(`  Scenario B Result: alerted=${resultB.alerted}, pagedOnCall=${resultB.pagedOnCall}, failures=${resultB.failureCount}, pdStatus=${resultB.pagerDutyStatus}, dedupKey=${resultB.pagerDutyDedupKey}`);
  console.log(`  PagerDuty Summary: "${scenarioBPagerDutyPayload?.payload?.summary}"`);
  console.log(`  PagerDuty Severity: "${scenarioBPagerDutyPayload?.payload?.severity}"`);
  console.log(`  Slack P1 Notice: "${scenarioBSlackPayload?.blocks[1]?.text?.text}"`);
  console.log(`  Message: "${resultB.message}"`);

  if (!resultB.alerted || !resultB.pagedOnCall || resultB.pagerDutyStatus !== 202 || !scenarioBPagerDutyPayload) {
    throw new Error('Stage 3 Failed: Scenario B did not trigger PagerDuty on-call escalation.');
  }

  if (scenarioBPagerDutyPayload.payload.severity !== 'critical') {
    throw new Error('Stage 3 Failed: PagerDuty payload severity is not critical.');
  }

  console.log('  ✓ Stage 3 Passed: Scenario B successfully paged on-call SRE via PagerDuty and injected P1 Slack banner.\n');

  console.log('======================================================');
  console.log('  ✅ ALL DRY-RUN TESTS COMPLETED SUCCESSFULLY!        ');
  console.log('======================================================');
}

runDryRunDeadLetterTests().catch((err) => {
  console.error('❌ Dry-run test failed:', err);
  process.exit(1);
});
