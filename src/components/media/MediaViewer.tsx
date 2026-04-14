'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Media, Profile, Reaction, Comment } from '@/types'
import { REACTION_EMOJIS } from '@/types'
import { getMediaUrl } from '@/lib/supabase'
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Download, MoreVertical, Zap, Share2 } from 'lucide-react'
import { formatRelative } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  media: Media
  allMedia: Media[]
  currentUser: Profile
  onClose: () => void
  onNavigate: (m: Media) => void
}

export function MediaViewer({ media, allMedia, currentUser, onClose, onNavigate }: Props) {
  const supabase = createClient()
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [showReactions, setShowReactions] = useState(false)
  const [showComments, setShowComments] = useState(false)
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
        media_id: media.id, user_id: currentUser.id, emoji
      }).select('*, profile:profiles(*)').single()
      if (data) setReactions(prev => [...prev, data])
    }
  }

  const sendComment = async () => {
    if (!comment.trim()) return
    const { data } = await supabase.from('comments').insert({
      media_id: media.id, user_id: currentUser.id, content: comment.trim()
    }).select('*, profile:profiles(*)').single()
    if (data) { setComments(prev => [...prev, data]); setComment('') }
  }

  const downloadMedia = async () => {
    const { data } = await supabase.storage.from('memoria-media').download(media.storage_path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = media.original_filename || `memoria_${media.id}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Saved to device! 📲')
    }
  }

  const mediaUrl = getMediaUrl(media.storage_path)
  const liveUrl = media.live_photo_path ? getMediaUrl(media.live_photo_path) : null
  const isLive = media.media_type === 'live_photo'
  const isVideo = media.media_type === 'video'

  // Reaction counts
  const reactionCounts = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1
    return acc
  }, {})

  const nav = (dir: 1 | -1) => {
    const next = allMedia[currentIndex + dir]
    if (next) onNavigate(next)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Main media area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Nav arrows */}
        {currentIndex > 0 && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => nav(-1)}
            className="absolute left-4 z-10 p-3 rounded-2xl glass border border-white/10"
            data-clickable>
            <ChevronLeft size={20} />
          </motion.button>
        )}
        {currentIndex < allMedia.length - 1 && (
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => nav(1)}
            className="absolute right-4 z-10 p-3 rounded-2xl glass border border-white/10"
            data-clickable>
            <ChevronRight size={20} />
          </motion.button>
        )}

        {/* Media */}
        <div className="relative max-w-4xl max-h-screen w-full h-full flex items-center justify-center p-16">
          {isVideo ? (
            <video src={mediaUrl} controls className="max-w-full max-h-full rounded-2xl object-contain" />
          ) : isLive && liveUrl ? (
            <div className="relative">
              <img src={mediaUrl} alt="" className="max-w-full max-h-full rounded-2xl object-contain"
                style={{ display: isLivePlaying ? 'none' : 'block' }} />
              <video ref={liveVideoRef} src={liveUrl} autoPlay muted loop
                className="max-w-full max-h-full rounded-2xl object-contain"
                style={{ display: isLivePlaying ? 'block' : 'none' }} />
              {/* Live toggle */}
              <button
                onClick={() => setIsLivePlaying(!isLivePlaying)}
                className="absolute top-3 left-3 live-badge flex items-center gap-1 cursor-pointer"
                data-clickable>
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
            <span className="text-xl">{media.uploader ? (media.uploader as any).avatar_emoji : '👤'}</span>
            <div>
              <p className="text-sm font-medium">{(media.uploader as any)?.display_name || (media.uploader as any)?.username}</p>
              <p className="text-white/40 text-xs">{media.taken_at ? formatRelative(media.taken_at) : formatRelative(media.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.1 }} onClick={downloadMedia}
              className="p-2.5 rounded-xl glass border border-white/10" data-clickable>
              <Download size={16} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} onClick={onClose}
              className="p-2.5 rounded-xl glass border border-white/10" data-clickable>
              <X size={16} />
            </motion.button>
          </div>
        </div>

        {/* Bottom: reactions bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Existing reactions */}
          {Object.entries(reactionCounts).length > 0 && (
            <div className="flex gap-2 mb-3 justify-center flex-wrap">
              {Object.entries(reactionCounts).map(([emoji, count]) => {
                const mine = reactions.some(r => r.emoji === emoji && r.user_id === currentUser.id)
                return (
                  <motion.button key={emoji} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    onClick={() => toggleReaction(emoji)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-all ${
                      mine ? 'bg-memoria-500/30 border-memoria-500/50' : 'bg-white/10 border-white/10 hover:bg-white/15'
                    }`}
                    data-clickable>
                    {emoji} <span className="font-medium">{count}</span>
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-3 justify-center">
            <div className="flex gap-1 p-1.5 rounded-2xl glass border border-white/10">
              {REACTION_EMOJIS.map(emoji => (
                <motion.button key={emoji} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.9 }}
                  onClick={() => toggleReaction(emoji)}
                  className="text-lg px-1.5 py-0.5 rounded-xl hover:bg-white/10 transition-all"
                  data-clickable>
                  {emoji}
                </motion.button>
              ))}
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(!showComments)}
              className="p-2.5 rounded-xl glass border border-white/10 relative"
              data-clickable>
              <MessageCircle size={18} />
              {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-memoria-500 text-xs flex items-center justify-center">
                  {comments.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-80 glass border-l border-white/5 flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle size={15} /> Comments
              </h3>
              <button onClick={() => setShowComments(false)} className="text-white/30 hover:text-white" data-clickable>
                <X size={16} />
              </button>
            </div>

            {/* Caption */}
            {media.caption && (
              <div className="px-4 pt-3 pb-0">
                <p className="text-sm text-white/60 italic">&ldquo;{media.caption}&rdquo;</p>
              </div>
            )}

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-8">No comments yet 👀</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <span className="text-lg shrink-0">{(c.profile as any)?.avatar_emoji || '👤'}</span>
                  <div>
                    <span className="text-xs font-semibold text-white/60">
                      {(c.profile as any)?.display_name || (c.profile as any)?.username}
                    </span>
                    <p className="text-sm text-white/80 leading-snug">{c.content}</p>
                    <p className="text-xs text-white/20 mt-0.5">{formatRelative(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input type="text" placeholder="Say something... 💬"
                value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendComment()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:border-memoria-500 transition-all" />
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={sendComment}
                disabled={!comment.trim()}
                className="px-3 py-2 rounded-xl bg-memoria-500/30 text-memoria-300 border border-memoria-500/30 disabled:opacity-30 text-sm font-medium"
                data-clickable>
                →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
