export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
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

export async function sendResendEmailWithRetry(
  apiKey: string,
  payload: ResendEmailPayload,
  options: RetryOptions = {}
): Promise<DispatchResult> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const fetchFn = options.customFetch ?? fetch;

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
        };
      }

      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      lastError = errorData.message || `Resend HTTP Error ${response.status}`;

      const retryable = isTransientError(response.status, lastError);

      // If permanent client error (e.g. 400 Bad Request or 422 Invalid Email), do not retry
      if (!retryable) {
        return {
          ok: false,
          attempts: attempt,
          status: response.status,
          error: lastError,
          isTransient: false,
        };
      }

      // If rate-limited with Retry-After header
      const retryAfterHeader = response.headers.get('retry-after');
      let backoffMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)) + Math.random() * 50;
      if (retryAfterHeader) {
        const retryAfterSec = parseFloat(retryAfterHeader);
        if (!isNaN(retryAfterSec) && retryAfterSec > 0) {
          backoffMs = Math.min(maxDelayMs, retryAfterSec * 1000);
        }
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    } catch (networkErr) {
      lastError = networkErr instanceof Error ? networkErr.message : 'Network partition / connection failed';
      const retryable = isTransientError(undefined, lastError);

      if (!retryable || attempt >= maxRetries) {
        break;
      }

      const backoffMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1)) + Math.random() * 50;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return {
    ok: false,
    attempts: attempt,
    status: lastStatus,
    error: lastError || 'Max retries exhausted under degraded network conditions.',
    isTransient: isTransientError(lastStatus, lastError),
  };
}
