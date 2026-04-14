'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Profile } from '@/types'
import { AURORA_COLORS } from '@/lib/utils'
import { Save, LogOut, User, Phone, Mail, Palette, Users, ChevronRight, Check, X, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const EMOJI_AVATARS = [
  '🦊', '🐼', '🦁', '🐯', '🦄', '🐸', '🐺', '🦅', '🐬', '🦋',
  '🌸', '🔥', '💎', '🌙', '⚡', '🎨', '🚀', '🍀', '🎭', '👑',
  '🌟', '🎪', '🔮', '🌈', '💫', '🐉', '🌊', '🎸', '🍓', '🌺',
]

type Tab = 'profile' | 'account' | 'contacts'

interface ContactNickname {
  userId: string
  displayName: string
  avatarEmoji: string
  nickname: string // stored locally in localStorage
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)

  // Profile tab
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [emoji, setEmoji] = useState('🌟')
  const [vibeColor, setVibeColor] = useState('#6558f5')

  // Account tab
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [phoneSent, setPhoneSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')

  // Contacts tab
  const [contacts, setContacts] = useState<ContactNickname[]>([])
  const [editingContact, setEditingContact] = useState<string | null>(null)
  const [editNickname, setEditNickname] = useState('')

  useEffect(() => {
    loadProfile()
    loadContacts()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
      setBio(data.bio || '')
      setEmoji(data.avatar_emoji || '🌟')
      setVibeColor(data.vibe_color || '#6558f5')
    }
  }

  async function loadContacts() {
    // Get all group members the current user shares groups with
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: myGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    if (!myGroups?.length) return

    const groupIds = myGroups.map(g => g.group_id)
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, profiles(id, display_name, avatar_emoji)')
      .in('group_id', groupIds)
      .neq('user_id', user.id)

    if (!members) return

    // Deduplicate
    const seen = new Set<string>()
    const uniqueMembers: ContactNickname[] = []

    for (const m of members) {
      const p = m.profiles as unknown as Profile
      if (!p || seen.has(p.id)) continue
      seen.add(p.id)

      // Get local nickname from localStorage
      const stored = localStorage.getItem(`nickname_${p.id}`) || ''
      uniqueMembers.push({
        userId: p.id,
        displayName: p.display_name || 'Unknown',
        avatarEmoji: p.avatar_emoji || '🦊',
        nickname: stored,
      })
    }

    setContacts(uniqueMembers)
  }

  function saveNickname(userId: string, nickname: string) {
    localStorage.setItem(`nickname_${userId}`, nickname.trim())
    setContacts(prev => prev.map(c => c.userId === userId ? { ...c, nickname: nickname.trim() } : c))
    setEditingContact(null)
    toast.success('Nickname saved! Only you can see this 👀')
  }

  function clearNickname(userId: string) {
    localStorage.removeItem(`nickname_${userId}`)
    setContacts(prev => prev.map(c => c.userId === userId ? { ...c, nickname: '' } : c))
    toast.success('Nickname cleared')
  }

  const saveProfile = async () => {
    if (!profile) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_emoji: emoji,
      vibe_color: vibeColor,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    if (error) { toast.error('Failed to save :(') } else { toast.success('Profile saved! ✨') }
    setLoading(false)
  }

  const updateEmail = async () => {
    if (!newEmail.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) { toast.error(error.message) } else { setEmailSent(true); toast.success('Check your new email for confirmation!') }
    setLoading(false)
  }

  const updatePhone = async () => {
    const digits = newPhone.replace(/\D/g, '')
    if (digits.length < 10) { toast.error('Enter a valid phone number'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ phone: `+91${digits.slice(-10)}` })
    if (error) { toast.error(error.message) } else { setPhoneSent(true); toast.success('OTP sent to new number!') }
    setLoading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return (
    <div className="p-8"><div className="max-w-lg mx-auto space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-16 shimmer rounded-2xl" />)}
    </div></div>
  )

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User size={15} /> },
    { id: 'account', label: 'Account', icon: <Phone size={15} /> },
    { id: 'contacts', label: 'Nicknames', icon: <Users size={15} /> },
  ]

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-white/30 text-sm mt-1">Make Memoria yours ✨</p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 p-1 rounded-2xl max-w-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: tab === t.id ? 'rgba(101,88,245,0.25)' : 'transparent',
              color: tab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              border: tab === t.id ? '1px solid rgba(101,88,245,0.35)' : '1px solid transparent',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg">
        <AnimatePresence mode="wait">

          {/* ── PROFILE TAB ──────────────────────────────────────── */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Preview */}
              <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-2" style={{ background: `${vibeColor}25`, borderColor: `${vibeColor}55` }}>
                  {emoji}
                </div>
                <div>
                  <p className="font-display font-bold text-xl">{displayName || profile.username}</p>
                  <p className="text-white/40 text-sm">@{profile.username}</p>
                  {bio && <p className="text-white/40 text-sm mt-0.5 italic">"{bio}"</p>}
                </div>
              </div>

              {/* Emoji picker */}
              <div className="glass rounded-3xl p-5 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Your avatar</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {EMOJI_AVATARS.map(e => (
                    <motion.button key={e} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }} onClick={() => setEmoji(e)}
                      className={`text-xl py-1.5 rounded-xl transition-all ${emoji === e ? 'ring-2 ring-memoria-500' : ''}`}
                      style={{ background: emoji === e ? 'rgba(101,88,245,0.25)' : 'rgba(255,255,255,0.04)' }}>
                      {e}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="glass rounded-3xl p-5 border border-white/10">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Accent color</p>
                <div className="flex gap-3 flex-wrap">
                  {AURORA_COLORS.map(color => (
                    <motion.button key={color} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => setVibeColor(color)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{ background: color, boxShadow: vibeColor === color ? `0 0 0 3px #0a0a0f, 0 0 0 5px ${color}` : 'none' }} />
                  ))}
                </div>
              </div>

              {/* Name & bio */}
              <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
                <p className="text-xs text-white/40 uppercase tracking-widest">Profile info</p>
                <input type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all outline-none" />
                <textarea placeholder="Bio (optional — tell your crew who you are 🌟)" value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all resize-none outline-none" />
              </div>

              <div className="flex gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={saveProfile} disabled={loading}
                  className="flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
                  <Save size={16} />{loading ? 'Saving...' : 'Save changes'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={logout}
                  className="px-5 py-3.5 rounded-2xl font-semibold glass border border-white/10 flex items-center gap-2 text-white/50 hover:text-red-400 hover:border-red-400/30 transition-all">
                  <LogOut size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNT TAB ──────────────────────────────────────── */}
          {tab === 'account' && (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">

              {/* Update Email */}
              <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={15} className="text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-widest">Update Email</p>
                </div>
                {!emailSent ? (
                  <>
                    <input type="email" placeholder="New email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all outline-none" />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={updateEmail} disabled={loading} className="w-full py-3 rounded-2xl font-medium text-white flex items-center justify-center gap-2"
                      style={{ background: 'rgba(101,88,245,0.2)', border: '1px solid rgba(101,88,245,0.4)' }}>
                      <Mail size={15} />{loading ? 'Sending...' : 'Send confirmation email'}
                    </motion.button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <Check size={16} className="text-emerald-400" />
                    <p className="text-sm text-emerald-300">Check <strong>{newEmail}</strong> to confirm</p>
                  </div>
                )}
              </div>

              {/* Update Phone */}
              <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Phone size={15} className="text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-widest">Update Phone</p>
                </div>
                {!phoneSent ? (
                  <>
                    <div className="flex gap-2">
                      <div className="px-3 py-3 rounded-xl text-slate-400 text-sm flex items-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>🇮🇳 +91</div>
                      <input type="tel" placeholder="New number" value={newPhone} onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all outline-none" />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={updatePhone} disabled={loading} className="w-full py-3 rounded-2xl font-medium text-white flex items-center justify-center gap-2"
                      style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.35)' }}>
                      <Phone size={15} />{loading ? 'Sending...' : 'Send OTP to new number'}
                    </motion.button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                      <Check size={16} className="text-emerald-400" />
                      <p className="text-sm text-emerald-300">OTP sent to +91 {newPhone}</p>
                    </div>
                    <input type="text" inputMode="numeric" placeholder="Enter OTP" value={phoneOtp} onChange={e => setPhoneOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all outline-none text-center text-xl tracking-widest" />
                  </>
                )}
              </div>

              {/* Danger zone */}
              <div className="glass rounded-3xl p-5 border border-red-500/20">
                <p className="text-xs text-red-400/60 uppercase tracking-widest mb-3">Danger zone</p>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={logout}
                  className="w-full py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-red-400 transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <LogOut size={16} />Sign out of Memoria
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── CONTACTS / NICKNAMES TAB ─────────────────────────── */}
          {tab === 'contacts' && (
            <motion.div key="contacts" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">

              <div className="glass rounded-3xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-white/40" />
                  <p className="text-xs text-white/40 uppercase tracking-widest">Friend Nicknames</p>
                </div>
                <p className="text-white/25 text-xs mt-1 mb-4 leading-relaxed">
                  Give your friends custom nicknames that <strong className="text-white/40">only you</strong> can see — stored on your device, never shared.
                </p>

                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-white/25">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-sm">No contacts yet — join or create a group first!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.map(contact => (
                      <div key={contact.userId} className="rounded-2xl p-3.5 transition-all" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            {contact.avatarEmoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{contact.displayName}</p>
                            {contact.nickname && (
                              <p className="text-xs text-memoria-400">You call them: <span className="font-semibold">{contact.nickname}</span></p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (editingContact === contact.userId) {
                                setEditingContact(null)
                              } else {
                                setEditingContact(contact.userId)
                                setEditNickname(contact.nickname)
                              }
                            }}
                            className="p-2 rounded-xl transition-all hover:bg-white/10"
                          >
                            <Pencil size={13} className="text-white/40" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {editingContact === contact.userId && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 flex gap-2"
                            >
                              <input
                                type="text"
                                placeholder={`Nickname for ${contact.displayName}`}
                                value={editNickname}
                                onChange={e => setEditNickname(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveNickname(contact.userId, editNickname) }}
                                className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:border-memoria-500 transition-all"
                                autoFocus
                                maxLength={30}
                              />
                              <button onClick={() => saveNickname(contact.userId, editNickname)} className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-400/10 transition-all">
                                <Check size={16} />
                              </button>
                              {contact.nickname && (
                                <button onClick={() => clearNickname(contact.userId)} className="p-2 rounded-xl text-red-400 hover:bg-red-400/10 transition-all">
                                  <X size={16} />
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass rounded-3xl p-4 border border-white/10">
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-white/30" />
                  <p className="text-xs text-white/30">Nicknames are saved locally on your device only — your friends never see what you call them 😏</p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
