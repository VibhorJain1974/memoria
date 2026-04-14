import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Cloudflare R2 client — S3-compatible, zero egress fees, 10GB free
export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.NEXT_PUBLIC_CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'memoria-media'
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || ''

/**
 * Upload a file buffer to R2, return the public URL
 */
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
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}

/** Build a unique storage key for a file */
export function buildR2Key(groupId: string, albumId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'bin'
  const rand = Math.random().toString(36).slice(2, 8)
  return `${groupId}/${albumId}/${Date.now()}_${rand}.${ext}`
}
