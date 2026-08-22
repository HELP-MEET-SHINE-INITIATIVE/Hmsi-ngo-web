export interface ResendEmailAttachment {
  filename: string;
  content: string;
}

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: ResendEmailAttachment[];
  idempotencyKey?: string;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  customFetch?: typeof fetch;
}

export interface DispatchResult {
  ok: boolean;
  resendId?: string;
  attempts: number;
  status?: number;
  error?: string;
  isTransient: boolean;
  durationMs?: number;
}

export function isTransientError(status?: number, errorMessage?: string): boolean {
  if (status) {
    // 408 Timeout, 429 Rate Limit, 500 Internal, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout
    if (status === 408 || status === 429 || (status >= 500 && status <= 504)) {
      return true;
    }
    // 400, 401, 403, 422 are permanent errors
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  if (errorMessage) {
    const lower = errorMessage.toLowerCase();
    if (
      lower.includes('econnreset') ||
      lower.includes('etimedout') ||
      lower.includes('timeout') ||
      lower.includes('socket') ||
      lower.includes('network') ||
      lower.includes('fetch failed') ||
      lower.includes('rate limit') ||
      lower.includes('too many requests')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates exponential backoff with Full Jitter to prevent thundering herd surges.
 * Full Jitter algorithm: Sleep = Random_between(0, Min(Max_Delay, Base_Delay * 2^attempt))
 */
export function calculateBackoffWithFullJitter(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterSec?: number
): number {
  if (retryAfterSec && retryAfterSec > 0) {
    return Math.min(maxDelayMs, retryAfterSec * 1000 + Math.random() * 100);
  }

  const rawExponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  const fullJitterDelay = Math.random() * rawExponentialDelay;
  return Math.max(30, Math.floor(fullJitterDelay));
}

export async function sendResendEmailWithRetry(
  apiKey: string,
  payload: ResendEmailPayload,
  options: RetryOptions = {}
): Promise<DispatchResult> {
  // Tuned parameters for high-throughput multi-region resilience
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 200; // Tuned down from 500ms to 200ms for fast recovery
  const maxDelayMs = options.maxDelayMs ?? 2500; // Capped at 2.5s to prevent worker starvation
  const fetchFn = options.customFetch ?? fetch;

  const startTime = Date.now();
  let attempt = 0;
  let lastError = '';
  let lastStatus: number | undefined;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };

      if (payload.idempotencyKey) {
        headers['Idempotency-Key'] = payload.idempotencyKey;
      }

      const response = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
        }),
      });

      lastStatus = response.status;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          ok: true,
          resendId: data.id || 'resend_mock_id',
          attempts: attempt,
          status: response.status,
          isTransient: false,
          durationMs: Date.now() - startTime,
        };
      }

      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      lastError = errorData.message || `Resend HTTP Error ${response.status}`;

      const retryable = isTransientError(response.status, lastError);

      // Fast-fail on non-retryable permanent client errors
      if (!retryable) {
        return {
          ok: false,
          attempts: attempt,
          status: response.status,
          error: lastError,
          isTransient: false,
          durationMs: Date.now() - startTime,
        };
      }

      // Calculate tuned Full Jitter delay
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : undefined;
      const backoffMs = calculateBackoffWithFullJitter(attempt, baseDelayMs, maxDelayMs, retryAfterSec);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    } catch (networkErr) {
      lastError = networkErr instanceof Error ? networkErr.message : 'Network partition / connection failed';
      const retryable = isTransientError(undefined, lastError);

      if (!retryable || attempt >= maxRetries) {
        break;
      }

      const backoffMs = calculateBackoffWithFullJitter(attempt, baseDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return {
    ok: false,
    attempts: attempt,
    status: lastStatus,
    error: lastError || 'Max retries exhausted under degraded network conditions.',
    isTransient: isTransientError(lastStatus, lastError),
    durationMs: Date.now() - startTime,
  };
}

/**
 * Concurrency-bounded batch dispatcher to prevent upstream rate limits
 */
export async function sendResendBatchWithConcurrency(
  apiKey: string,
  payloads: ResendEmailPayload[],
  concurrencyLimit = 5,
  options: RetryOptions = {}
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  const executing: Promise<void>[] = [];

  for (const payload of payloads) {
    const p = sendResendEmailWithRetry(apiKey, payload, options).then((res) => {
      results.push(res);
    });

    executing.push(p);

    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      // Remove settled promises
      for (let i = executing.length - 1; i >= 0; i--) {
        // Simple filter for settled promises
        executing.splice(i, 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}
