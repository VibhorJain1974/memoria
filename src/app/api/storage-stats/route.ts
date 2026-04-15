import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin)
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { data: stats } = await supabase
      .from('storage_stats')
      .select('provider, bytes_used, file_count, alert_sent_at')

    return NextResponse.json({ stats })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
