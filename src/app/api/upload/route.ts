import { NextRequest, NextResponse } from 'next/server'
import { smartUpload, buildR2Key, checkStorageAlert, sendStorageAlert } from '@/lib/r2'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const groupId = formData.get('groupId') as string | null
    const albumId = formData.get('albumId') as string | null

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!groupId) return NextResponse.json({ error: 'No groupId' }, { status: 400 })
    if (!albumId) return NextResponse.json({ error: 'No albumId' }, { status: 400 })

    if (file.size > 500 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })

    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    const key = buildR2Key(groupId, albumId, file.name)

    const { url, backend } = await smartUpload(uint8, key, file.type)

    // Update storage tracking (non-blocking)
    supabase.from('storage_stats')
      .select('id, r2_bytes, b2_bytes')
      .limit(1).single()
      .then(({ data }) => {
        if (data) {
          supabase.from('storage_stats').update({
            r2_bytes: backend === 'r2' ? (data.r2_bytes || 0) + file.size : data.r2_bytes,
            b2_bytes: backend === 'b2' ? (data.b2_bytes || 0) + file.size : data.b2_bytes,
          }).eq('id', data.id).then(() => { })
        }
      }).catch(() => { })

    // Alert check (non-blocking)
    checkStorageAlert().then(async ({ should, usedBytes }) => {
      if (should) await sendStorageAlert(usedBytes)
    }).catch(() => { })

    return NextResponse.json({ url, key, backend, size: file.size, type: file.type })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
