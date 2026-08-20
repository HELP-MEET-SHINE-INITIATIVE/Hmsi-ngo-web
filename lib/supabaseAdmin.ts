import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceKey());
}

export function getSupabaseAdmin() {
  if (!hasSupabaseConfig()) return null;

  if (!adminClient) {
    adminClient = createClient(
      getSupabaseUrl() as string,
      getSupabaseServiceKey() as string,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return adminClient;
}

export function getSupabaseStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || 'fundraiser-images';
}
