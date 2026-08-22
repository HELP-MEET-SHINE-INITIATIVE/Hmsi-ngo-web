import {
  evaluateDeadLetterQueue,
  formatSlackPayload,
  type DeadLetterFailure,
} from './monitor_dead_letter_queue';

async function runDeadLetterMonitorTests() {
  console.log('======================================================');
  console.log('  STARTING DEAD-LETTER MONITOR & SLACK ALERT TESTS    ');
  console.log('======================================================\n');

  const mockFailures: DeadLetterFailure[] = [
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
  console.log('[TEST 1] Testing healthy queue below threshold (1 failure, threshold 3)...');
  const result1 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 5,
    mockFailures: mockFailures.slice(0, 1),
  });

  console.log(`  Result 1: alerted=${result1.alerted}, failureCount=${result1.failureCount}, threshold=${result1.threshold}`);
  if (result1.alerted || result1.failureCount !== 1) {
    throw new Error('Test 1 Failed: Should not trigger alert when failures are below threshold.');
  }
  console.log('  ✓ Test 1 Passed: Correctly identified healthy queue and suppressed alert.\n');

  // ----------------------------------------------------
  // TEST 2: Threshold Breached -> Dispatch to Mock Slack Webhook
  // ----------------------------------------------------
  console.log('[TEST 2] Testing threshold breach with mock Slack webhook (3 failures, threshold 2)...');
  let receivedSlackPayload: any = null;
  const mockSlackFetch: typeof fetch = async (url, init) => {
    receivedSlackPayload = JSON.parse(init?.body as string);
    return new Response('ok', { status: 200 });
  };

  const result2 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    slackWebhookUrl: 'https://hooks.slack.com/services/MOCK/WEBHOOK/12345',
    customFetch: mockSlackFetch,
    mockFailures,
  });

  console.log(`  Result 2: alerted=${result2.alerted}, failureCount=${result2.failureCount}, slackStatus=${result2.slackStatus}`);
  if (!result2.alerted || result2.slackStatus !== 200 || !receivedSlackPayload) {
    throw new Error('Test 2 Failed: Expected Slack webhook dispatch when threshold breached.');
  }
  console.log('  ✓ Test 2 Passed: Detected threshold breach and triggered Slack webhook successfully.\n');

  // ----------------------------------------------------
  // TEST 3: Validate Slack Block Kit Payload Structure
  // ----------------------------------------------------
  console.log('[TEST 3] Validating Slack Block Kit payload structure and fields...');
  const blocks = receivedSlackPayload.blocks;
  const headerBlock = blocks.find((b: any) => b.type === 'header');
  const sectionFields = blocks.find((b: any) => b.fields)?.fields;
  const actionButton = blocks.find((b: any) => b.type === 'actions')?.elements[0];

  console.log(`  Header: "${headerBlock?.text?.text}"`);
  console.log(`  Button URL: "${actionButton?.url}"`);

  if (!headerBlock || !headerBlock.text.text.includes('Dead-Letter')) {
    throw new Error('Test 3 Failed: Missing or invalid Slack header block.');
  }
  if (!actionButton || actionButton.url !== 'https://www.hmsi.org.ng/hmsi-control') {
    throw new Error('Test 3 Failed: Missing or invalid action button URL.');
  }
  if (!sectionFields || sectionFields.length < 4) {
    throw new Error('Test 3 Failed: Missing incident severity or affected units fields.');
  }
  console.log('  ✓ Test 3 Passed: Slack Block Kit structure conforms to schema specifications.\n');

  // ----------------------------------------------------
  // TEST 4: Upstream Slack Failure Handling (HTTP 500)
  // ----------------------------------------------------
  console.log('[TEST 4] Testing graceful error handling when Slack webhook returns HTTP 500...');
  const mockFailingSlackFetch: typeof fetch = async () => {
    return new Response('Internal Server Error', { status: 500 });
  };

  const result4 = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    slackWebhookUrl: 'https://hooks.slack.com/services/FAIL/WEBHOOK/99999',
    customFetch: mockFailingSlackFetch,
    mockFailures,
  });

  console.log(`  Result 4: alerted=${result4.alerted}, slackStatus=${result4.slackStatus}, error="${result4.slackError}"`);
  if (!result4.alerted || result4.slackStatus !== 500 || !result4.slackError?.includes('500')) {
    throw new Error('Test 4 Failed: Expected graceful handling of Slack HTTP 500 error.');
  }
  console.log('  ✓ Test 4 Passed: Gracefully trapped Slack webhook error without crashing runner.\n');

  console.log('======================================================');
  console.log('  ✅ ALL 4 DEAD-LETTER MONITOR TESTS PASSED!          ');
  console.log('======================================================');
}

runDeadLetterMonitorTests().catch((err) => {
  console.error('❌ Dead-letter monitor tests failed:', err);
  process.exit(1);
});
