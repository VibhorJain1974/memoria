'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Image as ImageIcon, FolderOpen, HardDrive,
  AlertTriangle, Cloud, RefreshCw, Activity, Crown, Eye,
  Trash2, Save, Info, Database, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Group } from '@/types'

const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

interface StatsData {
  r2_bytes: number
  file_count: number
  alert_sent_at: string | null
}

type Tab = 'overview' | 'storage' | 'users' | 'groups'

export default function AdminPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [authorized, setAuthorized]       = useState(false)
  const [loading, setLoading]             = useState(true)
  const [activeTab, setActiveTab]         = useState<Tab>('overview')
  const [totalUsers, setTotalUsers]       = useState(0)
  const [totalGroups, setTotalGroups]     = useState(0)
  const [totalMedia, setTotalMedia]       = useState(0)
  const [totalAlbums, setTotalAlbums]     = useState(0)
  const [users, setUsers]                 = useState<Profile[]>([])
  const [groups, setGroups]               = useState<Group[]>([])
  const [stats, setStats]                 = useState<StatsData | null>(null)
  const [statsLoading, setStatsLoading]   = useState(false)
  const [r2LimitGB, setR2LimitGB]         = useState(10)
  const [alertBufferMB, setAlertBufferMB] = useState(200)
  const [settingsSaving, setSettingsSaving] = useState(false)

  const checkAdmin = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles')
      .select('is_admin').eq('id', user.id).single()
    if (!prof?.is_admin) {
      toast.error('🚫 Admin only'); router.push('/dashboard'); return
    }
    setAuthorized(true)
    await Promise.all([loadDBStats(), loadStats(), loadStorageSettings()])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { checkAdmin() }, [checkAdmin])

  async function loadDBStats() {
    const [u, g, m, a] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
      supabase.from('albums').select('id', { count: 'exact', head: true }),
    ])
    setUsers((u.data || []) as Profile[])
    setGroups((g.data || []) as Group[])
    setTotalUsers(u.data?.length || 0)
    setTotalGroups(g.data?.length || 0)
    setTotalMedia(m.count || 0)
    setTotalAlbums(a.count || 0)
  }

  async function loadStats() {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/storage-stats')
      if (res.ok) setStats(await res.json() as StatsData)
    } catch { /* ignore */ }
    setStatsLoading(false)
  }

  async function loadStorageSettings() {
    try {
      const { data } = await supabase.from('admin_settings')
        .select('key, value').in('key', ['r2_limit_bytes', 'alert_buffer_bytes'])
      const map: Record<string, string> = {}
      for (const row of (data || [])) map[row.key] = row.value
      if (map['r2_limit_bytes'])     setR2LimitGB(Math.round(parseInt(map['r2_limit_bytes']) / GB))
      if (map['alert_buffer_bytes']) setAlertBufferMB(Math.round(parseInt(map['alert_buffer_bytes']) / MB))
    } catch { /* ignore */ }
  }

  async function saveStorageSettings() {
    setSettingsSaving(true)
    try {
      for (const u of [
        { key: 'r2_limit_bytes',     value: String(r2LimitGB * GB) },
        { key: 'alert_buffer_bytes', value: String(alertBufferMB * MB) },
      ]) {
        await supabase.from('admin_settings')
          .upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
      }
      toast.success('Settings saved! ✨')
    } catch { toast.error('Failed to save') }
    setSettingsSaving(false)
  }

  async function toggleAdmin(userId: string, cur: boolean) {
    const { error } = await supabase.from('profiles')
      .update({ is_admin: !cur }).eq('id', userId)
    if (error) { toast.error('Failed'); return }
    toast.success(cur ? 'Admin removed' : 'Admin granted 👑')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !cur } : u))
  }

  async function deleteGroup(groupId: string, name: string) {
    if (!confirm(`Delete "${name}" and ALL its content? Cannot be undone!`)) return
    const { error } = await supabase.from('groups').delete().eq('id', groupId)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Group deleted')
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setTotalGroups(prev => prev - 1)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!authorized) return null

  const r2LimitBytes  = r2LimitGB * GB
  const alertThreshold = r2LimitBytes - alertBufferMB * MB
  const r2Used        = stats?.r2_bytes || 0
  const r2Pct         = Math.min(100, Math.round((r2Used / r2LimitBytes) * 100))
  const r2NearFull    = r2Used >= alertThreshold

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'storage',  label: '💾 Storage'  },
    { id: 'users',    label: '👥 Users'    },
    { id: 'groups',   label: '🏠 Groups'   },
  ]

  return (
    <div className="p-4 sm:p-8 min-h-screen max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-white"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-syne">Admin Panel</h1>
          <p className="text-white/40 text-sm">Full access — you see everything 👁️</p>
        </div>
        <button onClick={() => Promise.all([loadDBStats(), loadStats()])}
          className="ml-auto p-2.5 rounded-xl glass border border-white/10 text-white/50 hover:text-white transition-all">
          <RefreshCw className="w-4 h-4"/>
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 p-1 rounded-2xl overflow-x-auto scrollbar-hide"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all px-2"
            style={{
              background: activeTab === t.id ? 'rgba(101,88,245,0.25)' : 'transparent',
              color:      activeTab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              border:     activeTab === t.id ? '1px solid rgba(101,88,245,0.35)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
      {activeTab === 'overview' && (
        <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Users',  value: totalUsers,  icon: Users,      color: 'from-purple-500 to-purple-700' },
              { label: 'Groups', value: totalGroups, icon: FolderOpen, color: 'from-pink-500 to-pink-700'   },
              { label: 'Media',  value: totalMedia,  icon: ImageIcon,  color: 'from-cyan-500 to-cyan-700'   },
              { label: 'Albums', value: totalAlbums, icon: Database,   color: 'from-amber-500 to-amber-700' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass rounded-2xl p-4 space-y-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                  <c.icon className="w-5 h-5 text-white"/>
                </div>
                <div className="text-2xl font-bold text-white">{c.value.toLocaleString()}</div>
                <div className="text-white/50 text-xs">{c.label}</div>
              </motion.div>
            ))}
          </div>
          {/* Storage quick view */}
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/70 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400"/> R2 Storage
              </span>
              <button onClick={() => setActiveTab('storage')} className="text-xs text-purple-400 hover:text-purple-300">Manage →</button>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <motion.div initial={{ width: 0 }} animate={{ width: `${r2Pct}%` }} transition={{ duration: 1 }}
                className={`h-full rounded-full ${r2Pct > 90 ? 'bg-red-500' : r2Pct > 70 ? 'bg-orange-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}/>
            </div>
            <div className="flex justify-between text-xs text-white/40">
              <span>{(r2Used / GB).toFixed(2)} GB / {r2LimitGB} GB ({r2Pct}%)</span>
              <span className={r2NearFull ? 'text-red-400' : 'text-green-400'}>{r2NearFull ? '⚠️ Near full' : '✅ Healthy'}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STORAGE ───────────────────────────────────────────── */}
      {activeTab === 'storage' && (
        <motion.div key="storage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400"/> R2 Live Usage</h3>
              <button onClick={loadStats} disabled={statsLoading}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`}/>
              </button>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70 flex items-center gap-1.5"><Cloud className="w-4 h-4 text-orange-400"/> Cloudflare R2</span>
                <span className="text-white/50 font-mono text-xs">{(r2Used / GB).toFixed(3)} GB / {r2LimitGB} GB</span>
              </div>
              <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${r2Pct}%` }} transition={{ duration: 1 }}
                  className={`h-full rounded-full ${r2Pct > 90 ? 'bg-red-500' : r2Pct > 70 ? 'bg-orange-500' : 'bg-gradient-to-r from-orange-400 to-yellow-400'}`}/>
              </div>
              <div className="flex justify-between text-xs text-white/30 mt-1.5">
                <span>{r2Pct}% used</span>
                <span>{((r2LimitBytes - r2Used) / MB).toFixed(0)} MB free</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{stats?.file_count?.toLocaleString() || '—'}</p>
                <p className="text-xs text-white/40 mt-0.5">Files stored</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center">
                <p className={`text-sm font-medium ${r2NearFull ? 'text-red-400' : 'text-green-400'}`}>{r2NearFull ? '⚠️ Near Full' : '✅ Healthy'}</p>
                <p className="text-xs text-white/40 mt-0.5">Status</p>
              </div>
            </div>
            {r2NearFull && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
                R2 is near your set limit! Raise the ceiling or delete old media.
              </div>
            )}
          </div>

          <div className="glass rounded-2xl p-5 border border-white/10 space-y-5">
            <h3 className="text-white font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400"/> Storage Limits</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/70 text-sm font-medium">R2 ceiling</label>
                <span className="text-xs text-white/40 flex items-center gap-1"><Info className="w-3 h-3"/> Raise if you buy more R2</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={100} step={1} value={r2LimitGB}
                  onChange={e => setR2LimitGB(Number(e.target.value))} className="flex-1 accent-purple-500 h-2"/>
                <div className="w-20 text-center px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm">{r2LimitGB} GB</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setR2LimitGB(v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${r2LimitGB === v ? 'bg-purple-500/25 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'}`}>
                    {v} GB{v === 10 ? ' (free)' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/25">R2 costs $0.015/GB/month above 10 GB free tier</p>
            </div>
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium block">Alert when this much free space remains (MB)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={50} max={1000} step={50} value={alertBufferMB}
                  onChange={e => setAlertBufferMB(Number(e.target.value))} className="flex-1 accent-pink-500 h-2"/>
                <div className="w-24 text-center px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm">{alertBufferMB} MB</div>
              </div>
              <p className="text-xs text-white/25">ntfy alert fires when only {alertBufferMB} MB remains</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-white/60 space-y-1">
              <p className="text-purple-300 font-medium">📊 Current config</p>
              <p>Ceiling: <strong className="text-white">{r2LimitGB} GB</strong></p>
              <p>Alert at: <strong className="text-white">{((r2LimitGB * GB - alertBufferMB * MB) / GB).toFixed(2)} GB used</strong></p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={saveStorageSettings} disabled={settingsSaving}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
              <Save className="w-4 h-4"/>
              {settingsSaving ? 'Saving...' : 'Save settings'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── USERS ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          <p className="text-white/40 text-sm mb-3">{totalUsers} total users</p>
          {users.map(u => (
            <div key={u.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${u.vibe_color || '#6558f5'}22` }}>{u.avatar_emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{u.display_name || u.username}</p>
                  {u.is_admin && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0"/>}
                </div>
                <p className="text-xs text-white/30">@{u.username}</p>
              </div>
              <button onClick={() => toggleAdmin(u.id, u.is_admin)}
                className="p-2 rounded-xl transition-all flex-shrink-0"
                style={{
                  background: u.is_admin ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                  border:     u.is_admin ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  color:      u.is_admin ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                }}
                title={u.is_admin ? 'Remove admin' : 'Grant admin'}>
                <Crown className="w-3.5 h-3.5"/>
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── GROUPS ────────────────────────────────────────────── */}
      {activeTab === 'groups' && (
        <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
          <p className="text-white/40 text-sm mb-3">{totalGroups} total groups</p>
          {groups.map(g => (
            <div key={g.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>{g.invite_emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-xs text-white/30">Code: <span className="font-mono">{g.invite_code}</span> · {g.is_private ? '🔒 Private' : '🌐 Public'}</p>
              </div>
              <button onClick={() => router.push(`/groups/${g.id}`)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
                <Eye className="w-3.5 h-3.5"/>
              </button>
              <button onClick={() => deleteGroup(g.id, g.name)}
                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
