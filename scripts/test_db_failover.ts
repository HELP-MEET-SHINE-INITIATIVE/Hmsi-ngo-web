import {
  DisasterRecoveryDatabaseManager,
  type BufferedAuditLog,
} from '../lib/databaseFailover';

async function runDisasterRecoverySimulation() {
  console.log('================================================================');
  console.log('  STARTING MULTI-REGION DATABASE DISASTER RECOVERY SIMULATION   ');
  console.log('================================================================\n');

  const drManager = new DisasterRecoveryDatabaseManager(
    'eu-west-1 (Primary DC - London)',
    'af-south-1 (Standby DR - Cape Town)'
  );

  // ----------------------------------------------------------------
  // PHASE 1: Normal Operations (Primary DC Active)
  // ----------------------------------------------------------------
  console.log('[PHASE 1] Normal Operations: Primary Node Active...');
  const initialLogs: Omit<BufferedAuditLog, 'bufferedAt'>[] = [
    {
      id: 'log-norm-1',
      regional_office_id: 'off-hq',
      alert_type: 'NATIONAL_GOVERNANCE_DIGEST_GREEN',
      trigger_metric_value: 90.1,
      threshold_value: 85.0,
      recipient_emails: ['contact@hmsi.org.ng', 'trustees@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'log-norm-2',
      regional_office_id: 'off-edo',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_GREEN',
      trigger_metric_value: 92.0,
      threshold_value: 85.0,
      recipient_emails: ['edo-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: 'log-norm-3',
      regional_office_id: 'off-lagos',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_AMBER',
      trigger_metric_value: 80.0,
      threshold_value: 85.0,
      recipient_emails: ['lagos-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 2400000).toISOString(),
    },
  ];

  for (const log of initialLogs) {
    const res = await drManager.logAuditEvent(log);
    console.log(`  ✓ Log ${log.id} written to: ${res.targetNode} (Buffered: ${res.buffered})`);
  }

  const statusP1 = drManager.getDRHealthStatus();
  console.log(`  Phase 1 Health: State=${statusP1.state}, ActiveNode=${statusP1.activeNode}, CircuitBreaker=${statusP1.circuitBreaker}\n`);
  if (statusP1.state !== 'PRIMARY_ACTIVE' || statusP1.circuitBreaker !== 'CLOSED') {
    throw new Error('Phase 1 Failed: Primary should be active with closed circuit breaker.');
  }

  // ----------------------------------------------------------------
  // PHASE 2: Catastrophic Primary Outage & Emergency WAL Buffering
  // ----------------------------------------------------------------
  console.log('[PHASE 2] Simulating Primary DC Failure (Connection Drop / Outage)...');
  drManager.setPrimaryHealth(false); // Tripped circuit breaker

  const outageLogs: Omit<BufferedAuditLog, 'bufferedAt'>[] = [
    {
      id: 'log-outage-1',
      regional_office_id: 'off-delta',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_AMBER',
      trigger_metric_value: 76.0,
      threshold_value: 85.0,
      recipient_emails: ['delta-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'log-outage-2',
      regional_office_id: 'off-remote',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_GREEN',
      trigger_metric_value: 85.0,
      threshold_value: 85.0,
      recipient_emails: ['digital-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: 'log-outage-3',
      regional_office_id: null,
      alert_type: 'CRITICAL_DATA_PROTECTION_DEFICIT_ERROR',
      trigger_metric_value: 68.0,
      threshold_value: 80.0,
      recipient_emails: ['safeguarding@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 600000).toISOString(),
      error_message: 'Primary DB down: buffered in emergency WAL queue',
    },
  ];

  for (const log of outageLogs) {
    const res = await drManager.logAuditEvent(log);
    console.log(`  ⚠️ Outage Log ${log.id} captured by: ${res.targetNode} (Buffered: ${res.buffered})`);
    if (!res.buffered) {
      throw new Error(`Phase 2 Failed: Log ${log.id} should have been buffered during primary outage.`);
    }
  }

  const statusP2 = drManager.getDRHealthStatus();
  console.log(`  Phase 2 Health: State=${statusP2.state}, CircuitBreaker=${statusP2.circuitBreaker}, BufferedEvents=${statusP2.bufferedEventsCount}`);

  // Verify Admin Console reads return all 6 logs (3 persistent + 3 buffered) seamlessly
  const currentLogsP2 = drManager.getAuditLogs();
  console.log(`  Admin Console Read Count during outage: ${currentLogsP2.length} logs (Expected: 6)`);
  if (currentLogsP2.length !== 6) {
    throw new Error(`Phase 2 Failed: Expected 6 logs returned during failover read, got ${currentLogsP2.length}`);
  }
  console.log('  ✓ Phase 2 Passed: All in-flight audit logs buffered safely with zero dropped writes.\n');

  // ----------------------------------------------------------------
  // PHASE 3: Standby Promotion & Idempotent WAL Buffer Replay
  // ----------------------------------------------------------------
  console.log('[PHASE 3] Promoting Standby DR Replica in Cape Town to Primary Master...');
  const replayResult = drManager.promoteStandbyToPrimary();
  console.log(`  Replayed Events: ${replayResult.replayedCount}`);
  console.log(`  Calculated RPO:   ${replayResult.rpoSeconds} seconds (0 data loss)`);
  console.log(`  Calculated RTO:   ${replayResult.rtoSeconds.toFixed(2)} seconds`);

  const statusP3 = drManager.getDRHealthStatus();
  console.log(`  Phase 3 Health: State=${statusP3.state}, ActiveNode=${statusP3.activeNode}, Region=${statusP3.activeRegion}, BufferSize=${statusP3.bufferedEventsCount}`);

  if (statusP3.state !== 'STANDBY_ACTIVE' || statusP3.bufferedEventsCount !== 0 || replayResult.rpoSeconds !== 0) {
    throw new Error('Phase 3 Failed: Standby promotion did not achieve RPO=0 or flush WAL buffer.');
  }
  console.log('  ✓ Phase 3 Passed: Standby promoted and emergency buffer replayed idempotently.\n');

  // ----------------------------------------------------------------
  // PHASE 4: Primary Restoration & Reconciled Failback
  // ----------------------------------------------------------------
  console.log('[PHASE 4] Primary DC Restored -> Executing Reconciled Failback...');
  const failbackResult = drManager.failbackToPrimary();
  console.log(`  Reconciled Logs into Primary: ${failbackResult.reconciledCount}`);

  const statusP4 = drManager.getDRHealthStatus();
  console.log(`  Phase 4 Health: State=${statusP4.state}, ActiveNode=${statusP4.activeNode}, CircuitBreaker=${statusP4.circuitBreaker}`);

  const finalLogs = drManager.getAuditLogs();
  console.log(`  Final Total Verified Logs: ${finalLogs.length} (Expected: 6)`);

  if (statusP4.state !== 'PRIMARY_ACTIVE' || statusP4.circuitBreaker !== 'CLOSED' || finalLogs.length !== 6) {
    throw new Error('Phase 4 Failed: Reconciled failback did not restore primary active state with full log integrity.');
  }

  console.log('\n================================================================');
  console.log('  ✅ ALL 4 DISASTER RECOVERY SIMULATION PHASES PASSED (RPO=0s)  ');
  console.log('================================================================');
}

runDisasterRecoverySimulation().catch((err) => {
  console.error('❌ Disaster recovery simulation failed:', err);
  process.exit(1);
});
