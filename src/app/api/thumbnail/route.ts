import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { mediaId, storageUrl } = await request.json() as {
      mediaId: string
      storageUrl: string
    }
    if (!mediaId || !storageUrl) {
      return NextResponse.json({ error: 'mediaId and storageUrl required' }, { status: 400 })
    }

    // Fetch original from R2
    const fetchRes = await fetch(storageUrl)
    if (!fetchRes.ok) return NextResponse.json({ error: 'Could not fetch source' }, { status: 400 })
    const buffer = Buffer.from(await fetchRes.arrayBuffer())

    // Resize to 400px wide webp
    const thumb = await sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    // Upload thumbnail next to original
    const origKey = storageUrl.replace(`${R2_PUBLIC_URL}/`, '')
    const thumbKey = origKey.replace(/\.[^.]+$/, '_thumb.webp')

    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: thumbKey, Body: thumb,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }))

    const thumbnailUrl = `${R2_PUBLIC_URL}/${thumbKey}`

    await supabase.from('media').update({ thumbnail_path: thumbnailUrl }).eq('id', mediaId)

    return NextResponse.json({ thumbnailUrl })
  } catch (err) {
    console.error('Thumbnail error:', err)
    return NextResponse.json({ error: 'Thumbnail failed' }, { status: 500 })
  }
}
