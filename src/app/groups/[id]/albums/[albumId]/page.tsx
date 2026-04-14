'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import type { Album, Media, Profile } from '@/types'
import { MediaGrid } from '@/components/media/MediaGrid'
import { UploadZone } from '@/components/media/UploadZone'
import { MediaViewer } from '@/components/media/MediaViewer'
import { Upload, Grid, List, Filter, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AlbumPage() {
  const { id, albumId } = useParams<{ id: string; albumId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [album, setAlbum] = useState<Album | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [viewerMedia, setViewerMedia] = useState<Media | null>(null)
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos' | 'live'>('all')
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  const loadMedia = useCallback(async () => {
    const { data } = await supabase
      .from('media')
      .select('*, uploader:profiles!uploaded_by(*)')
      .eq('album_id', albumId)
      .eq('is_duplicate', false)
      .order('taken_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    setMedia(data || [])
  }, [albumId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: a }, { data: prof }] = await Promise.all([
        supabase.from('albums').select('*').eq('id', albumId).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])

      setAlbum(a)
      setCurrentUser(prof)
      await loadMedia()
      setLoading(false)
    }
    load()
  }, [albumId])

  const filteredMedia = media.filter(m => {
    if (filter === 'all') return true
    if (filter === 'photos') return m.media_type === 'photo'
    if (filter === 'videos') return m.media_type === 'video'
    if (filter === 'live') return m.media_type === 'live_photo'
    return true
  })

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return
    const selected = media.filter(m => selectedIds.has(m.id))
    toast.success(`Downloading ${selected.length} file${selected.length > 1 ? 's' : ''}...`)
    for (const m of selected) {
      const { data } = await supabase.storage.from('memoria-media').download(m.storage_path)
      if (data) {
        const url = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = url
        a.download = m.original_filename || `memoria_${m.id}`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/groups/${id}`)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all"
            data-clickable>
            <ArrowLeft size={18} />
          </motion.button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{album?.emoji}</span>
            <h1 className="font-display text-xl font-bold truncate">{album?.name}</h1>
            <span className="text-white/30 text-sm">{media.length}</span>
          </div>

          <div className="flex items-center gap-2">
            {selectMode && selectedIds.size > 0 && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                onClick={downloadSelected}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/30 hover:bg-aurora-cyan/30 transition-all"
                data-clickable>
                Save {selectedIds.size} to gallery ↓
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectMode ? 'bg-memoria-500/30 border border-memoria-500/30 text-memoria-300' : 'bg-white/5 hover:bg-white/10 text-white/50'
              }`}
              data-clickable>
              {selectMode ? 'Cancel' : 'Select'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
              data-clickable>
              <Upload size={14} />
              Upload
            </motion.button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          {(['all', 'photos', 'videos', 'live'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === f ? 'bg-memoria-500/25 text-memoria-300 border border-memoria-500/30' : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
              data-clickable>
              {f === 'all' ? 'All' : f === 'photos' ? '📸 Photos' : f === 'videos' ? '🎬 Videos' : '✨ Live'}
            </button>
          ))}
          {album?.location && (
            <span className="ml-auto text-xs text-white/30 flex items-center gap-1">
              📍 {album.location}
            </span>
          )}
        </div>
      </div>

      {/* Media grid */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className={`shimmer rounded-2xl ${i % 5 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`} />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 glass rounded-3xl border border-white/5 mx-auto max-w-sm">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-display text-xl font-semibold mb-2">No memories yet</h3>
            <p className="text-white/30 text-sm mb-6">Be the first to upload!</p>
            <button onClick={() => setShowUpload(true)}
              className="px-6 py-3 rounded-2xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
              data-clickable>
              Upload photos 📸
            </button>
          </motion.div>
        ) : (
          <MediaGrid
            media={filteredMedia}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onMediaClick={(m) => { if (!selectMode) setViewerMedia(m) }}
          />
        )}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadZone
            albumId={albumId}
            groupId={id}
            onClose={() => setShowUpload(false)}
            onUploaded={() => { loadMedia(); toast.success('Memories saved! ✨') }}
          />
        )}
      </AnimatePresence>

      {/* Media viewer */}
      <AnimatePresence>
        {viewerMedia && (
          <MediaViewer
            media={viewerMedia}
            allMedia={filteredMedia}
            currentUser={currentUser!}
            onClose={() => setViewerMedia(null)}
            onNavigate={setViewerMedia}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
