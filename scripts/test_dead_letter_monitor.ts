import {
  evaluateDeadLetterQueue,
  formatSlackPayload,
  formatPagerDutyPayload,
  type DeadLetterFailure,
} from './monitor_dead_letter_queue';

async function runDeadLetterMonitorTests() {
  console.log('======================================================');
  console.log('  STARTING DEAD-LETTER MONITOR & ESCALATION TESTS     ');
  console.log('======================================================\n');

  const baseFailures: DeadLetterFailure[] = [
    {
      id: 'fail-1',
      regional_office_id: 'off-1',
      office_name: 'Lagos Coordination Hub',
      office_code: 'LAGOS_HUB',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
      trigger_metric_value: 80.0,
      threshold_value: 85.0,
      recipient_emails: ['lagos-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 1800000).toISOString(),
      error_message: 'Resend API HTTP 429: Too Many Requests after 3 retries',
    },
    {
      id: 'fail-2',
      regional_office_id: 'off-2',
      office_name: 'Delta Outreach Unit',
      office_code: 'DELTA_OUTREACH',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
      trigger_metric_value: 76.0,
      threshold_value: 85.0,
      recipient_emails: ['delta-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 3600000).toISOString(),
      error_message: 'ETIMEDOUT: Connection timed out to api.resend.com',
    },
    {
      id: 'fail-3',
      regional_office_id: null,
      office_name: 'National Scope (All Units)',
      office_code: 'NATIONAL',
      alert_type: 'NATIONAL_GOVERNANCE_DIGEST_FAILED',
      trigger_metric_value: 90.1,
      threshold_value: 85.0,
      recipient_emails: ['contact@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 7200000).toISOString(),
      error_message: 'SMTP delivery bounce: DNS resolution failure',
    },
  ];

  // ----------------------------------------------------
  // TEST 1: Below Failure Threshold (No Alert)
  // ----------------------------------------------------
  console.log('[TEST 1] Testing healthy queue below threshold (1 failure, threshold 5)...');
  const result1 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 5,
    mockFailures: baseFailures.slice(0, 1),
  });

  console.log(`  Result 1: alerted=${result1.alerted}, failureCount=${result1.failureCount}, threshold=${result1.threshold}`);
  if (result1.alerted || result1.failureCount !== 1) {
    throw new Error('Test 1 Failed: Should not trigger alert when failures are below threshold.');
  }
  console.log('  ✓ Test 1 Passed: Correctly identified healthy queue and suppressed alert.\n');

  // ----------------------------------------------------
  // TEST 2: Threshold Breached (3 Failures) -> Slack Alert Only (Below PagerDuty Limit)
  // ----------------------------------------------------
  console.log('[TEST 2] Testing moderate threshold breach (3 failures, Slack alert only)...');
  let receivedSlackPayload: any = null;
  let pagerDutyCalled = false;

  const mockDispatchFetch: typeof fetch = async (url, init) => {
    if (String(url).includes('slack')) {
      receivedSlackPayload = JSON.parse(init?.body as string);
      return new Response('ok', { status: 200 });
    }
    if (String(url).includes('pagerduty')) {
      pagerDutyCalled = true;
      return new Response(JSON.stringify({ status: 'success', dedup_key: 'test_key' }), { status: 202 });
    }
    return new Response('ok', { status: 200 });
  };

  const result2 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    pagerDutyThreshold: 10,
    slackWebhookUrl: 'https://hooks.slack.com/services/MOCK/WEBHOOK/12345',
    pagerDutyRoutingKey: 'pd_mock_routing_key_xyz',
    customFetch: mockDispatchFetch,
    mockFailures: baseFailures,
  });

  console.log(`  Result 2: alerted=${result2.alerted}, pagedOnCall=${result2.pagedOnCall}, slackStatus=${result2.slackStatus}`);
  if (!result2.alerted || result2.pagedOnCall || pagerDutyCalled || result2.slackStatus !== 200) {
    throw new Error('Test 2 Failed: Expected Slack alert only, PagerDuty should NOT be paged under threshold of 10.');
  }
  console.log('  ✓ Test 2 Passed: Dispatched Slack notification without triggering unnecessary PagerDuty escalation.\n');

  // ----------------------------------------------------
  // TEST 3: Critical Threshold Breached (12 Failures >= 10) -> PagerDuty On-Call Paged + Slack
  // ----------------------------------------------------
  console.log('[TEST 3] Testing CRITICAL threshold surge (12 failures >= 10) -> PagerDuty On-Call Paging...');
  const criticalSurgeFailures: DeadLetterFailure[] = Array.from({ length: 12 }, (_, i) => ({
    id: `fail-surge-${i + 1}`,
    regional_office_id: 'off-1',
    office_name: 'Lagos Coordination Hub',
    office_code: 'LAGOS_HUB',
    alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
    trigger_metric_value: 80.0,
    threshold_value: 85.0,
    recipient_emails: [`coordinator-${i + 1}@hmsi.org.ng`],
    sent_at: new Date(Date.now() - i * 600000).toISOString(),
    error_message: `Resend API Outage HTTP 503: Service Unavailable (${i + 1})`,
  }));

  let receivedPagerDutyPayload: any = null;
  let receivedCriticalSlackPayload: any = null;

  const mockCriticalFetch: typeof fetch = async (url, init) => {
    if (String(url).includes('pagerduty')) {
      receivedPagerDutyPayload = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ status: 'success', dedup_key: 'pd_dedup_critical_123' }), { status: 202 });
    }
    if (String(url).includes('slack')) {
      receivedCriticalSlackPayload = JSON.parse(init?.body as string);
      return new Response('ok', { status: 200 });
    }
    return new Response('ok', { status: 200 });
  };

  const result3 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    pagerDutyThreshold: 10,
    slackWebhookUrl: 'https://hooks.slack.com/services/MOCK/CRITICAL_WEBHOOK/12345',
    pagerDutyRoutingKey: 'pd_routing_key_prod_incident',
    customFetch: mockCriticalFetch,
    mockFailures: criticalSurgeFailures,
  });

  console.log(`  Result 3: alerted=${result3.alerted}, pagedOnCall=${result3.pagedOnCall}, pdStatus=${result3.pagerDutyStatus}, dedupKey=${result3.pagerDutyDedupKey}`);
  if (!result3.alerted || !result3.pagedOnCall || result3.pagerDutyStatus !== 202 || !receivedPagerDutyPayload) {
    throw new Error('Test 3 Failed: PagerDuty on-call paging was not triggered for critical surge.');
  }

  const pdPayload = receivedPagerDutyPayload.payload;
  console.log(`  PagerDuty Summary: "${pdPayload.summary}"`);
  console.log(`  PagerDuty Severity: "${pdPayload.severity}"`);

  if (pdPayload.severity !== 'critical' || !pdPayload.summary.includes('12 failures')) {
    throw new Error('Test 3 Failed: PagerDuty payload structure is invalid or lacks critical severity.');
  }

  const slackHeader = receivedCriticalSlackPayload.blocks[0]?.text?.text;
  const slackOnCallNotice = receivedCriticalSlackPayload.blocks[1]?.text?.text;
  console.log(`  Slack Header: "${slackHeader}"`);
  console.log(`  Slack On-Call Notice: "${slackOnCallNotice}"`);

  if (!slackOnCallNotice || !slackOnCallNotice.includes('PAGERDUTY P1 ON-CALL ESCALATION TRIGGERED')) {
    throw new Error('Test 3 Failed: Slack payload missing P1 On-Call escalation banner.');
  }

  console.log('  ✓ Test 3 Passed: Successfully paged on-call engineer via PagerDuty and attached P1 banner in Slack.\n');

  console.log('======================================================');
  console.log('  ✅ ALL 3 DEAD-LETTER & PAGERDUTY TESTS PASSED!       ');
  console.log('======================================================');
}

runDeadLetterMonitorTests().catch((err) => {
  console.error('❌ Dead-letter & PagerDuty tests failed:', err);
  process.exit(1);
});
