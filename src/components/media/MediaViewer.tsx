'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Media, Profile, Reaction, Comment } from '@/types'
import { REACTION_EMOJIS } from '@/types'
import { getMediaUrl } from '@/lib/supabase'
import { X, ChevronLeft, ChevronRight, MessageCircle, Download, MoreVertical, Zap, EyeOff, Check } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  media: Media
  allMedia: Media[]
  currentUser: Profile
  onClose: () => void
  onNavigate: (m: Media) => void
}

interface GroupMember { id: string; display_name?: string; avatar_emoji: string; user_id: string }

export function MediaViewer({ media, allMedia, currentUser, onClose, onNavigate }: Props) {
  const supabase = createClient()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showHideModal, setShowHideModal] = useState(false)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [hiddenFrom, setHiddenFrom] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [isLivePlaying, setIsLivePlaying] = useState(false)
  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const currentIndex = allMedia.findIndex(m => m.id === media.id)

  useEffect(() => {
    const load = async () => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from('reactions').select('*, profile:profiles(*)').eq('media_id', media.id),
        supabase.from('comments').select('*, profile:profiles(*)').eq('media_id', media.id)
          .is('parent_id', null).order('created_at', { ascending: true }),
      ])
      setReactions(r || [])
      setComments(c || [])
    }
    load()
  }, [media.id])

  const toggleReaction = async (emoji: string) => {
    const existing = reactions.find(r => r.user_id === currentUser.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
      setReactions(prev => prev.filter(r => r.id !== existing.id))
    } else {
      const { data } = await supabase.from('reactions').insert({
        media_id: media.id, user_id: currentUser.id, emoji,
      }).select('*, profile:profiles(*)').single()
      if (data) setReactions(prev => [...prev, data])
    }
  }

  const sendComment = async () => {
    if (!comment.trim()) return
    const { data } = await supabase.from('comments').insert({
      media_id: media.id, user_id: currentUser.id, content: comment.trim(),
    }).select('*, profile:profiles(*)').single()
    if (data) { setComments(prev => [...prev, data]); setComment('') }
  }

  const downloadMedia = async () => {
    try {
      const res = await fetch(getMediaUrl(media.storage_path))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = media.original_filename || `memoria_${media.id}`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Saved! 📲')
    } catch { toast.error('Download failed') }
  }

  // Load group members + existing sharing blocks for this media
  const openHideModal = async () => {
    setShowMenu(false)
    // Use RPC to avoid RLS recursion when fetching other members
    const { data: membersRaw } = await supabase
      .rpc('get_group_members', { p_group_id: media.group_id })
    const members = (membersRaw || []).filter((m: any) => m.user_id !== currentUser.id)
    const { data: blocks } = await supabase
      .from('sharing_blocks')
      .select('blocked_user_id')
      .eq('media_id', media.id)
    setGroupMembers(members.map((m: any) => {
      return {
        id: m.user_id,
        display_name: m.display_name ?? undefined,
        avatar_emoji: m.avatar_emoji ?? '👤',
        user_id: m.user_id,
      }
    }))
    setHiddenFrom((blocks || []).map(b => b.blocked_user_id))
    setShowHideModal(true)
  }

  const toggleHide = async (userId: string) => {
    const alreadyHidden = hiddenFrom.includes(userId)
    if (alreadyHidden) {
      await supabase.from('sharing_blocks')
        .delete().eq('media_id', media.id).eq('blocked_user_id', userId)
      setHiddenFrom(prev => prev.filter(id => id !== userId))
      toast.success('Sharing unblocked')
    } else {
      await supabase.from('sharing_blocks').insert({
        blocker_id: currentUser.id,
        blocked_user_id: userId,
        media_id: media.id,
        group_id: media.group_id,
      })
      setHiddenFrom(prev => [...prev, userId])
      toast.success('Hidden from that person ✅')
    }
  }

  const mediaUrl = getMediaUrl(media.storage_path)
  const liveUrl = media.live_photo_path ? getMediaUrl(media.live_photo_path) : null
  const isLive = media.media_type === 'live_photo'
  const isVideo = media.media_type === 'video'

  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc
  }, {})

  const nav = (dir: 1 | -1) => { const next = allMedia[currentIndex + dir]; if (next) onNavigate(next) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Main media */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentIndex > 0 && (
          <button onClick={() => nav(-1)} className="absolute left-4 z-10 p-3 rounded-2xl glass border border-white/10"><ChevronLeft size={20} /></button>
        )}
        {currentIndex < allMedia.length - 1 && (
          <button onClick={() => nav(1)} className="absolute right-4 z-10 p-3 rounded-2xl glass border border-white/10"><ChevronRight size={20} /></button>
        )}

        <div className="relative max-w-4xl max-h-screen w-full h-full flex items-center justify-center p-14">
          {isVideo ? (
            <video src={mediaUrl} controls className="max-w-full max-h-full rounded-2xl" />
          ) : isLive && liveUrl ? (
            <div className="relative">
              <img src={mediaUrl} alt="" className="max-w-full max-h-full rounded-2xl object-contain" style={{ display: isLivePlaying ? 'none' : 'block' }} />
              <video ref={liveVideoRef} src={liveUrl} autoPlay muted loop className="max-w-full max-h-full rounded-2xl object-contain" style={{ display: isLivePlaying ? 'block' : 'none' }} />
              <button onClick={() => setIsLivePlaying(!isLivePlaying)} className="absolute top-3 left-3 live-badge flex items-center gap-1">
                <Zap size={9} /> {isLivePlaying ? 'LIVE ●' : 'LIVE'}
              </button>
            </div>
          ) : (
            <img src={mediaUrl} alt={media.caption || ''} className="max-w-full max-h-full rounded-2xl object-contain" />
          )}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{(media.uploader as Profile)?.avatar_emoji || '👤'}</span>
            <div>
              <p className="text-sm font-medium">{(media.uploader as Profile)?.display_name}</p>
              <p className="text-white/40 text-xs">{formatRelative(media.taken_at || media.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadMedia} className="p-2.5 rounded-xl glass border border-white/10"><Download size={16} /></button>

            {/* ⋯ menu */}
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2.5 rounded-xl glass border border-white/10"><MoreVertical size={16} /></button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute right-0 top-12 glass border border-white/10 rounded-2xl overflow-hidden min-w-44 z-20">
                    <button onClick={openHideModal} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition-all text-left">
                      <EyeOff size={14} className="text-white/50" /> Hide from...
                    </button>
                    <button onClick={() => { setShowMenu(false); onClose() }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition-all text-left">
                      <X size={14} className="text-white/50" /> Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={onClose} className="p-2.5 rounded-xl glass border border-white/10"><X size={16} /></button>
          </div>
        </div>

        {/* Bottom reactions bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {Object.entries(reactionCounts).length > 0 && (
            <div className="flex gap-2 mb-3 justify-center flex-wrap">
              {Object.entries(reactionCounts).map(([emoji, count]) => {
                const mine = reactions.some(r => r.emoji === emoji && r.user_id === currentUser.id)
                return (
                  <button key={emoji} onClick={() => toggleReaction(emoji)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-all ${mine ? 'bg-purple-500/30 border-purple-500/50' : 'bg-white/10 border-white/10 hover:bg-white/15'}`}>
                    {emoji} <span className="font-medium">{count}</span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-3 justify-center">
            <div className="flex gap-1 p-1.5 rounded-2xl glass border border-white/10">
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => toggleReaction(emoji)} className="text-lg px-1.5 py-0.5 rounded-xl hover:bg-white/10 transition-all">{emoji}</button>
              ))}
            </div>
            <button onClick={() => setShowComments(!showComments)}
              className="p-2.5 rounded-xl glass border border-white/10 relative">
              <MessageCircle size={18} />
              {comments.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-xs flex items-center justify-center">{comments.length}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ x: 360, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-72 glass border-l border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
            </div>
            {media.caption && <div className="px-4 pt-3"><p className="text-sm text-white/50 italic">"{media.caption}"</p></div>}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 && <p className="text-center text-white/25 text-sm mt-6">No comments yet 👀</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <span className="text-lg shrink-0">{(c.profile as Profile)?.avatar_emoji || '👤'}</span>
                  <div>
                    <span className="text-xs font-semibold text-white/50">{(c.profile as Profile)?.display_name}</span>
                    <p className="text-sm text-white/80">{c.content}</p>
                    <p className="text-xs text-white/20 mt-0.5">{formatRelative(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input type="text" placeholder="Say something... 💬" value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendComment()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple-500 transition-all" />
              <button onClick={sendComment} disabled={!comment.trim()} className="px-3 py-2 rounded-xl bg-purple-500/30 text-purple-300 border border-purple-500/30 disabled:opacity-30 text-sm">→</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hide from modal */}
      <AnimatePresence>
        {showHideModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowHideModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass border border-white/10 rounded-3xl p-6 w-full max-w-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><EyeOff size={16} className="text-pink-400" /> Hide from...</h3>
                <button onClick={() => setShowHideModal(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-xs text-white/35 mb-4 leading-relaxed">
                Hidden people won't see this photo. They don't know they're blocked — it just won't appear for them.
              </p>
              {groupMembers.length === 0
                ? <p className="text-center text-white/30 text-sm py-4">No other members in this group.</p>
                : <div className="space-y-2">
                  {groupMembers.map(member => {
                    const isHidden = hiddenFrom.includes(member.id)
                    return (
                      <button key={member.id} onClick={() => toggleHide(member.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${isHidden ? 'bg-pink-500/15 border-pink-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <span className="text-xl">{member.avatar_emoji}</span>
                        <span className="flex-1 text-left text-sm">{member.display_name || 'Member'}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isHidden ? 'bg-pink-500 border-pink-500' : 'border-white/30'}`}>
                          {isHidden && <Check size={11} strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              }
              <button onClick={() => setShowHideModal(false)} className="mt-4 w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white/60">
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}