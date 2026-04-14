'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import type { Profile } from '@/types'
import { Home, Users, Bell, Settings, LogOut, Shield } from 'lucide-react'

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
    { icon: Bell, label: 'Flashbacks', path: '/flashbacks' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    ...(profile?.is_admin ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
  ]

  return (
    <div className="min-h-screen bg-dark-base flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 w-64 glass border-r border-white/5 z-40 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
              📸
            </div>
            <span className="font-display font-bold text-lg">Memoria</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = pathname === path || pathname.startsWith(path + '/')
            return (
              <motion.button
                key={path}
                whileHover={{ x: 4 }}
                onClick={() => router.push(path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                  active
                    ? 'text-white bg-memoria-500/20 border border-memoria-500/30'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                data-clickable
              >
                <Icon size={17} />
                {label}
                {active && (
                  <motion.div layoutId="nav-active"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-memoria-400" />
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Profile */}
        {profile && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer"
              onClick={() => router.push('/settings')} data-clickable>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg glass border border-white/10">
                {profile.avatar_emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.display_name || profile.username}</p>
                <p className="text-xs text-white/30 truncate">@{profile.username}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={e => { e.stopPropagation(); logout() }}
                className="text-white/20 hover:text-aurora-coral transition-colors"
                data-clickable
              >
                <LogOut size={15} />
              </motion.button>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
