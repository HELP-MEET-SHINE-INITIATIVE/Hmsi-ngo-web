type OriginClass = 'missing' | 'malformed' | 'same_host' | 'different_host';
type ReasonCode = 'origin_missing' | 'origin_malformed' | 'origin_host_mismatch';

declare function recordSecurityEvent(input: {
  eventType: 'admin_origin_rejected';
  reasonCode: ReasonCode;
  routeKey: 'admin_governance';
  method: 'POST';
  httpStatus: 403;
  originClass: OriginClass;
}): Promise<unknown>;

declare const securityMetric: { labels(eventType: string, reasonCode: ReasonCode): { inc(): void } };

declare const logger: { warn(input: { eventType: string; reasonCode: ReasonCode }): void };

export async function safeHandling(reasonCode: ReasonCode, originClass: OriginClass) {
  logger.warn({ eventType: 'admin_origin_rejected', reasonCode });
  securityMetric.labels('admin_origin_rejected', reasonCode).inc();
  return recordSecurityEvent({
    eventType: 'admin_origin_rejected',
    reasonCode,
    routeKey: 'admin_governance',
    method: 'POST',
    httpStatus: 403,
    originClass,
  });
}
