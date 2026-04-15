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
import { FaceGrouping } from '@/components/media/FaceGrouping'
import { Upload, ArrowLeft, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type FilterTab = 'all' | 'photos' | 'videos' | 'live' | 'faces'

export default function AlbumPage() {
  const { id, albumId } = useParams<{ id: string; albumId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [album, setAlbum]           = useState<Album | null>(null)
  const [media, setMedia]           = useState<Media[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [showUpload, setShowUpload]  = useState(false)
  const [viewerMedia, setViewerMedia] = useState<Media | null>(null)
  const [filter, setFilter]         = useState<FilterTab>('all')
  const [loading, setLoading]       = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [faceFilterIds, setFaceFilterIds] = useState<string[] | null>(null)

  const loadMedia = useCallback(async () => {
    const { data } = await supabase
      .from('media')
      .select('*, uploader:profiles!uploaded_by(*)')
      .eq('album_id', albumId)
      .eq('is_duplicate', false)
      .order('taken_at',    { ascending: false, nullsFirst: false })
      .order('created_at',  { ascending: false })
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

  // Filtered media — applies both tab filter + face filter
  const filteredMedia = media.filter(m => {
    // Face filter overrides everything when active
    if (filter === 'faces' && faceFilterIds !== null) {
      return faceFilterIds.includes(m.id)
    }
    if (filter === 'all'    || filter === 'faces') return true
    if (filter === 'photos') return m.media_type === 'photo'
    if (filter === 'videos') return m.media_type === 'video'
    if (filter === 'live')   return m.media_type === 'live_photo'
    return true
  })

  const downloadSelected = async () => {
    if (selectedIds.size === 0) return
    const selected = media.filter(m => selectedIds.has(m.id))
    toast.success(`Downloading ${selected.length} file${selected.length > 1 ? 's' : ''}...`)
    for (const m of selected) {
      try {
        const res  = await fetch(m.storage_path)
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = m.original_filename || `memoria_${m.id}`; a.click()
        URL.revokeObjectURL(url)
      } catch { /* skip */ }
    }
  }

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',    label: 'All' },
    { id: 'faces',  label: '👤 Faces' },
    { id: 'photos', label: '📸 Photos' },
    { id: 'videos', label: '🎬 Videos' },
    { id: 'live',   label: '✨ Live' },
  ]

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass border-b border-white/5 px-4 sm:px-6 py-4"
        style={{ backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/groups/${id}`)}
            className="p-2 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </motion.button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{album?.emoji}</span>
            <h1 className="font-syne text-xl font-bold truncate">{album?.name}</h1>
            <span className="text-white/30 text-sm">{media.length}</span>
          </div>

          <div className="flex items-center gap-2">
            {selectMode && selectedIds.size > 0 && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                onClick={downloadSelected}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ↓ {selectedIds.size}
              </motion.button>
            )}
            <button onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectMode
                  ? 'bg-purple-500/30 border border-purple-500/30 text-purple-300'
                  : 'bg-white/5 hover:bg-white/10 text-white/50'
              }`}>
              {selectMode ? 'Cancel' : 'Select'}
            </button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}>
              <Upload size={14} />
              Upload
            </motion.button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === f.id
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/30'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}>
              {f.label}
            </button>
          ))}
          {album?.location && (
            <span className="ml-auto flex-shrink-0 text-xs text-white/30 flex items-center gap-1 pr-1">
              📍 {album.location}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Face grouping — shows when on Faces tab or always as optional scan */}
        {!loading && media.length > 0 && (
          <FaceGrouping
            media={media}
            groupId={id}
            albumId={albumId}
            onFilterChange={(ids) => {
              setFaceFilterIds(ids)
              if (ids !== null) setFilter('faces')
            }}
          />
        )}

        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className={`shimmer rounded-2xl ${i % 5 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`} />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 glass rounded-3xl border border-white/5">
            <div className="text-5xl mb-4">
              {filter === 'faces' ? '👤' : '📭'}
            </div>
            <h3 className="font-syne text-xl font-semibold mb-2">
              {filter === 'faces' ? 'No face selected' : 'No memories yet'}
            </h3>
            <p className="text-white/30 text-sm mb-6">
              {filter === 'faces'
                ? 'Tap a face above to filter, or scan faces first'
                : 'Be the first to upload!'}
            </p>
            {filter !== 'faces' && (
              <button onClick={() => setShowUpload(true)}
                className="btn-primary px-6 py-3 rounded-2xl">
                Upload photos 📸
              </button>
            )}
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
        {viewerMedia && currentUser && (
          <MediaViewer
            media={viewerMedia}
            allMedia={filteredMedia}
            currentUser={currentUser}
            onClose={() => setViewerMedia(null)}
            onNavigate={setViewerMedia}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
