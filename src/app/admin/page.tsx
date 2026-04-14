'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Users, Image, FolderOpen, Shield, Trash2, Eye, Ban, Crown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Group } from '@/types'

interface AdminStats {
  totalUsers: number
  totalGroups: number
  totalMedia: number
  totalAlbums: number
}

interface AdminUser extends Profile {
  email?: string
  phone?: string
  last_sign_in?: string
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalGroups: 0, totalMedia: 0, totalAlbums: 0 })
  const [users, setUsers] = useState<AdminUser[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups'>('overview')

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) {
      toast.error('🚫 Admin only area')
      router.push('/dashboard')
      return
    }
    setAuthorized(true)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    const [usersRes, groupsRes, mediaRes, albumsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
      supabase.from('albums').select('id', { count: 'exact', head: true }),
    ])
    setUsers((usersRes.data || []) as AdminUser[])
    setGroups(groupsRes.data || [])
    setStats({
      totalUsers: usersRes.data?.length || 0,
      totalGroups: groupsRes.data?.length || 0,
      totalMedia: mediaRes.count || 0,
      totalAlbums: albumsRes.count || 0,
    })
  }

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    const { error } = await supabase.from('profiles').update({ is_admin: !currentIsAdmin }).eq('id', userId)
    if (error) { toast.error('Failed'); return }
    toast.success(currentIsAdmin ? 'Admin removed' : 'Admin granted 👑')
    await loadData()
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group and ALL its content? This cannot be undone!')) return
    const { error } = await supabase.from('groups').delete().eq('id', groupId)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Group deleted')
    await loadData()
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-memoria-500/30 border-t-memoria-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/40">Checking clearance...</p>
      </div>
    </div>
  )

  if (!authorized) return null

  const STAT_CARDS = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6558f5' },
    { label: 'Groups', value: stats.totalGroups, icon: FolderOpen, color: '#ec4899' },
    { label: 'Photos & Videos', value: stats.totalMedia, icon: Image, color: '#22d3ee' },
    { label: 'Albums', value: stats.totalAlbums, icon: FolderOpen, color: '#fbbf24' },
  ]

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={20} className="text-amber-400" />
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-white/30 text-sm">Full visibility. Full control.</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={loadData}
          className="p-2.5 rounded-xl glass border border-white/10 text-white/50 hover:text-white transition-all">
          <RefreshCw size={16} />
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 rounded-2xl max-w-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['overview', 'users', 'groups'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all"
            style={{
              background: activeTab === t ? 'rgba(101,88,245,0.25)' : 'transparent',
              color: activeTab === t ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              border: activeTab === t ? '1px solid rgba(101,88,245,0.35)' : '1px solid transparent',
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {STAT_CARDS.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass rounded-3xl p-5 border border-white/10">
                <card.icon size={20} style={{ color: card.color }} className="mb-3 opacity-80" />
                <p className="text-3xl font-bold font-display">{card.value}</p>
                <p className="text-xs text-white/40 mt-1">{card.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="glass rounded-3xl p-5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-amber-400" />
              <p className="text-amber-400 font-semibold text-sm">Admin Guidelines</p>
            </div>
            <ul className="text-white/35 text-sm space-y-1.5">
              <li>👁 You can view all groups, media, and users regardless of privacy settings</li>
              <li>🚫 Use sharing blocks and group banning sparingly and fairly</li>
              <li>🗑 Deleting a group removes ALL media — irreversible</li>
              <li>👑 Only grant admin to people you fully trust</li>
              <li>🔒 Never share your admin credentials</li>
            </ul>
          </div>
        </motion.div>
      )}

      {/* USERS */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {users.map(user => (
            <div key={user.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${user.vibe_color}25` }}>
                {user.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.display_name || user.username}</p>
                  {user.is_admin && <Crown size={12} className="text-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-white/30">@{user.username}</p>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleAdmin(user.id, user.is_admin)}
                className="p-2 rounded-xl transition-all text-xs"
                style={{
                  background: user.is_admin ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                  border: user.is_admin ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  color: user.is_admin ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                }}>
                <Crown size={13} />
              </motion.button>
            </div>
          ))}
        </motion.div>
      )}

      {/* GROUPS */}
      {activeTab === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {groups.map(group => (
            <div key={group.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {group.invite_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{group.name}</p>
                <p className="text-xs text-white/30">Code: {group.invite_code} • {group.is_private ? '🔒 Private' : '🌐 Public'}</p>
              </div>
              <div className="flex gap-1.5">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => router.push(`/groups/${group.id}`)}
                  className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <Eye size={13} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => deleteGroup(group.id)}
                  className="p-2 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <Trash2 size={13} />
                </motion.button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
