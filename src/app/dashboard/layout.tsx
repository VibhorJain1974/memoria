'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import type { Profile } from '@/types'
import { Home, Users, Sparkles, Settings, LogOut, Shield } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Sparkles, label: 'Flashbacks', path: '/flashbacks' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(profile?.is_admin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ]

  return (
    <div className="min-h-screen bg-dark-base flex">

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 flex-col z-40"
        style={{ background: 'rgba(14,14,22,0.9)', borderRight: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
              📸
            </div>
            <span className="font-display font-bold text-lg">Memoria</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
            return (
              <motion.button
                key={path}
                whileHover={{ x: 3 }}
                onClick={() => router.push(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: active ? 'rgba(101,88,245,0.18)' : 'transparent',
                  color: active ? 'white' : 'rgba(255,255,255,0.38)',
                  border: active ? '1px solid rgba(101,88,245,0.28)' : '1px solid transparent',
                }}
              >
                <Icon size={16} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-memoria-400" />}
              </motion.button>
            )
          })}
        </nav>

        {/* Profile card */}
        {profile && (
          <div className="p-3 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
              onClick={() => router.push('/settings')}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: `${profile.vibe_color || '#6558f5'}22`, border: `1.5px solid ${profile.vibe_color || '#6558f5'}44` }}>
                {profile.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.display_name || profile.username}</p>
                <p className="text-xs text-white/25 truncate">@{profile.username}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); logout() }} className="text-white/20 hover:text-red-400 transition-colors p-1">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 md:ml-60 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe"
        style={{ background: 'rgba(10,10,15,0.95)', borderTop: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
            return (
              <button key={path} onClick={() => router.push(path)}
                className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all min-w-0"
                style={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                <motion.div animate={{ scale: active ? 1.1 : 1 }}>
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                </motion.div>
                <span className="text-[10px] font-medium">{label}</span>
                {active && (
                  <motion.div layoutId="mob-nav-dot" className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#a78bfa' }} />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
