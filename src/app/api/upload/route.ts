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
    const file    = formData.get('file')    as File   | null
    const groupId = formData.get('groupId') as string | null
    const albumId = formData.get('albumId') as string | null

    if (!file)    return NextResponse.json({ error: 'No file'    }, { status: 400 })
    if (!groupId) return NextResponse.json({ error: 'No groupId' }, { status: 400 })
    if (!albumId) return NextResponse.json({ error: 'No albumId' }, { status: 400 })

    if (file.size > 500 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })

    const uint8 = new Uint8Array(await file.arrayBuffer())
    const key   = buildR2Key(groupId, albumId, file.name)
    const { url, backend } = await smartUpload(uint8, key, file.type)

    // Non-blocking: update storage_stats
    supabase.from('storage_stats')
      .select('id, bytes_used, file_count')
      .eq('provider', 'r2')
      .single()
      .then(({ data }) => {
        if (data) {
          supabase.from('storage_stats').update({
            bytes_used: (data.bytes_used || 0) + file.size,
            file_count: (data.file_count || 0) + 1,
          }).eq('id', data.id).then(() => {})
        }
      }).catch(() => {})

    // Non-blocking: alert check
    checkStorageAlert().then(async ({ should, usedBytes }) => {
      if (should) await sendStorageAlert(usedBytes)
    }).catch(() => {})

    return NextResponse.json({ url, key, backend, size: file.size, type: file.type })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
