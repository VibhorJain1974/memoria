'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Group, GroupMember, Profile } from '@/types'
import { X, Copy, Check, Trash2, Shield, EyeOff, Eye, Crown, UserMinus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  group: Group
  members: GroupMember[]
  currentUser: Profile
  onClose: () => void
  onUpdated: (group: Group) => void
}

type Tab = 'members' | 'privacy' | 'danger'

export function GroupSettings({ group, members, currentUser, onClose, onUpdated }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('members')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])

  const isAdmin = currentUser.is_admin ||
    members.find(m => (m.profile as any)?.id === currentUser.id)?.role === 'admin'

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${group.invite_code}`)
    setCopied(true)
    toast.success('Invite link copied! 🔗')
    setTimeout(() => setCopied(false), 2000)
  }

  const removeMember = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the group?`)) return
    setLoading(userId)
    const { error } = await supabase.from('group_members')
      .delete().eq('group_id', group.id).eq('user_id', userId)
    if (!error) {
      toast.success(`${name} removed`)
    }
    setLoading(null)
  }

  const regenerateInvite = async () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase.from('groups')
      .update({ invite_code: newCode }).eq('id', group.id).select().single()
    if (data) { onUpdated(data); toast.success('New invite code generated!') }
  }

  const blockFromAlbum = async (userId: string) => {
    setBlockedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'members', label: 'Members', emoji: '👥' },
    { key: 'privacy', label: 'Privacy', emoji: '🔒' },
    { key: 'danger', label: 'Danger zone', emoji: '⚠️' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-lg glass-strong rounded-4xl border border-white/10 overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{group.name} settings</h2>
              <p className="text-white/30 text-xs mt-0.5">Manage your group</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors" data-clickable>
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 pt-4 gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-memoria-500/20 text-memoria-300 border border-memoria-500/30'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
                data-clickable>
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 160px)' }}>

            {/* MEMBERS TAB */}
            {tab === 'members' && (
              <div className="space-y-4">
                {/* Invite section */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Invite link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-sm text-white/60 bg-white/5 px-3 py-2 rounded-xl truncate">
                      {window.location.origin}/join?code={group.invite_code}
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={copyInvite}
                      className="p-2.5 rounded-xl bg-memoria-500/20 text-memoria-300 border border-memoria-500/30"
                      data-clickable>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </motion.button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-white/30">Code: <strong className="font-mono text-white/60 tracking-widest">{group.invite_code}</strong></span>
                    {isAdmin && (
                      <button onClick={regenerateInvite}
                        className="text-xs text-white/30 hover:text-aurora-amber transition-colors"
                        data-clickable>
                        Regenerate →
                      </button>
                    )}
                  </div>
                </div>

                {/* Members list */}
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">
                    {members.length} Member{members.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {members.map(member => {
                      const profile = member.profile as any
                      const isSelf = profile?.id === currentUser.id
                      const isGroupAdmin = member.role === 'admin'
                      return (
                        <motion.div key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all group"
                        >
                          <div className="w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center text-lg shrink-0">
                            {profile?.avatar_emoji || '👤'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">
                                {profile?.display_name || profile?.username}
                              </span>
                              {isGroupAdmin && (
                                <Crown size={12} className="text-aurora-amber shrink-0" />
                              )}
                              {isSelf && (
                                <span className="text-xs text-white/30">(you)</span>
                              )}
                            </div>
                            <p className="text-xs text-white/30">@{profile?.username}</p>
                          </div>

                          {/* Actions - only admin sees them, not on self */}
                          {isAdmin && !isSelf && (
                            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => removeMember(profile.id, profile.display_name || profile.username)}
                                disabled={loading === profile.id}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                                title="Remove from group"
                                data-clickable>
                                <UserMinus size={14} />
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY TAB */}
            {tab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <EyeOff size={18} className="text-aurora-pink" />
                    <div>
                      <p className="font-medium text-sm">Selective sharing blocks</p>
                      <p className="text-xs text-white/40">Choose who can&apos;t see which albums or photos</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed">
                    To block a specific person from seeing specific media, open any photo in an album,
                    tap the <strong className="text-white/50">⋯ menu</strong>, and choose &quot;Hide from...&quot; to select members.
                    This is fully private — they won&apos;t know they&apos;re blocked.
                  </p>
                </div>

                {/* Group members - block toggles */}
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Block from whole group content</p>
                  <div className="space-y-2">
                    {members.filter(m => (m.profile as any)?.id !== currentUser.id).map(member => {
                      const profile = member.profile as any
                      const isBlocked = blockedUsers.includes(profile?.id)
                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all">
                          <span className="text-lg">{profile?.avatar_emoji}</span>
                          <span className="flex-1 text-sm">{profile?.display_name || profile?.username}</span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => blockFromAlbum(profile.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                              isBlocked
                                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                            }`}
                            data-clickable>
                            {isBlocked ? (
                              <span className="flex items-center gap-1"><EyeOff size={11} /> Blocked</span>
                            ) : (
                              <span className="flex items-center gap-1"><Eye size={11} /> Can see</span>
                            )}
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* DANGER TAB */}
            {tab === 'danger' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400/60 uppercase tracking-widest mb-3">⚠️ Careful here</p>

                  <div className="space-y-3">
                    {!isAdmin && (
                      <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-sm font-medium mb-1">Leave group</p>
                        <p className="text-xs text-white/40 mb-3">You&apos;ll lose access to all albums and memories in this group.</p>
                        <button
                          onClick={async () => {
                            if (!confirm('Leave this group?')) return
                            await supabase.from('group_members')
                              .delete().eq('group_id', group.id).eq('user_id', currentUser.id)
                            toast.success('Left the group')
                            onClose()
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                          data-clickable>
                          Leave group
                        </button>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-sm font-medium mb-1 text-red-400">Delete group</p>
                        <p className="text-xs text-white/40 mb-3">This will permanently delete the group, all albums, and all memories. This cannot be undone.</p>
                        <button
                          onClick={async () => {
                            if (!confirm('DELETE this entire group and all its memories forever?')) return
                            if (!confirm('Are you 100% sure? This cannot be undone.')) return
                            await supabase.from('groups').delete().eq('id', group.id)
                            toast.success('Group deleted')
                            window.location.href = '/dashboard'
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                          data-clickable>
                          Delete group permanently
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
