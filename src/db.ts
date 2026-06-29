import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) _client = createClient(url, key);
  return _client;
}

export async function dbLoad<T>(key: string): Promise<T | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const { data } = await db.from('app_state').select('value').eq('key', key).maybeSingle();
    return (data?.value ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function dbSave(key: string, value: unknown): Promise<void> {
  const db = getClient();
  if (!db) return;
  try {
    await db.from('app_state').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  } catch (e) {
    console.error('DB save error:', e);
  }
}

export function getSupabaseClient() {
  return getClient();
}

export async function dbClearAll(): Promise<void> {
  const db = getClient();
  if (!db) return;
  try {
    await db.from('app_state').delete().neq('key', '');
  } catch (e) {
    console.error('DB clear error:', e);
  }
}
