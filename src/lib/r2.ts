import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from './supabase-server'

// ─── CLOUDFLARE R2 — only storage provider ───────────────────
// Free 10 GB, then ~₹1.26/GB/month. Admin panel lets you raise the
// ceiling when you buy more R2 storage.
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || 'placeholder',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'placeholder',
  },
})

export const R2_BUCKET     = process.env.R2_BUCKET_NAME    || 'memoria-media'
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_URL || '').replace(/\/$/, '')

export const DEFAULT_R2_LIMIT  = 10 * 1024 * 1024 * 1024  // 10 GB free
export const DEFAULT_ALERT_BUF = 200 * 1024 * 1024        // alert 200 MB before limit

// ─── ADMIN SETTINGS ──────────────────────────────────────────
async function getStorageSettings() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['r2_limit_bytes', 'alert_buffer_bytes'])
    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value
    return {
      r2_limit_bytes:     parseInt(map['r2_limit_bytes']     || String(DEFAULT_R2_LIMIT)),
      alert_buffer_bytes: parseInt(map['alert_buffer_bytes'] || String(DEFAULT_ALERT_BUF)),
    }
  } catch {
    return { r2_limit_bytes: DEFAULT_R2_LIMIT, alert_buffer_bytes: DEFAULT_ALERT_BUF }
  }
}

// ─── UPLOAD ──────────────────────────────────────────────────
export async function uploadToR2(
  buffer: Uint8Array, key: string, contentType: string,
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

// smartUpload — R2 only (kept for API compatibility)
export async function smartUpload(
  buffer: Uint8Array, key: string, contentType: string,
): Promise<{ url: string; backend: 'r2' }> {
  const url = await uploadToR2(buffer, key, contentType)
  return { url, backend: 'r2' }
}

// ─── DELETE ──────────────────────────────────────────────────
export async function deleteFromR2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http')
      ? decodeURIComponent(pathOrUrl.replace(`${R2_PUBLIC_URL}/`, ''))
      : pathOrUrl
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

// ─── STORAGE ALERT ───────────────────────────────────────────
export async function checkStorageAlert(): Promise<{ should: boolean; usedBytes: number }> {
  try {
    const [settings, supabase] = await Promise.all([getStorageSettings(), createClient()])
    const { data } = await supabase
      .from('storage_stats')
      .select('bytes_used, alert_sent_at')
      .eq('provider', 'r2')
      .single()
    if (!data) return { should: false, usedBytes: 0 }
    const used = (data.bytes_used as number) ?? 0
    const threshold = settings.r2_limit_bytes - settings.alert_buffer_bytes
    if (used < threshold) return { should: false, usedBytes: used }
    if (data.alert_sent_at) {
      const last = new Date(data.alert_sent_at as string).getTime()
      if (Date.now() - last < 24 * 3600 * 1000) return { should: false, usedBytes: used }
    }
    return { should: true, usedBytes: used }
  } catch { return { should: false, usedBytes: 0 } }
}

export async function sendStorageAlert(usedBytes: number) {
  const settings = await getStorageSettings()
  const usedGB  = (usedBytes / 1073741824).toFixed(2)
  const limitGB = (settings.r2_limit_bytes / 1073741824).toFixed(1)
  const freeMB  = ((settings.r2_limit_bytes - usedBytes) / 1048576).toFixed(0)
  const msg = `Memoria R2: ${usedGB}GB / ${limitGB}GB. Only ${freeMB}MB left! Go to Admin → Storage to raise limit.`
  if (process.env.NTFY_TOPIC) {
    fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', Title: '🚨 Memoria Storage Full', Priority: 'urgent', Tags: 'warning,cloud' },
      body: msg,
    }).catch(() => {})
  }
  try {
    const supabase = await createClient()
    await supabase.from('storage_stats').update({ alert_sent_at: new Date().toISOString() }).eq('provider', 'r2')
  } catch { /* ignore */ }
}

export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext  = filename.split('.').pop()?.toLowerCase() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
