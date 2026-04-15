/**
 * Memoria Storage — Cloudflare R2 (primary) + Backblaze B2 (overflow)
 *
 * WHY BACKBLAZE B2 instead of Tebi:
 *   - Backblaze founded 2007, 100+ PB stored, trusted by millions
 *   - 10 GB free forever (no expiry, no card needed for free tier)
 *   - S3-compatible API — same @aws-sdk/client-s3, just a different endpoint
 *   - $0.006/GB/month after free tier (cheapest paid option)
 *   - No data loss risk — they're one of the most reliable storage providers
 *
 * FLOW:
 *   1. Check admin_settings table for: overflow_enabled, r2_limit_bytes, alert_threshold_bytes
 *   2. Check storage_stats for current R2 usage
 *   3. If usage > threshold AND overflow_enabled → upload to B2
 *   4. Otherwise → upload to R2
 *   5. Fire ntfy + email alert when threshold crossed
 *
 * BACKBLAZE B2 SETUP (do once, takes 5 min):
 *   1. backblaze.com → sign up free (no card for 10 GB free)
 *   2. Buckets → Create Bucket → name: memoria-overflow → Private
 *   3. Bucket Settings → Enable "S3-Compatible API"
 *   4. Copy the "S3 Endpoint" — looks like: s3.us-west-004.backblazeb2.com
 *   5. App Keys → Add a New Application Key → All Buckets → Read/Write
 *   6. Copy keyID (= access key) and applicationKey (= secret key)
 *   7. Add to .env.local AND Vercel env vars:
 *        B2_ACCESS_KEY=your_keyID
 *        B2_SECRET_KEY=your_applicationKey
 *        B2_BUCKET_NAME=memoria-overflow
 *        B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com  ← your region endpoint
 *        NEXT_PUBLIC_B2_URL=https://f004.backblazeb2.com/file/memoria-overflow
 *        (or use your Cloudflare-proxied custom domain for B2)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createClient } from './supabase-server'

// ─── CLOUDFLARE R2 CLIENT ────────────────────────────────────
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'placeholder',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'placeholder',
  },
})

// ─── BACKBLAZE B2 CLIENT (S3-compatible) ─────────────────────
// Same AWS SDK — Backblaze exposes a standard S3 endpoint per region
export const b2 = new S3Client({
  region: 'us-west-004',  // B2 uses region strings like this; SDK needs it but B2 ignores it
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY || 'placeholder',
    secretAccessKey: process.env.B2_SECRET_KEY || 'placeholder',
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'memoria-media'
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || ''

export const B2_BUCKET = process.env.B2_BUCKET_NAME || 'memoria-overflow'
export const B2_PUBLIC_URL = process.env.NEXT_PUBLIC_B2_URL || ''

// Default limits (overridden by admin_settings table at runtime)
export const DEFAULT_R2_LIMIT_BYTES = 10 * 1024 * 1024 * 1024  // 10 GB
export const DEFAULT_ALERT_BUFFER = 100 * 1024 * 1024         // 100 MB before limit

// ─── LOAD ADMIN SETTINGS ─────────────────────────────────────
// Admin can change these from the admin panel without redeploying
interface StorageSettings {
  overflow_enabled: boolean      // toggle: use B2 when R2 full?
  r2_limit_bytes: number       // total R2 space ceiling (buy more → raise this)
  alert_buffer_bytes: number     // how much headroom before switching & alerting
}

async function getStorageSettings(): Promise<StorageSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['overflow_enabled', 'r2_limit_bytes', 'alert_buffer_bytes'])

    const map: Record<string, string> = {}
    for (const row of data || []) map[row.key] = row.value

    return {
      overflow_enabled: map['overflow_enabled'] !== 'false',  // default true
      r2_limit_bytes: parseInt(map['r2_limit_bytes'] || String(DEFAULT_R2_LIMIT_BYTES)),
      alert_buffer_bytes: parseInt(map['alert_buffer_bytes'] || String(DEFAULT_ALERT_BUFFER)),
    }
  } catch {
    // If table doesn't exist yet, use defaults
    return {
      overflow_enabled: true,
      r2_limit_bytes: DEFAULT_R2_LIMIT_BYTES,
      alert_buffer_bytes: DEFAULT_ALERT_BUFFER,
    }
  }
}

// ─── DECIDE BACKEND ──────────────────────────────────────────
export async function getStorageBackend(): Promise<'r2' | 'b2'> {
  try {
    const [settings, supabase] = await Promise.all([
      getStorageSettings(),
      createClient(),
    ])

    if (!settings.overflow_enabled) return 'r2'

    const { data } = await supabase
      .from('storage_stats')
      .select('r2_bytes')
      .limit(1)
      .single()

    const used = (data?.r2_bytes as number) ?? 0
    const threshold = settings.r2_limit_bytes - settings.alert_buffer_bytes

    if (used >= threshold) return 'b2'
  } catch { /* default to r2 */ }
  return 'r2'
}

// ─── UPLOAD TO R2 ────────────────────────────────────────────
export async function uploadToR2(
  buffer: Uint8Array,
  key: string,
  contentType: string,
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

// ─── UPLOAD TO BACKBLAZE B2 ──────────────────────────────────
// Uses identical S3 SDK calls — no Blob/FormData/Buffer issues
export async function uploadToB2(
  buffer: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  if (!process.env.B2_ACCESS_KEY || process.env.B2_ACCESS_KEY === 'placeholder') {
    throw new Error(
      'Backblaze B2 not configured. See src/lib/r2.ts for setup instructions.'
    )
  }
  await b2.send(new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${B2_PUBLIC_URL}/${key}`
}

// ─── SMART UPLOAD ────────────────────────────────────────────
export async function smartUpload(
  buffer: Uint8Array,
  key: string,
  contentType: string,
): Promise<{ url: string; backend: 'r2' | 'b2' }> {
  const backend = await getStorageBackend()
  if (backend === 'b2') {
    const url = await uploadToB2(buffer, key, contentType)
    return { url, backend: 'b2' }
  }
  const url = await uploadToR2(buffer, key, contentType)
  return { url, backend: 'r2' }
}

// ─── DELETE ──────────────────────────────────────────────────
export async function deleteFromR2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http')
      ? pathOrUrl.replace(`${R2_PUBLIC_URL}/`, '') : pathOrUrl
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

export async function deleteFromB2(pathOrUrl: string) {
  try {
    const key = pathOrUrl.startsWith('http')
      ? pathOrUrl.replace(`${B2_PUBLIC_URL}/`, '') : pathOrUrl
    await b2.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }))
  } catch { /* ignore */ }
}

export async function deleteFile(url: string, key: string) {
  if (url.includes('backblazeb2.com') || (B2_PUBLIC_URL && url.startsWith(B2_PUBLIC_URL))) {
    await deleteFromB2(key)
  } else {
    await deleteFromR2(key)
  }
}

// ─── STORAGE ALERT ───────────────────────────────────────────
export async function checkStorageAlert(): Promise<{ should: boolean; usedBytes: number }> {
  try {
    const [settings, supabase] = await Promise.all([
      getStorageSettings(),
      createClient(),
    ])

    const { data } = await supabase
      .from('storage_stats')
      .select('r2_bytes, alert_sent_at')
      .limit(1)
      .single()

    if (!data) return { should: false, usedBytes: 0 }
    const used = (data.r2_bytes as number) ?? 0
    const threshold = settings.r2_limit_bytes - settings.alert_buffer_bytes

    if (used < threshold) return { should: false, usedBytes: used }

    if (data.alert_sent_at) {
      const last = new Date(data.alert_sent_at as string).getTime()
      if (Date.now() - last < 24 * 3600 * 1000) return { should: false, usedBytes: used }
    }
    return { should: true, usedBytes: used }
  } catch {
    return { should: false, usedBytes: 0 }
  }
}

export async function sendStorageAlert(usedBytes: number) {
  const settings = await getStorageSettings()
  const usedGB = (usedBytes / 1073741824).toFixed(2)
  const limitGB = (settings.r2_limit_bytes / 1073741824).toFixed(0)
  const freeMB = ((settings.r2_limit_bytes - usedBytes) / 1048576).toFixed(0)
  const msg = `🚨 Memoria R2: ${usedGB}GB / ${limitGB}GB used. ${freeMB}MB left! ${settings.overflow_enabled ? 'Auto-switching to Backblaze B2.' : 'Overflow disabled — check admin panel!'
    }`

  if (process.env.NTFY_TOPIC) {
    fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Title: '🚨 Memoria Storage Almost Full',
        Priority: 'urgent',
        Tags: 'warning,cloud,rotating_light',
        Email: 'jvibhor202@gmail.com',
      },
      body: msg,
    }).catch(() => { })
  }

  try {
    const supabase = await createClient()
    await supabase.from('storage_stats')
      .update({ alert_sent_at: new Date().toISOString() }).limit(1)
  } catch { /* non-critical */ }
}

export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
