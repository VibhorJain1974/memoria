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

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const key    = buildR2Key(groupId, albumId, file.name)
    const { url, backend } = await smartUpload(buffer, key, file.name, file.type)

    checkStorageAlert().then(async (should) => {
      if (should) {
        const { data } = await supabase.from('storage_stats').select('bytes_used').eq('provider','r2').single()
        if (data) await sendStorageAlert(data.bytes_used)
      }
    }).catch(() => {})

    return NextResponse.json({ url, key, backend, size: file.size, type: file.type })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
