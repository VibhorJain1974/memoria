import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json() as {
      name: string
      description?: string
      cover_gradient?: string
      invite_emoji?: string
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Generate unique invite code
    let invite_code = generateCode()
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase
        .from('groups').select('id').eq('invite_code', invite_code).maybeSingle()
      if (!existing) break
      invite_code = generateCode()
    }

    // Insert group — server-side via session cookie, any auth'd user can create
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || null,
        cover_gradient: body.cover_gradient || 'linear-gradient(135deg, #6558f5, #ec4899)',
        invite_emoji: body.invite_emoji || '🎉',
        invite_code,
        created_by: user.id,
        is_private: false,
      })
      .select()
      .single()

    if (groupErr || !group) {
      console.error('Group insert error:', groupErr)
      return NextResponse.json(
        { error: groupErr?.message || 'Failed to create group' },
        { status: 500 }
      )
    }

    // Add creator as admin member
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

    if (memberErr) console.error('Member insert error (non-fatal):', memberErr)

    return NextResponse.json({ group })
  } catch (err) {
    console.error('Create group error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
