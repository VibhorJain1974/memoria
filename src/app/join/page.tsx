'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code') || ''
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'joining' | 'done' | 'error'>('loading')
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    const join = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth?invite=${code}`)
        return
      }

      const { data: group, error } = await supabase
        .from('groups')
        .select('id, name, invite_emoji')
        .eq('invite_code', code.toUpperCase())
        .single()

      if (error || !group) {
        setStatus('error')
        return
      }

      setGroupName(group.name)
      setStatus('joining')

      const { error: joinError } = await supabase.from('group_members').upsert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      }, { onConflict: 'group_id,user_id' })

      if (joinError) {
        toast.error('Could not join group')
        setStatus('error')
        return
      }

      setStatus('done')
      toast.success(`You're in ${group.name}! ${group.invite_emoji}`)
      setTimeout(() => router.push(`/groups/${group.id}`), 1500)
    }
    if (code) join()
    else setStatus('error')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0a0a0f' }}>
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 text-center max-w-sm mx-4 relative z-10"
      >
        {status === 'loading' && (
          <><div className="text-5xl mb-4 animate-bounce">🔍</div>
          <p className="text-slate-400">Finding your group...</p></>
        )}
        {status === 'joining' && (
          <><div className="text-5xl mb-4">🎉</div>
          <h2 className="font-syne text-2xl font-bold mb-2">Joining {groupName}!</h2>
          <p className="text-slate-400 text-sm">Hold on...</p>
          <div className="mt-4 flex justify-center gap-2">
            {[0,1,2].map(i => (
              <motion.div key={i} animate={{ scale: [1,1.4,1] }}
                transition={{ duration: 0.6, delay: i*0.15, repeat: Infinity }}
                className="w-2 h-2 rounded-full" style={{ background: '#6558f5' }} />
            ))}
          </div></>
        )}
        {status === 'done' && (
          <><div className="text-5xl mb-4">✅</div>
          <h2 className="font-syne text-2xl font-bold mb-2">You&apos;re in!</h2>
          <p className="text-slate-400 text-sm">Taking you to {groupName}...</p></>
        )}
        {status === 'error' && (
          <><div className="text-5xl mb-4">😅</div>
          <h2 className="font-syne text-xl font-bold mb-2">Invalid code</h2>
          <p className="text-slate-400 text-sm mb-6">This invite link seems wrong or expired.</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary px-6 py-3 rounded-2xl text-sm">
            Go to dashboard
          </button></>
        )}
      </motion.div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-4xl animate-spin">⏳</div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
