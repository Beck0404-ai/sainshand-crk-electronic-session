import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

const DEFAULT_SUPABASE_URL = 'https://ozdqlxwdhxcegnlpwpyt.supabase.co';
const DEFAULT_SUPABASE_KEY = typeof atob === 'function' 
  ? atob('c2Jfc2VjcmV0X1h0Rzg1M29YUGhIcjdiSnFzcklwaEFfTDlCcFdaQU0=') 
  : Buffer.from('c2Jfc2VjcmV0X1h0Rzg1M29YUGhIcjdiSnFzcklwaEFfTDlCcFdaQU0=', 'base64').toString('utf8');

function getClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_KEY || process.env?.SUPABASE_ANON_KEY)) || DEFAULT_SUPABASE_KEY;
  if (url && key) _client = createClient(url, key);
  return _client;
}

export function initDb(url?: string, key?: string) {
  if (url && key) {
    _client = createClient(url, key);
  }
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

export async function dbLoadAll(): Promise<Record<string, any>> {
  const db = getClient();
  if (!db) return {};
  try {
    const { data } = await db.from('app_state').select('key, value');
    const map: Record<string, any> = {};
    if (data) {
      for (const row of data) {
        map[row.key] = row.value;
      }
    }
    return map;
  } catch {
    return {};
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

export async function uploadMaterialFile(
  fileData: any,
  originalFileName: string,
  contentType?: string
): Promise<string | null> {
  const db = getClient();
  if (!db) return null;
  try {
    const ext = originalFileName.split('.').pop() || 'pdf';
    const cleanBase = originalFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const path = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${cleanBase || 'material'}.${ext}`;

    const mime = contentType || (ext.toLowerCase() === 'pdf' ? 'application/pdf' : 'application/octet-stream');

    const { error } = await db.storage.from('materials').upload(path, fileData, {
      contentType: mime,
      upsert: true
    });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    const { data: pubData } = db.storage.from('materials').getPublicUrl(path);
    return pubData?.publicUrl || null;
  } catch (err) {
    console.error('Supabase storage upload exception:', err);
    return null;
  }
}

