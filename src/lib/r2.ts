import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from './supabase-server'

// ─── CLOUDFLARE R2 (primary, 10 GB free) ─────────────────────
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || 'placeholder',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'placeholder',
  },
})

// ─── BACKBLAZE B2 (overflow, 10 GB free) ─────────────────────
// S3-compatible — same @aws-sdk/client-s3, different endpoint.
// Your bucket: memoria-overflow
// Endpoint format: https://s3.<region>.backblazeb2.com
// Get region from: backblaze.com → Buckets → click bucket → "Endpoint" field
export const b2 = new S3Client({
  region: 'us-east-005',  // ← CHANGE this to YOUR bucket's region from Backblaze dashboard
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  credentials: {
    accessKeyId:     process.env.B2_ACCESS_KEY || 'placeholder',
    secretAccessKey: process.env.B2_SECRET_KEY || 'placeholder',
  },
})

export const R2_BUCKET     = process.env.R2_BUCKET_NAME    || 'memoria-media'
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || ''

export const B2_BUCKET     = process.env.B2_BUCKET_NAME    || 'memoria-overflow'
export const B2_PUBLIC_URL = process.env.NEXT_PUBLIC_B2_URL || ''

export const DEFAULT_R2_LIMIT  = 10 * 1024 * 1024 * 1024  // 10 GB
export const DEFAULT_ALERT_BUF = 100 * 1024 * 1024        // 100 MB

// ─── LOAD ADMIN SETTINGS ─────────────────────────────────────
async function getStorageSettings() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['overflow_enabled', 'r2_limit_bytes', 'alert_buffer_bytes'])
    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value
    return {
      overflow_enabled:   map['overflow_enabled'] !== 'false',
      r2_limit_bytes:     parseInt(map['r2_limit_bytes']     || String(DEFAULT_R2_LIMIT)),
      alert_buffer_bytes: parseInt(map['alert_buffer_bytes'] || String(DEFAULT_ALERT_BUF)),
    }
  } catch {
    return { overflow_enabled: true, r2_limit_bytes: DEFAULT_R2_LIMIT, alert_buffer_bytes: DEFAULT_ALERT_BUF }
  }
}

// ─── DECIDE BACKEND ──────────────────────────────────────────
export async function getStorageBackend(): Promise<'r2' | 'b2'> {
  try {
    const [settings, supabase] = await Promise.all([getStorageSettings(), createClient()])
    if (!settings.overflow_enabled) return 'r2'
    const { data } = await supabase.from('storage_stats').select('r2_bytes').limit(1).single()
    const used = (data?.r2_bytes as number) ?? 0
    if (used >= settings.r2_limit_bytes - settings.alert_buffer_bytes) return 'b2'
  } catch { /* default r2 */ }
  return 'r2'
}

// ─── UPLOAD ──────────────────────────────────────────────────
export async function uploadToR2(buffer: Uint8Array, key: string, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

export async function uploadToB2(buffer: Uint8Array, key: string, contentType: string): Promise<string> {
  if (!process.env.B2_ACCESS_KEY || process.env.B2_ACCESS_KEY === 'placeholder') {
    throw new Error('Backblaze B2 not configured. Add B2_ACCESS_KEY, B2_SECRET_KEY, B2_ENDPOINT, B2_BUCKET_NAME, NEXT_PUBLIC_B2_URL to env vars.')
  }
  await b2.send(new PutObjectCommand({
    Bucket: B2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${B2_PUBLIC_URL}/${key}`
}

export async function smartUpload(
  buffer: Uint8Array, key: string, contentType: string
): Promise<{ url: string; backend: 'r2' | 'b2' }> {
  const backend = await getStorageBackend()
  if (backend === 'b2') return { url: await uploadToB2(buffer, key, contentType), backend: 'b2' }
  return { url: await uploadToR2(buffer, key, contentType), backend: 'r2' }
}

// ─── DELETE ──────────────────────────────────────────────────
export async function deleteFromR2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http') ? pathOrUrl.replace(`${R2_PUBLIC_URL}/`, '') : pathOrUrl
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

export async function deleteFromB2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http') ? pathOrUrl.replace(`${B2_PUBLIC_URL}/`, '') : pathOrUrl
    await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

// ─── ALERT ───────────────────────────────────────────────────
export async function checkStorageAlert(): Promise<{ should: boolean; usedBytes: number }> {
  try {
    const [settings, supabase] = await Promise.all([getStorageSettings(), createClient()])
    const { data } = await supabase.from('storage_stats').select('r2_bytes, alert_sent_at').limit(1).single()
    if (!data) return { should: false, usedBytes: 0 }
    const used = (data.r2_bytes as number) ?? 0
    if (used < settings.r2_limit_bytes - settings.alert_buffer_bytes) return { should: false, usedBytes: used }
    if (data.alert_sent_at) {
      const last = new Date(data.alert_sent_at as string).getTime()
      if (Date.now() - last < 24 * 3600 * 1000) return { should: false, usedBytes: used }
    }
    return { should: true, usedBytes: used }
  } catch { return { should: false, usedBytes: 0 } }
}

export async function sendStorageAlert(usedBytes: number) {
  const settings = await getStorageSettings()
  const usedGB = (usedBytes / 1073741824).toFixed(2)
  const freeMB = ((settings.r2_limit_bytes - usedBytes) / 1048576).toFixed(0)
  const msg = `Memoria R2: ${usedGB}GB used, only ${freeMB}MB left! ${settings.overflow_enabled ? 'Auto-switching to Backblaze B2.' : 'Overflow DISABLED — check admin panel!'}`

  if (process.env.NTFY_TOPIC) {
    fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Title: '🚨 Memoria Storage Full', Priority: 'urgent', Tags: 'warning,cloud' },
      body: msg,
    }).catch(() => {})
  }
  try {
    const supabase = await createClient()
    await supabase.from('storage_stats').update({ alert_sent_at: new Date().toISOString() }).limit(1)
  } catch { /* ignore */ }
}

export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext  = filename.split('.').pop()?.toLowerCase() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
