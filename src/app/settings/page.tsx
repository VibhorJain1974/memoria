'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import type { Profile } from '@/types'
import { AURORA_COLORS } from '@/lib/utils'
import { Save, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

const EMOJI_AVATARS = ['🌟', '🦋', '🌸', '🎭', '🦄', '🌊', '🎪', '🔮', '🌙', '⚡', '🎨', '🦁',
  '🐉', '🦊', '🌈', '🎯', '💎', '🔥', '🌺', '🎸', '🚀', '🌙', '🍀', '🎭']

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [emoji, setEmoji] = useState('🌟')
  const [vibeColor, setVibeColor] = useState('#6558f5')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setDisplayName(data.display_name || '')
            setBio(data.bio || '')
            setEmoji(data.avatar_emoji || '🌟')
            setVibeColor(data.vibe_color || '#6558f5')
          }
        })
    })
  }, [])

  const save = async () => {
    if (!profile) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_emoji: emoji,
      vibe_color: vibeColor,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    if (error) {
      toast.error('Failed to save :(')
    } else {
      toast.success('Profile saved! ✨')
    }
    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return (
    <div className="p-8">
      <div className="max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 shimmer rounded-2xl" />)}
      </div>
    </div>
  )

  return (
    <div className="p-8 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-white/30 text-sm mt-1">Make Memoria yours</p>
      </motion.div>

      <div className="max-w-lg space-y-5">
        {/* Profile preview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-2"
            style={{ background: `${vibeColor}30`, borderColor: `${vibeColor}60` }}>
            {emoji}
          </div>
          <div>
            <p className="font-display font-bold text-xl">{displayName || profile.username}</p>
            <p className="text-white/40 text-sm">@{profile.username}</p>
            {bio && <p className="text-white/50 text-sm mt-0.5 italic">"{bio}"</p>}
          </div>
        </motion.div>

        {/* Emoji picker */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass rounded-3xl p-5 border border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Your vibe emoji</p>
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_AVATARS.map(e => (
              <motion.button key={e} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                onClick={() => setEmoji(e)}
                className={`text-2xl py-2 rounded-xl transition-all ${
                  emoji === e ? 'bg-memoria-500/30 border border-memoria-400' : 'bg-white/5 hover:bg-white/10'
                }`}
                data-clickable>
                {e}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Vibe color */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-5 border border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Accent color</p>
          <div className="flex gap-3 flex-wrap">
            {AURORA_COLORS.map(color => (
              <motion.button key={color} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                onClick={() => setVibeColor(color)}
                className={`w-8 h-8 rounded-full transition-all ${
                  vibeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-card' : ''
                }`}
                style={{ background: color }}
                data-clickable />
            ))}
          </div>
        </motion.div>

        {/* Display name & bio */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-3xl p-5 border border-white/10 space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-widest">Profile info</p>
          <input type="text" placeholder="Display name"
            value={displayName} onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all" />
          <textarea placeholder="Bio (optional — tell your crew who you are 🌟)"
            value={bio} onChange={e => setBio(e.target.value)} rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all resize-none" />
          <div className="text-xs text-white/20">
            Username: @{profile.username} (can&apos;t be changed)
          </div>
        </motion.div>

        {/* Buttons */}
        <div className="flex gap-3">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={save} disabled={loading}
            className="flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
            data-clickable>
            <Save size={16} />
            {loading ? 'Saving...' : 'Save changes'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="px-5 py-3.5 rounded-2xl font-semibold glass border border-white/10 flex items-center gap-2 text-white/50 hover:text-aurora-coral hover:border-aurora-coral/30 transition-all"
            data-clickable>
            <LogOut size={16} />
            Sign out
          </motion.button>
        </div>
      </div>
    </div>
  )
}
