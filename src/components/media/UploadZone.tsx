'use client'
import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { UploadFile } from '@/types'
import { computeSimpleHash, isLivePhoto, isVideo } from '@/lib/utils'
import { X, Upload, Zap, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  albumId: string
  groupId: string
  onClose: () => void
  onUploaded: () => void
}

export function UploadZone({ albumId, groupId, onClose, onUploaded }: Props) {
  const supabase = createClient()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const liveVideoMap = useRef<Map<string, File>>(new Map())

  const onDrop = useCallback(async (accepted: File[]) => {
    const newFiles: UploadFile[] = []
    const movFiles = accepted.filter(f => f.name.toLowerCase().endsWith('.mov') || f.type === 'video/quicktime')
    const mediaFiles = accepted.filter(f => !f.name.toLowerCase().endsWith('.mov') || f.type !== 'video/quicktime')

    // Map .mov files by base name for live photo pairing
    movFiles.forEach(mov => {
      const base = mov.name.replace(/\.mov$/i, '').toLowerCase()
      liveVideoMap.current.set(base, mov)
    })

    for (const file of mediaFiles) {
      const preview = URL.createObjectURL(file)
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase()
      const hasPairedMov = liveVideoMap.current.has(base)

      newFiles.push({
        file,
        preview,
        isLivePhoto: hasPairedMov || (file.type === 'image/heic'),
        livePhotoVideo: liveVideoMap.current.get(base),
        status: 'pending',
        progress: 0,
      })
    }

    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
    },
    multiple: true,
  })

  const uploadAll = async () => {
    if (files.length === 0) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let uploaded = 0

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading', progress: 0 } : p))

      try {
        // Compute hash for duplicate detection
        const hash = await computeSimpleHash(f.file)

        // Check for duplicate
        const { data: existing } = await supabase
          .from('media')
          .select('id')
          .eq('album_id', albumId)
          .eq('phash', hash)
          .single()

        if (existing) {
          setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done', progress: 100 } : p))
          continue // Skip duplicate
        }

        // Upload main file
        const ext = f.file.name.split('.').pop()
        const path = `${groupId}/${albumId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('memoria-media')
          .upload(path, f.file, { cacheControl: '31536000' })

        if (uploadError) throw uploadError

        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: 70 } : p))

        // Upload live photo companion
        let livePhotoPath: string | null = null
        if (f.isLivePhoto && f.livePhotoVideo) {
          const livePath = path.replace(/\.[^.]+$/, '.mov')
          await supabase.storage.from('memoria-media').upload(livePath, f.livePhotoVideo, { cacheControl: '31536000' })
          livePhotoPath = livePath
        }

        // Get EXIF-like metadata
        const mediaType = f.isLivePhoto ? 'live_photo' : isVideo(f.file) ? 'video' : 'photo'

        // Save to DB
        const { error: dbError } = await supabase.from('media').insert({
          album_id: albumId,
          group_id: groupId,
          uploaded_by: user.id,
          storage_path: path,
          live_photo_path: livePhotoPath,
          media_type: mediaType,
          mime_type: f.file.type,
          file_size_bytes: f.file.size,
          original_filename: f.file.name,
          phash: hash,
          caption: caption.trim() || null,
        })

        if (dbError) throw dbError

        uploaded++
        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done', progress: 100 } : p))
      } catch (err) {
        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
      }
    }

    setUploading(false)
    if (uploaded > 0) {
      onUploaded()
      toast.success(`${uploaded} memor${uploaded > 1 ? 'ies' : 'y'} saved! ✨`)
      setTimeout(onClose, 800)
    }
  }

  const removeFile = (i: number) => {
    URL.revokeObjectURL(files[i].preview)
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass border-b border-white/5">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Upload size={18} className="text-memoria-400" />
          Upload memories
        </h2>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors" data-clickable>
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`upload-zone rounded-3xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'drag-over' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="text-5xl mb-4">{isDragActive ? '🎯' : '📸'}</div>
          <h3 className="font-display text-xl font-semibold mb-2">
            {isDragActive ? 'Drop it!' : 'Drop photos & videos here'}
          </h3>
          <p className="text-white/30 text-sm">
            or tap to browse · supports Live Photos (.heic + .mov) · full quality
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-white/20">
            <span className="flex items-center gap-1"><Zap size={10} className="text-aurora-cyan" /> Live Photos supported</span>
            <span>·</span>
            <span>Any device</span>
            <span>·</span>
            <span>No compression</span>
          </div>
        </div>

        {/* Caption */}
        {files.length > 0 && (
          <input type="text" placeholder="Add a caption to all uploads (optional) ✍️"
            value={caption} onChange={e => setCaption(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all" />
        )}

        {/* File previews */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
            <AnimatePresence>
              {files.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-2xl overflow-hidden bg-dark-card group"
                >
                  {f.file.type.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-dark-surface">🎬</div>
                  ) : (
                    <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  )}

                  {/* Status overlay */}
                  {f.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 border-memoria-500 border-t-transparent animate-spin" />
                    </div>
                  )}
                  {f.status === 'done' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    </div>
                  )}
                  {f.status === 'error' && (
                    <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                      <AlertCircle size={18} className="text-red-400" />
                    </div>
                  )}

                  {/* Live badge */}
                  {f.isLivePhoto && f.status === 'pending' && (
                    <div className="absolute top-1 left-1">
                      <span className="live-badge">LIVE</span>
                    </div>
                  )}

                  {/* Remove button */}
                  {f.status === 'pending' && (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      data-clickable>
                      <X size={10} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      {files.length > 0 && (
        <div className="px-6 py-4 glass border-t border-white/5 flex items-center justify-between">
          <p className="text-white/40 text-sm">
            {files.length} file{files.length > 1 ? 's' : ''}
            {files.filter(f => f.isLivePhoto).length > 0 && (
              <span className="ml-2 text-aurora-cyan text-xs">
                <Zap size={10} className="inline" /> {files.filter(f => f.isLivePhoto).length} Live
              </span>
            )}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={uploadAll}
            disabled={uploading || files.every(f => f.status === 'done')}
            className="px-8 py-3 rounded-2xl font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
            data-clickable>
            {uploading ? `Uploading...` : `Upload ${files.length} file${files.length > 1 ? 's' : ''} ✨`}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
