import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET, buildR2Key } from '@/lib/r2'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Returns a presigned PUT URL so the browser can upload
// large files (videos, etc.) directly to R2 without going
// through the Vercel serverless function body limit (4.5 MB).
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { filename, contentType, groupId, albumId, fileSize } = await request.json()

        if (!filename || !contentType || !groupId || !albumId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (fileSize && fileSize > 500 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })
        }

        const key = buildR2Key(groupId, albumId, filename)

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        })

        // Presigned URL valid for 15 minutes — enough for large video uploads
        const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 900 })
        const publicUrl = `${(process.env.NEXT_PUBLIC_R2_URL || '').replace(/\/$/, '')}/${key}`

        return NextResponse.json({ presignedUrl, publicUrl, key })
    } catch (err) {
        console.error('Presign error:', err)
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
    }
}