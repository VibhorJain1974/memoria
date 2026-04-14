'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Album } from '@/types'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const ALBUM_EMOJIS = ['📸', '🎉', '🏖️', '⛺', '🎮', '🍕', '🎭', '🌊', '🏔️', '🎪', '🦋', '🔥', '✨', '💃', '🎵', '🧑‍💻', '🏆', '🌸']

interface Props {
  open: boolean
  groupId: string
  onClose: () => void
  onCreated: (album: Album) => void
}

export function CreateAlbumModal({ open, groupId, onClose, onCreated }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [emoji, setEmoji] = useState('📸')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Album needs a name!')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: album, error } = await supabase.from('albums').insert({
      group_id: groupId,
      name: name.trim(),
      description: desc.trim() || null,
      emoji,
      location: location.trim() || null,
      event_date: date || null,
      created_by: user.id,
    }).select().single()

    if (error || !album) {
      toast.error('Could not create album')
    } else {
      toast.success(`${emoji} ${name} created!`)
      onCreated(album)
      onClose()
      setName(''); setDesc(''); setEmoji('📸'); setLocation(''); setDate('')
    }
    setLoading(false)
  }

  if (!open) return null

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
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md glass-strong rounded-4xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">{emoji}</span> New album
            </h2>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors" data-clickable>
              <X size={20} />
            </button>
          </div>

          {/* Emoji picker */}
          <div className="mb-5">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Album emoji</p>
            <div className="grid grid-cols-9 gap-1.5">
              {ALBUM_EMOJIS.map(e => (
                <motion.button key={e} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setEmoji(e)}
                  className={`text-xl py-1.5 rounded-xl transition-all ${
                    emoji === e ? 'bg-memoria-500/30 border border-memoria-400' : 'bg-white/5 hover:bg-white/10'
                  }`}
                  data-clickable>
                  {e}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <input type="text" placeholder="Album name (e.g. Hackathon Day 1)"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all" />
            <input type="text" placeholder="Location (optional)"
              value={location} onChange={e => setLocation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all" />
            <input type="date" placeholder="Date"
              value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-memoria-500 transition-all [color-scheme:dark]" />
            <textarea placeholder="Description (optional)" rows={2}
              value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all resize-none" />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={create} disabled={loading || !name.trim()}
            className="mt-5 w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
            data-clickable>
            {loading ? 'Creating...' : `Create ${emoji} album`}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
