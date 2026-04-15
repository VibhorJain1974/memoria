import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from './supabase-server'

// ─── Cloudflare R2 (primary storage) ────────────────────────
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

// ─── Tebi (overflow storage, S3-compatible) ──────────────────
export const tebi = new S3Client({
  region: 'us-east-1',
  endpoint: 'https://s3.tebi.io',
  credentials: {
    accessKeyId:     process.env.TEBI_ACCESS_KEY!,
    secretAccessKey: process.env.TEBI_SECRET_KEY!,
  },
})

export const R2_BUCKET      = process.env.R2_BUCKET_NAME    || 'memoria-media'
export const R2_PUBLIC_URL  = process.env.NEXT_PUBLIC_R2_URL || ''
export const TEBI_BUCKET     = process.env.TEBI_BUCKET_NAME  || 'memoria-media'
export const TEBI_PUBLIC_URL = process.env.NEXT_PUBLIC_TEBI_URL || ''

// R2 free tier = 10 GB. Alert when 100 MB remaining.
export const R2_LIMIT_BYTES     = 10 * 1024 * 1024 * 1024       // 10 GB
export const R2_ALERT_THRESHOLD = R2_LIMIT_BYTES - 100 * 1024 * 1024 // 9.9 GB

// ─── Decide which backend to use ─────────────────────────────
export async function getStorageBackend(): Promise<'r2' | 'tebi'> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('storage_stats')
      .select('bytes_used')
      .eq('provider', 'r2')
      .single()
    const used = (data?.bytes_used as number) ?? 0
    if (used >= R2_ALERT_THRESHOLD) return 'tebi'
  } catch { /* default to r2 */ }
  return 'r2'
}

// ─── Upload to R2 ─────────────────────────────────────────────
export async function uploadToR2(
  buffer: Uint8Array,
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

// ─── Upload to Tebi ───────────────────────────────────────────
export async function uploadToTebi(
  buffer: Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  await tebi.send(new PutObjectCommand({
    Bucket: TEBI_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${TEBI_PUBLIC_URL}/${key}`
}

// ─── Delete from R2 ───────────────────────────────────────────
export async function deleteFromR2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http')
      ? pathOrUrl.replace(`${R2_PUBLIC_URL}/`, '')
      : pathOrUrl
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

// ─── Delete from Tebi ─────────────────────────────────────────
export async function deleteFromTebi(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http')
      ? pathOrUrl.replace(`${TEBI_PUBLIC_URL}/`, '')
      : pathOrUrl
    await tebi.send(new DeleteObjectCommand({ Bucket: TEBI_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

// ─── Smart upload: R2 → Tebi overflow ────────────────────────
export async function smartUpload(
  buffer: Uint8Array,
  key: string,
  contentType: string
): Promise<{ url: string; backend: 'r2' | 'tebi' }> {
  const backend = await getStorageBackend()
  if (backend === 'tebi') {
    const url = await uploadToTebi(buffer, key, contentType)
    return { url, backend: 'tebi' }
  }
  const url = await uploadToR2(buffer, key, contentType)
  return { url, backend: 'r2' }
}

// ─── Check if storage alert should fire ──────────────────────
export async function checkStorageAlert(): Promise<{ should: boolean; usedBytes: number }> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('storage_stats')
      .select('bytes_used, alert_sent_at')
      .eq('provider', 'r2')
      .single()

    if (!data) return { should: false, usedBytes: 0 }
    const used = (data.bytes_used as number) ?? 0
    if (used < R2_ALERT_THRESHOLD) return { should: false, usedBytes: used }

    if (data.alert_sent_at) {
      const last = new Date(data.alert_sent_at as string).getTime()
      if (Date.now() - last < 24 * 60 * 60 * 1000) return { should: false, usedBytes: used }
    }
    return { should: true, usedBytes: used }
  } catch {
    return { should: false, usedBytes: 0 }
  }
}

// ─── Send storage alert via ntfy + mark in DB ────────────────
export async function sendStorageAlert(usedBytes: number) {
  const usedGB  = (usedBytes / 1024 / 1024 / 1024).toFixed(2)
  const freeGB  = ((R2_LIMIT_BYTES - usedBytes) / 1024 / 1024).toFixed(0)
  const message = `Memoria R2 storage is ${usedGB}GB / 10GB. Only ${freeGB}MB remaining! New uploads switching to Tebi overflow.`

  if (process.env.NTFY_TOPIC) {
    try {
      await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Title': '🚨 Memoria: Storage Almost Full',
          'Priority': 'urgent',
          'Tags': 'warning,cloud,floppy_disk',
        },
        body: message,
      })
    } catch { /* ntfy failure is non-fatal */ }
  }

  // Mark alert sent so we don't spam
  try {
    const supabase = await createClient()
    await supabase.from('storage_stats')
      .update({ alert_sent_at: new Date().toISOString() })
      .eq('provider', 'r2')
  } catch { /* ignore */ }
}

// ─── Build a unique storage key ───────────────────────────────
export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext  = filename.split('.').pop()?.toLowerCase() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
