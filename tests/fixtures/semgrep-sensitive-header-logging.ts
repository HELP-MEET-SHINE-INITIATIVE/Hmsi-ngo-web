// semgrep test fixture: these examples must be flagged.
export function unsafeLogging(request: Request, logger: { warn(value: unknown): void }, metric: { labels(...values: unknown[]): { inc(): void } }) {
  console.warn(request.headers.get('Authorization'));
  logger.warn(JSON.stringify(request.headers));
  metric.labels(request.headers.get('Origin')).inc();
  recordSecurityEvent({ eventType: 'admin_origin_rejected', reasonCode: 'origin_host_mismatch', routeKey: 'admin_governance', method: 'POST', httpStatus: 403, originClass: 'different_host', origin: request.headers.get('Origin') });
  console.error(`origin=${request.headers.get('Origin')}`);
}

function recordSecurityEvent(input: unknown) {
  return input;
}
