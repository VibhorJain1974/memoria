'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Shield, Users, Camera, Image, AlertTriangle } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [stats, setStats] = useState({ groups: 0, users: 0, media: 0, albums: 0 })
  const [authorized, setAuthorized] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/dashboard'); return }
      setAuthorized(true)

      const [{ count: gc }, { count: uc }, { count: mc }, { count: ac }, { data: g }] = await Promise.all([
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('media').select('*', { count: 'exact', head: true }),
        supabase.from('albums').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('id, name, invite_code, created_at, cover_gradient').order('created_at', { ascending: false }).limit(20),
      ])
      setStats({ groups: gc || 0, users: uc || 0, media: mc || 0, albums: ac || 0 })
      setGroups(g || [])
      setLoading(false)
    }
    load()
  }, [])

  if (!authorized) return null

  const statCards = [
    { label: 'Total groups', value: stats.groups, icon: Users, color: '#6558f5' },
    { label: 'Total users', value: stats.users, icon: Shield, color: '#ec4899' },
    { label: 'Total media', value: stats.media, icon: Camera, color: '#22d3ee' },
    { label: 'Total albums', value: stats.albums, icon: Image, color: '#fbbf24' },
  ]

  return (
    <div className="p-8 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="text-aurora-amber" size={28} />
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
            <p className="text-white/30 text-sm">Full platform overview</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass rounded-3xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs text-white/40">{s.label}</span>
            </div>
            <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* All groups */}
      <div>
        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <Users size={18} className="text-memoria-400" /> All groups
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 shimmer rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map(g => (
              <motion.div key={g.id}
                whileHover={{ x: 4 }}
                onClick={() => router.push(`/groups/${g.id}`)}
                className="flex items-center gap-4 p-4 glass rounded-2xl border border-white/5 cursor-pointer hover:border-white/10 transition-all"
                data-clickable>
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: g.cover_gradient }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{g.name}</p>
                  <p className="text-xs text-white/30">Code: {g.invite_code}</p>
                </div>
                <span className="text-xs text-white/20">{new Date(g.created_at).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
