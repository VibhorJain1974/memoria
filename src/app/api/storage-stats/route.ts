import { NextResponse } from 'next/server'
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

    const { data: stats } = await supabase
      .from('storage_stats')
      .select('*')
      .limit(1)
      .single()

    // Support both schema variants: r2_bytes (new) or bytes_used (old)
    const r2Bytes = (stats as Record<string, unknown>)?.r2_bytes as number
                || (stats as Record<string, unknown>)?.bytes_used as number
                || 0

    return NextResponse.json({
      r2_bytes:      r2Bytes,
      file_count:    stats?.file_count || 0,
      alert_sent_at: stats?.alert_sent_at || null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
