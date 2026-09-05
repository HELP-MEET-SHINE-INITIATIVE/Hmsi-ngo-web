export type OriginCheck =
  | { ok: true; originClass: 'same_host' }
  | {
      ok: false;
      reasonCode: 'origin_missing' | 'origin_malformed' | 'origin_host_mismatch';
      originClass: 'missing' | 'malformed' | 'different_host';
    };

export function inspectSameOrigin(request: Request): OriginCheck {
  const origin = request.headers.get('origin');
  if (!origin) return { ok: false, reasonCode: 'origin_missing', originClass: 'missing' };
  try {
    const parsedOrigin = new URL(origin);
    const target = new URL(request.url);
    return parsedOrigin.host === target.host
      ? { ok: true, originClass: 'same_host' }
      : { ok: false, reasonCode: 'origin_host_mismatch', originClass: 'different_host' };
  } catch {
    return { ok: false, reasonCode: 'origin_malformed', originClass: 'malformed' };
  }
}
