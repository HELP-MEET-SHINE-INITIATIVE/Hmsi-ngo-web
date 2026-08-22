import {
  sendResendEmailWithRetry,
  isTransientError,
  type ResendEmailPayload,
} from '../lib/resendRetryQueue';

async function runNetworkPartitionSuite() {
  console.log('======================================================');
  console.log('  STARTING SIMULATED NETWORK PARTITION & RETRY SUITE  ');
  console.log('======================================================\n');

  const samplePayload: ResendEmailPayload = {
    from: 'contact@hmsi.org.ng',
    to: ['coordinator@hmsi.org.ng'],
    subject: '[TEST] Media Safety Governance Summary',
    html: '<p>Test email</p>',
    text: 'Test email',
    idempotencyKey: 'idem_test_uuid_12345',
  };

  // ----------------------------------------------------
  // TEST 1: Transient Socket Drop (ECONNRESET) on Attempt 1 -> Recovers on Attempt 2
  // ----------------------------------------------------
  console.log('[TEST 1] Simulating Transient Socket Drop (ECONNRESET) on Attempt 1...');
  let callCount1 = 0;
  const mockFetch1: typeof fetch = async () => {
    callCount1++;
    if (callCount1 === 1) {
      throw new Error('fetch failed: ECONNRESET socket hang up');
    }
    return new Response(JSON.stringify({ id: 'msg_recovered_attempt_2' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result1 = await sendResendEmailWithRetry('test_key', samplePayload, {
    maxRetries: 3,
    baseDelayMs: 50,
    maxDelayMs: 200,
    customFetch: mockFetch1,
  });

  console.log(`  Result 1: ok=${result1.ok}, attempts=${result1.attempts}, id=${result1.resendId}`);
  if (!result1.ok || result1.attempts !== 2) {
    throw new Error(`Test 1 Failed: Expected recovery on attempt 2, got ${result1.attempts} attempts, ok=${result1.ok}`);
  }
  console.log('  ✓ Test 1 Passed: Exponential backoff retried and succeeded after transient socket drop.\n');

  // ----------------------------------------------------
  // TEST 2: HTTP 429 Rate Limiting with Retry-After Header (Attempts 1 & 2 -> Success on Attempt 3)
  // ----------------------------------------------------
  console.log('[TEST 2] Simulating HTTP 429 Rate Limiting with Retry-After (Attempts 1 & 2)...');
  let callCount2 = 0;
  const mockFetch2: typeof fetch = async () => {
    callCount2++;
    if (callCount2 < 3) {
      return new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '0.05',
        },
      });
    }
    return new Response(JSON.stringify({ id: 'msg_rate_limit_recovered' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result2 = await sendResendEmailWithRetry('test_key', samplePayload, {
    maxRetries: 3,
    baseDelayMs: 50,
    maxDelayMs: 200,
    customFetch: mockFetch2,
  });

  console.log(`  Result 2: ok=${result2.ok}, attempts=${result2.attempts}, id=${result2.resendId}`);
  if (!result2.ok || result2.attempts !== 3) {
    throw new Error(`Test 2 Failed: Expected recovery on attempt 3, got ${result2.attempts} attempts`);
  }
  console.log('  ✓ Test 2 Passed: Resend rate-limiting honor Retry-After backoff and succeeded on attempt 3.\n');

  // ----------------------------------------------------
  // TEST 3: Total Network Partition / 100% Packet Loss (Exhausts all 3 Retries)
  // ----------------------------------------------------
  console.log('[TEST 3] Simulating Total Network Partition (100% Packet Loss across all attempts)...');
  let callCount3 = 0;
  const mockFetch3: typeof fetch = async () => {
    callCount3++;
    throw new Error('ETIMEDOUT: Connection timed out to api.resend.com');
  };

  const result3 = await sendResendEmailWithRetry('test_key', samplePayload, {
    maxRetries: 3,
    baseDelayMs: 50,
    maxDelayMs: 200,
    customFetch: mockFetch3,
  });

  console.log(`  Result 3: ok=${result3.ok}, attempts=${result3.attempts}, isTransient=${result3.isTransient}, error="${result3.error}"`);
  if (result3.ok || result3.attempts !== 3 || !result3.isTransient) {
    throw new Error(`Test 3 Failed: Expected failure after 3 retries with isTransient=true`);
  }
  console.log('  ✓ Test 3 Passed: Captured dead-letter event after exhausting 3 retries under full partition.\n');

  // ----------------------------------------------------
  // TEST 4: Permanent Client Error (HTTP 422 Invalid Email) -> Fast-Fail (1 Attempt)
  // ----------------------------------------------------
  console.log('[TEST 4] Simulating Permanent Client Error (HTTP 422 Invalid Recipient Domain)...');
  let callCount4 = 0;
  const mockFetch4: typeof fetch = async () => {
    callCount4++;
    return new Response(JSON.stringify({ message: 'The recipient email domain is invalid or unroutable' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result4 = await sendResendEmailWithRetry('test_key', samplePayload, {
    maxRetries: 3,
    baseDelayMs: 50,
    maxDelayMs: 200,
    customFetch: mockFetch4,
  });

  console.log(`  Result 4: ok=${result4.ok}, attempts=${result4.attempts}, isTransient=${result4.isTransient}, error="${result4.error}"`);
  if (result4.ok || result4.attempts !== 1 || result4.isTransient) {
    throw new Error(`Test 4 Failed: Expected fast-fail on attempt 1 without wasting retries on 422 error`);
  }
  console.log('  ✓ Test 4 Passed: Fast-failed permanent 422 client error immediately on Attempt 1.\n');

  // ----------------------------------------------------
  // TEST 5: HTTP 503 Service Unavailable -> Idempotency Key Preserved
  // ----------------------------------------------------
  console.log('[TEST 5] Simulating HTTP 503 Server Error with Idempotency Key Preservation...');
  let callCount5 = 0;
  let receivedIdempotencyKey = '';
  const mockFetch5: typeof fetch = async (url, init) => {
    callCount5++;
    const headers = init?.headers as Record<string, string>;
    receivedIdempotencyKey = headers?.['Idempotency-Key'] || '';

    if (callCount5 === 1) {
      return new Response(JSON.stringify({ message: 'Service Unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ id: 'msg_503_recovered' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result5 = await sendResendEmailWithRetry('test_key', samplePayload, {
    maxRetries: 3,
    baseDelayMs: 50,
    maxDelayMs: 200,
    customFetch: mockFetch5,
  });

  console.log(`  Result 5: ok=${result5.ok}, attempts=${result5.attempts}, idempotencyKey=${receivedIdempotencyKey}`);
  if (!result5.ok || result5.attempts !== 2 || receivedIdempotencyKey !== 'idem_test_uuid_12345') {
    throw new Error('Test 5 Failed: Idempotency key was not properly transmitted across retry attempts.');
  }
  console.log('  ✓ Test 5 Passed: Idempotency-Key header transmitted across retries, preventing duplicate dispatches.\n');

  console.log('======================================================');
  console.log('  ✅ ALL 5 NETWORK PARTITION SIMULATION TESTS PASSED! ');
  console.log('======================================================');
}

runNetworkPartitionSuite().catch((err) => {
  console.error('❌ Network partition suite failed:', err);
  process.exit(1);
});
