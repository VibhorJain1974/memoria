import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { createClient } from './supabase-server'

// ─── Cloudflare R2 ──────────────────────────────────────────
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET     = process.env.R2_BUCKET_NAME    || 'memoria-media'
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || ''

// R2 free tier: 10 GB. Alert when 100 MB remaining.
export const R2_LIMIT_BYTES     = 10 * 1024 * 1024 * 1024      // 10 GB
export const R2_ALERT_THRESHOLD = R2_LIMIT_BYTES - 100 * 1024 * 1024 // 9.9 GB

// ─── Tibbi (overflow storage) ───────────────────────────────
export const TIBBI_API_URL = process.env.TIBBI_API_URL || ''
export const TIBBI_API_KEY = process.env.TIBBI_API_KEY || ''

// ─── Decide which backend to use ────────────────────────────
export async function getStorageBackend(): Promise<'r2' | 'tibbi'> {
  try {
    // Check current R2 usage from Supabase
    const supabase = await createClient()
    const { data } = await supabase
      .from('storage_stats')
      .select('bytes_used')
      .eq('provider', 'r2')
      .single()

    const used = data?.bytes_used ?? 0
    if (used >= R2_ALERT_THRESHOLD) return 'tibbi'
  } catch { /* default to r2 */ }
  return 'r2'
}

// ─── Upload to R2 ───────────────────────────────────────────
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${R2_PUBLIC_URL}/${key}`
}

export async function deleteFromR2(key: string) {
  try {
    const path = key.startsWith('http') ? key.replace(`${R2_PUBLIC_URL}/`, '') : key
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: path }))
  } catch { /* ignore */ }
}

// ─── Upload to Tibbi (overflow) ──────────────────────────────
export async function uploadToTibbi(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  if (!TIBBI_API_URL || !TIBBI_API_KEY) {
    throw new Error('Tibbi not configured — add TIBBI_API_URL and TIBBI_API_KEY to env')
  }
  const formData = new FormData()
  const blob = new Blob([buffer], { type: contentType })
  formData.append('file', blob, filename)

  const res = await fetch(`${TIBBI_API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TIBBI_API_KEY}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Tibbi upload failed: ${res.status}`)
  const json = await res.json()
  return json.url as string
}

// ─── Smart upload: R2 first, Tibbi as overflow ───────────────
export async function smartUpload(
  buffer: Buffer,
  key: string,
  filename: string,
  contentType: string
): Promise<{ url: string; backend: 'r2' | 'tibbi' }> {
  const backend = await getStorageBackend()
  if (backend === 'tibbi') {
    const url = await uploadToTibbi(buffer, filename, contentType)
    return { url, backend: 'tibbi' }
  }
  const url = await uploadToR2(buffer, key, contentType)
  return { url, backend: 'r2' }
}

// ─── Check if alert should fire ─────────────────────────────
export async function checkStorageAlert(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('storage_stats')
      .select('bytes_used, alert_sent_at')
      .eq('provider', 'r2')
      .single()

    if (!data) return false
    const used = data.bytes_used ?? 0
    if (used < R2_ALERT_THRESHOLD) return false

    // Only alert once per 24h
    if (data.alert_sent_at) {
      const lastAlert = new Date(data.alert_sent_at).getTime()
      if (Date.now() - lastAlert < 24 * 60 * 60 * 1000) return false
    }
    return true
  } catch { return false }
}

// ─── Send alert (email via Supabase + ntfy) ──────────────────
export async function sendStorageAlert(r2UsedBytes: number) {
  const usedGB = (r2UsedBytes / 1024 / 1024 / 1024).toFixed(2)
  const msg = `🚨 Memoria Storage Alert: R2 is ${usedGB}GB / 10GB used. Under 100MB remaining! New uploads switching to Tibbi.`

  // ntfy push notification
  if (process.env.NTFY_TOPIC) {
    try {
      await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Title: '🚨 Memoria Storage Almost Full',
          Priority: 'urgent',
          Tags: 'warning,cloud',
        },
        body: msg,
      })
    } catch { /* ignore ntfy errors */ }
  }

  // Mark alert sent in DB
  const supabase = await createClient()
  await supabase.from('storage_stats')
    .update({ alert_sent_at: new Date().toISOString() })
    .eq('provider', 'r2')
}

export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext  = filename.split('.').pop() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
