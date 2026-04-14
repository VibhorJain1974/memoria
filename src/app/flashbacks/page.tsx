'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Flashback, Media } from '@/types'
import { getMediaUrl, getThumbnailUrl } from '@/lib/supabase'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, subMonths } from 'date-fns'

export default function FlashbacksPage() {
  const supabase = createClient()
  const [flashbacks, setFlashbacks] = useState<Flashback[]>([])
  const [selected, setSelected] = useState<Flashback | null>(null)
  const [mediaMap, setMediaMap] = useState<Record<string, Media[]>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: fb } = await supabase.from('flashbacks')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setFlashbacks(fb || [])
      setLoading(false)
    }
    load()
  }, [])

  const openFlashback = async (fb: Flashback) => {
    setSelected(fb)
    // Mark as seen
    if (!fb.is_seen) {
      await supabase.from('flashbacks').update({ is_seen: true }).eq('id', fb.id)
      setFlashbacks(prev => prev.map(f => f.id === fb.id ? { ...f, is_seen: true } : f))
    }
    // Load media
    if (fb.media_ids.length > 0 && !mediaMap[fb.id]) {
      const { data } = await supabase.from('media').select('*').in('id', fb.media_ids)
      setMediaMap(prev => ({ ...prev, [fb.id]: data || [] }))
    }
  }

  const generateFlashback = async () => {
    setGenerating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const monthAgo = subMonths(now, 1)

    // Get all media from a month ago across all user's groups
    const { data: memberGroups } = await supabase.from('group_members')
      .select('group_id').eq('user_id', user.id)
    const groupIds = (memberGroups || []).map(m => m.group_id)

    if (groupIds.length === 0) { setGenerating(false); return }

    const { data: oldMedia } = await supabase.from('media')
      .select('id').in('group_id', groupIds)
      .gte('created_at', format(subMonths(monthAgo, 0.5), 'yyyy-MM-dd'))
      .lte('created_at', format(monthAgo, 'yyyy-MM-dd'))
      .order('created_at', { ascending: false })
      .limit(16)

    if (!oldMedia || oldMedia.length === 0) {
      setGenerating(false)
      alert("Not enough memories from a month ago yet! Come back later 🌙")
      return
    }

    const mediaIds = oldMedia.map(m => m.id)
    const { data: fb } = await supabase.from('flashbacks').insert({
      user_id: user.id,
      group_id: groupIds[0],
      title: `${format(monthAgo, 'MMMM yyyy')} memories ✨`,
      media_ids: mediaIds,
      period_month: monthAgo.getMonth() + 1,
      period_year: monthAgo.getFullYear(),
    }).select().single()

    if (fb) {
      setFlashbacks(prev => [fb, ...prev])
      openFlashback(fb)
    }
    setGenerating(false)
  }

  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-aurora-amber" size={28} />
              Flashbacks
            </h1>
            <p className="text-white/30 text-sm mt-1">Your memories from the past, rediscovered ✨</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={generateFlashback} disabled={generating}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f472b6)' }}
            data-clickable>
            {generating ? 'Generating...' : '✨ Generate flashback'}
          </motion.button>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-56 shimmer rounded-3xl" />)}
        </div>
      ) : flashbacks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-24 glass rounded-3xl border border-white/5 max-w-md mx-auto">
          <div className="text-5xl mb-4">🎞️</div>
          <h3 className="font-display text-xl font-semibold mb-2">No flashbacks yet</h3>
          <p className="text-white/30 text-sm mb-6">
            Flashbacks are auto-generated monthly. Upload more memories and check back!
          </p>
          <button onClick={generateFlashback} disabled={generating}
            className="px-6 py-3 rounded-2xl font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f472b6)' }}
            data-clickable>
            {generating ? 'Generating...' : 'Try generating one now'}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashbacks.map((fb, i) => (
            <motion.div key={fb.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => openFlashback(fb)}
              className="relative rounded-3xl overflow-hidden cursor-pointer h-56 bg-dark-card"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(244,114,182,0.2))' }}
              data-clickable>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl opacity-30">🎞️</div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              {!fb.is_seen && (
                <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-aurora-amber animate-pulse" />
              )}
              <div className="absolute bottom-0 p-4">
                <p className="font-display font-bold text-lg">{fb.title}</p>
                <p className="text-white/50 text-xs">
                  {MONTH_NAMES[fb.period_month]} {fb.period_year} · {fb.media_ids.length} memories
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Flashback viewer modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex flex-col"
            onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <div className="flex items-center justify-between p-5 glass border-b border-white/5">
              <h2 className="font-display text-xl font-bold">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white"
                data-clickable>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {mediaMap[selected.id] ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-w-4xl mx-auto">
                  {mediaMap[selected.id].map((m, i) => (
                    <motion.div key={m.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="aspect-square rounded-2xl overflow-hidden bg-dark-card">
                      <img src={getThumbnailUrl(m.storage_path)} alt=""
                        className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-2 border-aurora-amber border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
