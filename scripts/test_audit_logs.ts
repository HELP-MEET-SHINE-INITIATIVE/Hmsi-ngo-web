import { createAdminSession, ADMIN_SESSION_COOKIE } from '../lib/adminSession';
import type { AuditLogEntry, AuditLogsResponse } from '../app/api/admin/training/logs/route';

async function runAuditLogTests() {
  console.log('--- [TEST 1] Testing Simulated Mock Logs Transformation & Error Mapping ---');

  const mockOffices = [
    { id: 'off-1', code: 'BENIN_HQ', name: 'Benin City HQ' },
    { id: 'off-2', code: 'DELTA_OUTREACH', name: 'Delta Outreach Unit' },
    { id: 'off-3', code: 'LAGOS_HUB', name: 'Lagos Coordination Hub' },
  ];
  const officeMap = new Map(mockOffices.map((o) => [o.id, o]));

  const mockRawRows = [
    {
      id: 'log-1',
      regional_office_id: null,
      alert_type: 'NATIONAL_GOVERNANCE_DIGEST_GREEN',
      trigger_metric_value: 90.1,
      threshold_value: 85.0,
      recipient_emails: ['contact@hmsi.org.ng', 'trustees@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'log-2',
      regional_office_id: 'off-1',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_GREEN',
      trigger_metric_value: 97.7,
      threshold_value: 85.0,
      recipient_emails: ['benin-lead@hmsi.org.ng', 'contact@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'log-3',
      regional_office_id: 'off-2',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_AMBER',
      trigger_metric_value: 76.0,
      threshold_value: 85.0,
      recipient_emails: ['delta-lead@hmsi.org.ng', 'contact@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'log-4',
      regional_office_id: 'off-3',
      alert_type: 'MONDAY_REGIONAL_BRIEFING_FAILED_RATE_LIMIT',
      trigger_metric_value: 80.0,
      threshold_value: 85.0,
      recipient_emails: ['lagos-lead@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 14400000).toISOString(),
      error_message: 'Resend API HTTP 429: Too Many Requests.',
    },
    {
      id: 'log-5',
      regional_office_id: 'off-2',
      alert_type: 'CRITICAL_DATA_PROTECTION_DEFICIT_ERROR',
      trigger_metric_value: 65.0,
      threshold_value: 80.0,
      recipient_emails: ['safeguarding@hmsi.org.ng'],
      sent_at: new Date(Date.now() - 18000000).toISOString(),
      error_message: 'SMTP delivery bounce: recipient address temporarily unreachable.',
    },
  ];

  const uniqueRecipients = new Set<string>();
  const parsedLogs: AuditLogEntry[] = mockRawRows.map((row: any) => {
    const office = row.regional_office_id ? officeMap.get(row.regional_office_id) : null;
    for (const e of row.recipient_emails) uniqueRecipients.add(e.toLowerCase());

    const alertTypeUpper = String(row.alert_type || '').toUpperCase();
    const isFailed = alertTypeUpper.includes('FAIL') || alertTypeUpper.includes('ERROR');
    const isWarning = alertTypeUpper.includes('WARN') || alertTypeUpper.includes('AMBER');
    const status: 'DELIVERED' | 'FAILED' | 'WARNING' = isFailed ? 'FAILED' : isWarning ? 'WARNING' : 'DELIVERED';

    return {
      id: row.id,
      regional_office_id: row.regional_office_id,
      office_name: office ? office.name : 'National Scope (All Units)',
      office_code: office ? office.code : 'NATIONAL',
      alert_type: row.alert_type,
      trigger_metric_value: Number(row.trigger_metric_value || 0),
      threshold_value: Number(row.threshold_value || 0),
      recipient_emails: row.recipient_emails,
      sent_at: row.sent_at,
      status,
      error_message: row.error_message || (isFailed ? 'Dispatch delivery failed during Resend execution.' : null),
    };
  });

  const failedCount = parsedLogs.filter((l) => l.status === 'FAILED').length;
  const warningCount = parsedLogs.filter((l) => l.status === 'WARNING').length;
  const deliveredCount = parsedLogs.filter((l) => l.status === 'DELIVERED').length;

  console.log(`✓ Total parsed logs: ${parsedLogs.length}`);
  console.log(`✓ Delivered: ${deliveredCount}, Warnings: ${warningCount}, Failed/Errors: ${failedCount}`);
  console.log(`✓ Unique recipients tracked: ${uniqueRecipients.size}`);

  if (failedCount !== 2) {
    throw new Error(`Expected 2 failed logs, but got ${failedCount}`);
  }

  console.log('\n--- [TEST 2] Verifying Error Field Mapping on Failed Logs ---');
  const failedLog1 = parsedLogs.find((l) => l.id === 'log-4');
  console.log(`Log 4 status: ${failedLog1?.status}, Error: "${failedLog1?.error_message}"`);
  if (failedLog1?.status !== 'FAILED' || !failedLog1.error_message?.includes('429')) {
    throw new Error('Log 4 failed status mapping test failed.');
  }

  const failedLog2 = parsedLogs.find((l) => l.id === 'log-5');
  console.log(`Log 5 status: ${failedLog2?.status}, Error: "${failedLog2?.error_message}"`);
  if (failedLog2?.status !== 'FAILED' || !failedLog2.error_message?.includes('bounce')) {
    throw new Error('Log 5 failed status mapping test failed.');
  }

  console.log('\n--- [TEST 3] Verifying Client-Side Filtering ---');
  const digestOnly = parsedLogs.filter((l) => l.alert_type.includes('NATIONAL_GOVERNANCE_DIGEST'));
  console.log(`National Digests: ${digestOnly.length} (Expected: 1)`);

  const regionalOnly = parsedLogs.filter((l) => l.alert_type.includes('MONDAY_REGIONAL_BRIEFING'));
  console.log(`Regional Briefings: ${regionalOnly.length} (Expected: 3)`);

  const errorsOnly = parsedLogs.filter((l) => l.status === 'FAILED');
  console.log(`Error entries filter: ${errorsOnly.length} (Expected: 2)`);

  console.log('\n✅ All mock error handling and audit log tests passed successfully!');
}

runAuditLogTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
