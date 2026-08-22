import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

type RoomTable = 'community_posts' | 'community_comments';
export function normalizeCommunityContent(content: string) { return content.replace(/\s+/g, ' ').trim(); }
export function communityContentHash(content: string) { return createHash('sha256').update(normalizeCommunityContent(content).toLowerCase()).digest('hex'); }

export async function checkCommunityAntiSpam(admin: SupabaseClient, table: RoomTable, actorKey: string, content: string) {
  const normalized = normalizeCommunityContent(content);
  const hash = communityContentHash(normalized);
  const lastHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const lastMinute = new Date(Date.now() - 60 * 1000).toISOString();
  const hourly = await admin.from(table).select('id', { count: 'exact', head: true }).eq('author_key', actorKey).gte('created_at', lastHour);
  if (hourly.error) return { allowed: false, error: 'Anti-spam protection is temporarily unavailable.' };
  const minute = await admin.from(table).select('id', { count: 'exact', head: true }).eq('author_key', actorKey).gte('created_at', lastMinute);
  if (minute.error) return { allowed: false, error: 'Anti-spam protection is temporarily unavailable.' };
  if ((minute.count || 0) >= 3) return { allowed: false, error: 'Please wait a minute before posting again.', status: 429 };
  if ((hourly.count || 0) >= (table === 'community_posts' ? 12 : 30)) return { allowed: false, error: 'The hourly room posting limit has been reached. Please try again later.', status: 429 };
  const duplicate = await admin.from(table).select('id').eq('author_key', actorKey).eq('content_hash', hash).gte('created_at', lastHour).limit(1);
  if (duplicate.error) return { allowed: false, error: 'Anti-spam protection is temporarily unavailable.' };
  if (duplicate.data?.length) return { allowed: false, error: 'The same content was recently posted. Please add a meaningful update instead.', status: 409 };
  const urlCount = (normalized.match(/https?:\/\//gi) || []).length;
  const repeatedCharacter = /(.)\1{9,}/.test(normalized);
  const spamScore = Math.min(100, urlCount * 20 + (repeatedCharacter ? 40 : 0));
  return { allowed: true, normalized, hash, spamScore, moderationStatus: spamScore >= 60 ? 'held' : 'published' as const };
}
