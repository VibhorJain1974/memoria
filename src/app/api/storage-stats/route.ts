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
      .select('r2_bytes, b2_bytes, alert_sent_at')
      .limit(1).single()

    return NextResponse.json({
      r2_bytes: (stats?.r2_bytes as number) || 0,
      b2_bytes: (stats?.b2_bytes as number) || 0,
      alert_sent_at: stats?.alert_sent_at || null,
    })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
