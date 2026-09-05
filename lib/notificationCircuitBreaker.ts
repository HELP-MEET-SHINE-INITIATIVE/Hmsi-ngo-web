import 'server-only';

export type NotificationProvider = 'slack' | 'pagerduty';
export type ProviderFailureCode = 'timeout' | 'rate_limited' | 'server_error' | 'network_error' | 'client_error';
export type CircuitState = 'closed' | 'open' | 'half_open';

export type CircuitBreakerOptions = {
  failureThreshold: number;
  openMs: number;
  maxTimeoutMs: number;
  now?: () => number;
};

export type DeliveryOptions = {
  timeoutMs?: number;
  retryAfterMs?: number;
};

export type DeliveryResult =
  | { ok: true; provider: NotificationProvider; latencyMs: number }
  | { ok: false; provider: NotificationProvider; code: 'circuit_open' | ProviderFailureCode; retryAfterMs: number };

export class ProviderTransportError extends Error {
  readonly code: ProviderFailureCode;
  readonly retryAfterMs?: number;

  constructor(code: ProviderFailureCode, retryAfterMs?: number) {
    super(`notification-provider:${code}`);
    this.name = 'ProviderTransportError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super('notification-circuit:open');
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

function boundedPositive(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return fallback;
  return Math.min(Math.floor(value), max);
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;
  private probeInFlight = false;
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    if (!Number.isInteger(options.failureThreshold) || options.failureThreshold < 1 || options.failureThreshold > 100) {
      throw new Error('notification-circuit:invalid-failure-threshold');
    }
    if (!Number.isFinite(options.openMs) || options.openMs < 100 || options.openMs > 86_400_000) {
      throw new Error('notification-circuit:invalid-open-window');
    }
    if (!Number.isFinite(options.maxTimeoutMs) || options.maxTimeoutMs < 1 || options.maxTimeoutMs > 60_000) {
      throw new Error('notification-circuit:invalid-timeout');
    }
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  getRetryAfterMs(): number {
    if (this.state !== 'open') return 0;
    return Math.max(0, this.options.openMs - (this.now() - this.openedAt));
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const current = this.now();
    if (this.state === 'open') {
      const retryAfterMs = this.options.openMs - (current - this.openedAt);
      if (retryAfterMs > 0 || this.probeInFlight) throw new CircuitOpenError(Math.max(0, retryAfterMs));
      this.state = 'half_open';
      this.probeInFlight = true;
    } else if (this.state === 'half_open') {
      if (this.probeInFlight) throw new CircuitOpenError(this.options.openMs);
      this.probeInFlight = true;
    }

    try {
      const result = await operation();
      this.failures = 0;
      this.state = 'closed';
      this.probeInFlight = false;
      return result;
    } catch (error) {
      this.probeInFlight = false;
      this.failures += 1;
      if (this.state === 'half_open' || this.failures >= this.options.failureThreshold) {
        this.state = 'open';
        this.openedAt = this.now();
      }
      throw error;
    }
  }
}

function timeoutError(): ProviderTransportError {
  return new ProviderTransportError('timeout');
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(timeoutError());
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function classify(error: unknown): ProviderFailureCode {
  if (error instanceof ProviderTransportError) return error.code;
  return 'network_error';
}

export class NotificationCircuitRegistry {
  private readonly breakers = new Map<NotificationProvider, CircuitBreaker>();

  constructor(private readonly options: CircuitBreakerOptions) {}

  private breakerFor(provider: NotificationProvider): CircuitBreaker {
    const existing = this.breakers.get(provider);
    if (existing) return existing;
    const breaker = new CircuitBreaker(this.options);
    this.breakers.set(provider, breaker);
    return breaker;
  }

  state(provider: NotificationProvider): CircuitState {
    return this.breakerFor(provider).getState();
  }

  async deliver(
    provider: NotificationProvider,
    operation: (signal: AbortSignal) => Promise<void>,
    options: DeliveryOptions = {},
  ): Promise<DeliveryResult> {
    const breaker = this.breakerFor(provider);
    const timeoutMs = boundedPositive(options.timeoutMs, Math.min(5_000, this.options.maxTimeoutMs), this.options.maxTimeoutMs);
    const started = Date.now();
    try {
      await breaker.execute(() => withTimeout(operation, timeoutMs));
      return { ok: true, provider, latencyMs: Math.max(0, Date.now() - started) };
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        return { ok: false, provider, code: 'circuit_open', retryAfterMs: error.retryAfterMs };
      }
      const code = classify(error);
      const retryAfterMs = boundedPositive(
        error instanceof ProviderTransportError ? error.retryAfterMs : options.retryAfterMs,
        breaker.getRetryAfterMs(),
        this.options.openMs,
      );
      return { ok: false, provider, code, retryAfterMs };
    }
  }
}

export function createNotificationCircuitRegistry(): NotificationCircuitRegistry {
  return new NotificationCircuitRegistry({
    failureThreshold: 3,
    openMs: 30_000,
    maxTimeoutMs: 5_000,
  });
}
