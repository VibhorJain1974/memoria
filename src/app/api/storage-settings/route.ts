import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles')
      .select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin)
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const [{ data: settings }, { data: stats }] = await Promise.all([
      supabase.from('admin_settings').select('key, value')
        .in('key', ['r2_limit_bytes', 'alert_buffer_bytes']),
      supabase.from('storage_stats').select('*').limit(1).single(),
    ])

    const map: Record<string, string> = {}
    for (const row of settings || []) map[row.key] = row.value

    const r2Bytes = (stats as Record<string, unknown>)?.r2_bytes as number
                || (stats as Record<string, unknown>)?.bytes_used as number
                || 0

    return NextResponse.json({
      r2_limit_bytes:     parseInt(map['r2_limit_bytes']     || String(10 * 1024 * 1024 * 1024)),
      alert_buffer_bytes: parseInt(map['alert_buffer_bytes'] || String(200 * 1024 * 1024)),
      r2_bytes:           r2Bytes,
      file_count:         stats?.file_count || 0,
      alert_sent_at:      stats?.alert_sent_at || null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles')
      .select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin)
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const body = await request.json() as {
      r2_limit_bytes?: number
      alert_buffer_bytes?: number
    }

    const updates: { key: string; value: string }[] = []
    if (body.r2_limit_bytes !== undefined)
      updates.push({ key: 'r2_limit_bytes', value: String(body.r2_limit_bytes) })
    if (body.alert_buffer_bytes !== undefined)
      updates.push({ key: 'alert_buffer_bytes', value: String(body.alert_buffer_bytes) })

    for (const u of updates) {
      await supabase.from('admin_settings')
        .upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
