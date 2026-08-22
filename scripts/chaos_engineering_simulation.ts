import {
  DisasterRecoveryDatabaseManager,
  type BufferedAuditLog,
} from '../lib/databaseFailover';
import {
  sendResendEmailWithRetry,
  type ResendEmailPayload,
} from '../lib/resendRetryQueue';
import {
  evaluateDeadLetterQueue,
  type DeadLetterFailure,
} from './monitor_dead_letter_queue';

async function runCompoundedChaosSimulation() {
  console.log('================================================================');
  console.log('  STARTING COMPOUNDED CHAOS SIMULATION: DB OUTAGE + NETWORK DROP');
  console.log('================================================================\n');

  // Initialize Disaster Recovery Manager
  const drManager = new DisasterRecoveryDatabaseManager(
    'eu-west-1 (Primary DC - London)',
    'af-south-1 (Standby DR - Cape Town)'
  );

  // ----------------------------------------------------------------
  // STAGE 1: Simulating Normal Baseline Before Chaos
  // ----------------------------------------------------------------
  console.log('[STAGE 1] Establishing Baseline System State...');
  const baselineRes = await drManager.logAuditEvent({
    id: 'baseline-log-01',
    regional_office_id: 'off-hq',
    alert_type: 'NATIONAL_GOVERNANCE_DIGEST_GREEN',
    trigger_metric_value: 90.1,
    threshold_value: 85.0,
    recipient_emails: ['contact@hmsi.org.ng'],
    sent_at: new Date(Date.now() - 3600000).toISOString(),
  });
  console.log(`  ✓ Baseline write to: ${baselineRes.targetNode} (Buffered: ${baselineRes.buffered})`);
  console.log('  ✓ Baseline health: 100% Synced, Circuit Breaker CLOSED.\n');

  // ----------------------------------------------------------------
  // STAGE 2: Injecting Compounded Chaos (DB Crash + Resend Outage)
  // ----------------------------------------------------------------
  console.log('[STAGE 2] INJECTING COMPOUNDED FAULTS SIMULTANEOUSLY:');
  console.log('  🔥 FAULT 1: Primary Database crashed (Connection Refused / Read-Write Master Down)');
  console.log('  🔥 FAULT 2: Resend Email Gateway partitioned (ETIMEDOUT & HTTP 503 Server Drops)\n');

  drManager.setPrimaryHealth(false); // Trips DB circuit breaker to OPEN

  let resendNetworkUp = false;
  let mockResendCalls = 0;

  const chaoticMockFetch: typeof fetch = async (url, init) => {
    mockResendCalls++;
    if (!resendNetworkUp) {
      if (mockResendCalls % 2 === 0) {
        return new Response(JSON.stringify({ message: 'HTTP 503 Upstream Email Gateway Down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('ETIMEDOUT: Connection timed out to api.resend.com');
    }
    return new Response(JSON.stringify({ id: `msg_chaos_recovered_${mockResendCalls}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // ----------------------------------------------------------------
  // STAGE 3: In-Flight Cron Dispatch Under Compounded Chaos
  // ----------------------------------------------------------------
  console.log('[STAGE 3] Executing 10 In-Flight Email Dispatches Under Compounded Chaos...');
  const generatedFailures: DeadLetterFailure[] = [];

  for (let i = 1; i <= 10; i++) {
    const payload: ResendEmailPayload = {
      from: 'contact@hmsi.org.ng',
      to: [`lead-${i}@hmsi.org.ng`],
      subject: `[MONDAY BRIEFING] Regional Briefing Unit ${i}`,
      html: `<p>Regional briefing content for unit ${i}</p>`,
      text: `Regional briefing content for unit ${i}`,
      idempotencyKey: `idem_chaos_key_unit_${i}_2026-08-22`,
    };

    // 1. Attempt Email Dispatch (will fail 3 retries gracefully)
    const dispatch = await sendResendEmailWithRetry('test_chaos_key', payload, {
      maxRetries: 3,
      baseDelayMs: 20,
      maxDelayMs: 50,
      customFetch: chaoticMockFetch,
    });

    // 2. Attempt Audit Logging into Database (Primary is DOWN -> Safe WAL Buffering)
    const failureLog: Omit<BufferedAuditLog, 'bufferedAt'> = {
      id: `fail-chaos-log-${i}`,
      regional_office_id: i % 2 === 0 ? 'off-lagos' : 'off-delta',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED',
      trigger_metric_value: 75.0,
      threshold_value: 85.0,
      recipient_emails: payload.to,
      sent_at: new Date(Date.now() - (10 - i) * 60000).toISOString(),
      error_message: dispatch.error,
    };

    const logRes = await drManager.logAuditEvent(failureLog);

    generatedFailures.push({
      ...failureLog,
      office_name: i % 2 === 0 ? 'Lagos Coordination Hub' : 'Delta Outreach Unit',
      office_code: i % 2 === 0 ? 'LAGOS_HUB' : 'DELTA_OUTREACH',
    });

    console.log(`  [Dispatch ${i}/10] Email: FAILED (${dispatch.attempts} retries) -> Audit Log: Buffered in [${logRes.targetNode}]`);
  }

  const drStatusP3 = drManager.getDRHealthStatus();
  console.log(`\n  Emergency WAL Buffer Count: ${drStatusP3.bufferedEventsCount}/10 events safely captured.`);
  if (drStatusP3.bufferedEventsCount !== 10) {
    throw new Error('Stage 3 Failed: All 10 failed dispatch logs should be safely buffered in emergency WAL.');
  }

  // ----------------------------------------------------------------
  // STAGE 4: Automated Dead-Letter Queue Health Check & PagerDuty P1 Paging
  // ----------------------------------------------------------------
  console.log('\n[STAGE 4] Triggering 08:30 UTC Dead-Letter Health Check Under Compounded Chaos...');
  let pagerDutyPaged = false;
  let p1SlackBannerRendered = false;

  const mockMonitoringFetch: typeof fetch = async (url, init) => {
    if (String(url).includes('pagerduty')) {
      pagerDutyPaged = true;
      return new Response(JSON.stringify({ status: 'success', dedup_key: 'pd_chaos_dedup_key' }), { status: 202 });
    }
    if (String(url).includes('slack')) {
      const body = JSON.parse(init?.body as string);
      p1SlackBannerRendered = body.blocks.some((b: any) => b.text?.text?.includes('PAGERDUTY P1 ON-CALL ESCALATION TRIGGERED'));
      return new Response('ok', { status: 200 });
    }
    return new Response('ok', { status: 200 });
  };

  const monitorResult = await evaluateDeadLetterQueue({
    lookbackHours: 24,
    failureThreshold: 2,
    pagerDutyThreshold: 10,
    slackWebhookUrl: 'https://hooks.slack.com/services/CHAOS/SLACK_ALERTS',
    pagerDutyRoutingKey: 'pd_chaos_critical_routing_key',
    customFetch: mockMonitoringFetch,
    mockFailures: generatedFailures,
  });

  console.log(`  Monitor Result: failureCount=${monitorResult.failureCount}, pagedOnCall=${monitorResult.pagedOnCall}`);
  console.log(`  PagerDuty Dispatch: ${pagerDutyPaged ? 'HTTP 202 Enqueued (P1 On-Call Paged)' : 'FAILED'}`);
  console.log(`  Slack P1 Banner: ${p1SlackBannerRendered ? 'Injected Successfully' : 'FAILED'}`);

  if (!monitorResult.pagedOnCall || !pagerDutyPaged || !p1SlackBannerRendered) {
    throw new Error('Stage 4 Failed: Critical failure count of 10 should trigger both PagerDuty P1 and Slack banner.');
  }
  console.log('  ✓ Stage 4 Passed: On-call engineers paged immediately via PagerDuty.\n');

  // ----------------------------------------------------------------
  // STAGE 5: Disaster Recovery Promotion & Self-Healing Replay
  // ----------------------------------------------------------------
  console.log('[STAGE 5] HEALING PHASE: Promoting Standby DR Replica & Re-Dispatching Email Queue...');
  
  // 1. Promote Standby DB Replica in Cape Town
  const replayResult = drManager.promoteStandbyToPrimary();
  console.log(`  ✓ Promoted Standby to Master. Replayed ${replayResult.replayedCount} buffered events.`);
  console.log(`  ✓ RPO Achieved: ${replayResult.rpoSeconds} seconds (Zero Data Loss)`);
  console.log(`  ✓ RTO Achieved: ${replayResult.rtoSeconds.toFixed(2)} seconds`);

  // 2. Heal Resend Network & Re-dispatch with Idempotency Keys
  resendNetworkUp = true;
  console.log('  ✓ Upstream Resend Email Network Healed.');

  let successfulReDispatches = 0;
  for (let i = 1; i <= 10; i++) {
    const payload: ResendEmailPayload = {
      from: 'contact@hmsi.org.ng',
      to: [`lead-${i}@hmsi.org.ng`],
      subject: `[MONDAY BRIEFING] Regional Briefing Unit ${i}`,
      html: `<p>Regional briefing content for unit ${i}</p>`,
      text: `Regional briefing content for unit ${i}`,
      idempotencyKey: `idem_chaos_key_unit_${i}_2026-08-22`, // Identical idempotency key
    };

    const reDispatch = await sendResendEmailWithRetry('test_chaos_key', payload, {
      maxRetries: 3,
      baseDelayMs: 20,
      customFetch: chaoticMockFetch,
    });

    if (reDispatch.ok) {
      successfulReDispatches++;
    }
  }

  console.log(`  ✓ Successfully Re-dispatched: ${successfulReDispatches}/10 emails with matching Idempotency-Keys.`);

  // Verify Admin Console Read Consistency
  const finalLogs = drManager.getAuditLogs();
  console.log(`  ✓ Final Admin Audit Log Count: ${finalLogs.length} verified entries (1 baseline + 10 failure logs).`);

  if (successfulReDispatches !== 10 || finalLogs.length !== 11 || replayResult.rpoSeconds !== 0) {
    throw new Error('Stage 5 Failed: System did not achieve 100% data recovery and clean re-dispatch.');
  }

  console.log('\n================================================================');
  console.log('  ✅ COMPOUNDED CHAOS SIMULATION PASSED WITH ZERO DATA LOSS!    ');
  console.log('================================================================');
}

runCompoundedChaosSimulation().catch((err) => {
  console.error('❌ Compounded chaos simulation failed:', err);
  process.exit(1);
});
