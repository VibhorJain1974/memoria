'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  Shield, Users, Image, FolderOpen, HardDrive,
  AlertTriangle, Cloud, RefreshCw, Activity,
  Database, Server, Crown, Eye, Trash2, ToggleLeft,
  ToggleRight, Save, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile, Group } from '@/types'

const ADMIN_EMAIL = 'jvibhor202@gmail.com'
const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

interface StorageData {
  overflow_enabled: boolean
  r2_limit_bytes: number
  alert_buffer_bytes: number
  r2_bytes: number
  b2_bytes: number
  alert_sent_at: string | null
}

type Tab = 'overview' | 'storage' | 'users' | 'groups'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Stats
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalGroups, setTotalGroups] = useState(0)
  const [totalMedia, setTotalMedia] = useState(0)
  const [totalAlbums, setTotalAlbums] = useState(0)
  const [users, setUsers] = useState<Profile[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  // Storage settings
  const [storage, setStorage] = useState<StorageData | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)
  // Editable fields
  const [overflowEnabled, setOverflowEnabled] = useState(true)
  const [r2LimitGB, setR2LimitGB] = useState(10)
  const [alertBufferMB, setAlertBufferMB] = useState(100)
  const [settingsSaving, setSettingsSaving] = useState(false)

  useEffect(() => { checkAdmin() }, [])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!prof?.is_admin && user.email !== ADMIN_EMAIL) {
      toast.error('🚫 Admin only'); router.push('/dashboard'); return
    }
    setAuthorized(true)
    await Promise.all([loadStats(), loadStorageSettings()])
    setLoading(false)
  }

  async function loadStats() {
    const [u, g, m, a] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('media').select('id', { count: 'exact', head: true }),
      supabase.from('albums').select('id', { count: 'exact', head: true }),
    ])
    setUsers(u.data || [])
    setGroups(g.data || [])
    setTotalUsers(u.data?.length || 0)
    setTotalGroups(g.data?.length || 0)
    setTotalMedia(m.count || 0)
    setTotalAlbums(a.count || 0)
  }

  async function loadStorageSettings() {
    setStorageLoading(true)
    try {
      const res = await fetch('/api/storage-settings')
      if (res.ok) {
        const data = await res.json() as StorageData
        setStorage(data)
        setOverflowEnabled(data.overflow_enabled)
        setR2LimitGB(Math.round(data.r2_limit_bytes / GB))
        setAlertBufferMB(Math.round(data.alert_buffer_bytes / MB))
      }
    } catch { toast.error('Could not load storage settings') }
    setStorageLoading(false)
  }

  async function saveStorageSettings() {
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/storage-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overflow_enabled: overflowEnabled,
          r2_limit_bytes: r2LimitGB * GB,
          alert_buffer_bytes: alertBufferMB * MB,
        }),
      })
      if (res.ok) {
        toast.success('Storage settings saved! ✨')
        await loadStorageSettings()
      } else {
        toast.error('Failed to save')
      }
    } catch { toast.error('Error saving') }
    setSettingsSaving(false)
  }

  async function toggleAdmin(userId: string, cur: boolean) {
    await supabase.from('profiles').update({ is_admin: !cur }).eq('id', userId)
    toast.success(cur ? 'Admin removed' : 'Admin granted 👑')
    await loadStats()
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group + ALL content? Irreversible!')) return
    await supabase.from('groups').delete().eq('id', groupId)
    toast.success('Group deleted')
    await loadStats()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!authorized) return null

  // Derived storage metrics
  const r2LimitBytes = r2LimitGB * GB
  const alertThreshold = r2LimitBytes - alertBufferMB * MB
  const r2Used = storage?.r2_bytes || 0
  const b2Used = storage?.b2_bytes || 0
  const r2Pct = Math.min(100, Math.round((r2Used / r2LimitBytes) * 100))
  const r2NearFull = r2Used >= alertThreshold
  const activeBackend = r2NearFull && overflowEnabled ? 'b2' : 'r2'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'storage', label: '💾 Storage' },
    { id: 'users', label: 'Users' },
    { id: 'groups', label: 'Groups' },
  ]

  return (
    <div className="p-4 sm:p-8 min-h-screen max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-syne">Admin Panel</h1>
          <p className="text-white/40 text-sm">Full access — you see everything 👁️</p>
        </div>
        <button onClick={() => Promise.all([loadStats(), loadStorageSettings()])}
          className="ml-auto p-2.5 rounded-xl glass border border-white/10 text-white/50 hover:text-white transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 rounded-2xl overflow-x-auto"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex-1 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: activeTab === t.id ? 'rgba(101,88,245,0.25)' : 'transparent',
              color: activeTab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              border: activeTab === t.id ? '1px solid rgba(101,88,245,0.35)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Users', value: totalUsers, icon: Users, color: 'from-purple-500 to-purple-700' },
              { label: 'Groups', value: totalGroups, icon: FolderOpen, color: 'from-pink-500 to-pink-700' },
              { label: 'Media', value: totalMedia, icon: Image, color: 'from-cyan-500 to-cyan-700' },
              { label: 'Albums', value: totalAlbums, icon: Database, color: 'from-amber-500 to-amber-700' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} className="glass rounded-2xl p-4 space-y-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-white">{c.value.toLocaleString()}</div>
                <div className="text-white/50 text-xs">{c.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Quick storage status */}
          {storage && (
            <div className="glass rounded-2xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  Storage status
                </div>
                <button onClick={() => setActiveTab('storage')}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                  Manage →
                </button>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: `${r2Pct}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${r2Pct > 90 ? 'bg-red-500' : r2Pct > 75 ? 'bg-orange-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`} />
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>R2: {(r2Used / GB).toFixed(2)} GB / {r2LimitGB} GB ({r2Pct}%)</span>
                <span className={`${activeBackend === 'b2' ? 'text-orange-400' : 'text-green-400'}`}>
                  Active: {activeBackend === 'b2' ? '☁️ Backblaze B2' : '🟠 Cloudflare R2'}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── STORAGE TAB ───────────────────────────────────────── */}
      {activeTab === 'storage' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* Live stats */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Live Usage
              </h3>
              <button onClick={loadStorageSettings} disabled={storageLoading}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <RefreshCw className={`w-3.5 h-3.5 ${storageLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* R2 bar */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/70 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                  Cloudflare R2 (primary)
                </span>
                <span className="text-white/50">{(r2Used / GB).toFixed(3)} GB / {r2LimitGB} GB</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${r2Pct}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${r2Pct > 90 ? 'bg-red-500' : r2Pct > 75 ? 'bg-orange-500' : 'bg-gradient-to-r from-orange-400 to-yellow-400'}`} />
              </div>
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>{r2Pct}% used</span>
                <span>{((r2LimitBytes - r2Used) / MB).toFixed(0)} MB remaining</span>
              </div>
            </div>

            {/* B2 bar */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/70 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Backblaze B2 (overflow)
                </span>
                <span className="text-white/50">{(b2Used / GB).toFixed(3)} GB used</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-500"
                  style={{ width: `${Math.min(100, (b2Used / (10 * GB)) * 100)}%` }} />
              </div>
              <p className="text-xs text-white/25 mt-1">10 GB free tier — used as overflow only</p>
            </div>

            {/* Active backend badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium w-fit ${activeBackend === 'b2'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                : 'bg-green-500/15 text-green-400 border border-green-500/25'
              }`}>
              <Activity className="w-3.5 h-3.5" />
              New uploads go to: {activeBackend === 'b2' ? 'Backblaze B2 (overflow active)' : 'Cloudflare R2 (normal)'}
            </div>

            {r2NearFull && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                R2 is near full! {overflowEnabled ? 'Overflow to B2 is active.' : 'Overflow is DISABLED — uploads may fail!'}
              </div>
            )}
          </div>

          {/* Settings card */}
          <div className="glass rounded-2xl p-5 border border-white/10 space-y-5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" /> Storage Settings
            </h3>

            {/* Overflow toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <p className="text-white text-sm font-medium">Backblaze B2 Overflow</p>
                <p className="text-white/40 text-xs mt-0.5">
                  When R2 hits the alert threshold, auto-switch uploads to B2
                </p>
              </div>
              <button onClick={() => setOverflowEnabled(v => !v)}
                className="transition-all">
                {overflowEnabled
                  ? <ToggleRight className="w-8 h-8 text-green-400" />
                  : <ToggleLeft className="w-8 h-8 text-white/30" />}
              </button>
            </div>

            {/* R2 limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-white/70 text-sm font-medium">
                  R2 storage ceiling (GB)
                </label>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <Info className="w-3 h-3" />
                  Raise if you buy more R2
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={100} step={1} value={r2LimitGB}
                  onChange={e => setR2LimitGB(Number(e.target.value))}
                  className="flex-1 accent-purple-500" />
                <div className="w-20 text-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm">
                  {r2LimitGB} GB
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[10, 15, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setR2LimitGB(v)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${r2LimitGB === v
                        ? 'bg-purple-500/25 border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                      }`}>
                    {v} GB {v === 10 ? '(free)' : v === 25 ? '~$0.09/mo' : ''}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/30 flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                R2 pricing: $0.015/GB/month above 10 GB free tier
              </p>
            </div>

            {/* Alert buffer */}
            <div className="space-y-2">
              <label className="text-white/70 text-sm font-medium block">
                Alert buffer (MB before ceiling)
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={50} max={500} step={50} value={alertBufferMB}
                  onChange={e => setAlertBufferMB(Number(e.target.value))}
                  className="flex-1 accent-pink-500" />
                <div className="w-20 text-center px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm">
                  {alertBufferMB} MB
                </div>
              </div>
              <p className="text-xs text-white/30">
                Alert fires + overflow activates when R2 has &lt;{alertBufferMB} MB left
              </p>
            </div>

            {/* Calculated threshold display */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-white/60 space-y-1">
              <p className="text-purple-300 font-medium">📊 Current configuration</p>
              <p>R2 ceiling: <strong className="text-white">{r2LimitGB} GB</strong></p>
              <p>Switch to B2 when R2 &gt; <strong className="text-white">{((r2LimitGB * GB - alertBufferMB * MB) / GB).toFixed(2)} GB</strong></p>
              <p>B2 overflow: <strong className={overflowEnabled ? 'text-green-400' : 'text-red-400'}>{overflowEnabled ? 'ENABLED' : 'DISABLED'}</strong></p>
              <p>Alert: ntfy push + email to jvibhor202@gmail.com</p>
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={saveStorageSettings} disabled={settingsSaving}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
              <Save className="w-4 h-4" />
              {settingsSaving ? 'Saving...' : 'Save storage settings'}
            </motion.button>
          </div>

          {/* B2 setup guide */}
          {!process.env.NEXT_PUBLIC_B2_URL && (
            <div className="glass rounded-2xl p-4 border border-amber-500/20 space-y-2">
              <p className="text-amber-400 font-medium text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Backblaze B2 not configured
              </p>
              <p className="text-white/50 text-xs leading-relaxed">
                Add these to Vercel env vars: B2_ACCESS_KEY, B2_SECRET_KEY, B2_BUCKET_NAME,
                B2_ENDPOINT, NEXT_PUBLIC_B2_URL. See src/lib/r2.ts for full setup guide.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* ── USERS TAB ─────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `${u.vibe_color || '#6558f5'}22` }}>
                {u.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{u.display_name || u.username}</p>
                  {u.is_admin && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-white/30">@{u.username}</p>
              </div>
              <button onClick={() => toggleAdmin(u.id, u.is_admin)}
                className="p-2 rounded-xl transition-all"
                style={{
                  background: u.is_admin ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                  border: u.is_admin ? '1px solid rgba(245,158,11,0.35)' : '1px solid rgba(255,255,255,0.1)',
                  color: u.is_admin ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                }}>
                <Crown className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── GROUPS TAB ────────────────────────────────────────── */}
      {activeTab === 'groups' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                {g.invite_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-xs text-white/30">
                  Code: {g.invite_code} · {g.is_private ? '🔒 Private' : '🌐 Public'}
                </p>
              </div>
              <button onClick={() => router.push(`/groups/${g.id}`)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteGroup(g.id)}
                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
