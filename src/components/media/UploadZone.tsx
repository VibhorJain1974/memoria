'use client'
import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { UploadFile } from '@/types'
import { computeSimpleHash } from '@/lib/utils'
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
    const movFiles = accepted.filter(f =>
      f.name.toLowerCase().endsWith('.mov') || f.type === 'video/quicktime'
    )
    const mediaFiles = accepted.filter(f =>
      !(f.name.toLowerCase().endsWith('.mov') && f.type === 'video/quicktime')
    )
    movFiles.forEach(mov => {
      const base = mov.name.replace(/\.mov$/i, '').toLowerCase()
      liveVideoMap.current.set(base, mov)
    })
    const newFiles: UploadFile[] = mediaFiles.map(file => {
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase()
      return {
        file,
        preview: URL.createObjectURL(file),
        isLivePhoto: liveVideoMap.current.has(base) || file.type === 'image/heic',
        livePhotoVideo: liveVideoMap.current.get(base),
        status: 'pending',
        progress: 0,
      }
    })
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'video/*': [] },
    multiple: true,
  })

  // Upload to R2 via API route, save URL to Supabase
  const uploadAll = async () => {
    if (!files.length) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    let uploaded = 0

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'uploading', progress: 10 } : p))

      try {
        // Duplicate check
        const hash = await computeSimpleHash(f.file)
        const { data: existing } = await supabase.from('media').select('id')
          .eq('album_id', albumId).eq('phash', hash).single()
        if (existing) {
          setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done', progress: 100 } : p))
          continue
        }

        // Upload main file to R2
        const form = new FormData()
        form.append('file', f.file)
        form.append('groupId', groupId)
        form.append('albumId', albumId)
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
        const { url: storageUrl, key } = await res.json()

        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, progress: 70 } : p))

        // Upload Live Photo companion if present
        let livePhotoUrl: string | null = null
        if (f.isLivePhoto && f.livePhotoVideo) {
          const liveForm = new FormData()
          liveForm.append('file', f.livePhotoVideo)
          liveForm.append('groupId', groupId)
          liveForm.append('albumId', albumId)
          const liveRes = await fetch('/api/upload', { method: 'POST', body: liveForm })
          if (liveRes.ok) {
            const { url } = await liveRes.json()
            livePhotoUrl = url
          }
        }

        const mediaType = f.isLivePhoto ? 'live_photo'
          : f.file.type.startsWith('video/') ? 'video' : 'photo'

        // Save metadata to Supabase (URL, not blob)
        const { error: dbErr } = await supabase.from('media').insert({
          album_id: albumId,
          group_id: groupId,
          uploaded_by: user.id,
          storage_path: storageUrl,   // R2 public URL
          live_photo_path: livePhotoUrl,
          media_type: mediaType,
          mime_type: f.file.type,
          file_size_bytes: f.file.size,
          original_filename: f.file.name,
          phash: hash,
          caption: caption.trim() || null,
        })
        if (dbErr) throw dbErr

        uploaded++
        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done', progress: 100 } : p))
      } catch (err) {
        console.error('Upload error:', err)
        setFiles(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p))
      }
    }

    setUploading(false)
    if (uploaded > 0) {
      onUploaded()
      toast.success(`${uploaded} memor${uploaded > 1 ? 'ies' : 'y'} saved! ✨`)
      setTimeout(onClose, 700)
    }
  }

  const removeFile = (i: number) => {
    URL.revokeObjectURL(files[i].preview)
    setFiles(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="font-syne text-lg font-bold flex items-center gap-2">
          <Upload size={18} className="text-purple-400" /> Upload memories
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={22} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Drop zone */}
        <div {...getRootProps()}
          className={`upload-zone rounded-3xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'drag-over' : ''}`}>
          <input {...getInputProps()} />
          <div className="text-5xl mb-3">{isDragActive ? '🎯' : '📸'}</div>
          <h3 className="font-syne text-lg font-bold mb-1">{isDragActive ? 'Drop it!' : 'Drop photos & videos'}</h3>
          <p className="text-slate-400 text-sm">Tap to browse · Live Photos (.heic + .mov) · Full quality → Cloudflare R2</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Zap size={10} className="text-cyan-400" /> Live Photos</span>
            <span>·</span><span>Any device</span>
            <span>·</span><span>No compression</span>
            <span>·</span><span>Max 500MB/file</span>
          </div>
        </div>

        {files.length > 0 && (
          <input type="text" placeholder="Caption for all uploads (optional) ✍️"
            value={caption} onChange={e => setCaption(e.target.value)}
            className="memoria-input" />
        )}

        {/* File grid */}
        {files.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            <AnimatePresence>
              {files.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group"
                  style={{ background: '#16161f' }}>
                  {f.file.type.startsWith('video/') ? (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                  ) : (
                    <img src={f.preview} alt="" className="w-full h-full object-cover" draggable={false} />
                  )}
                  {f.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
                    </div>
                  )}
                  {f.status === 'done' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check size={14} /></div>
                    </div>
                  )}
                  {f.status === 'error' && (
                    <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center"><AlertCircle size={18} className="text-red-400" /></div>
                  )}
                  {f.isLivePhoto && f.status === 'pending' && (
                    <div className="absolute top-1 left-1"><span className="live-badge">LIVE</span></div>
                  )}
                  {f.status === 'pending' && (
                    <button onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(22,22,31,0.9)' }}>
          <p className="text-slate-400 text-sm">
            {files.length} file{files.length > 1 ? 's' : ''}
            {files.filter(f => f.isLivePhoto).length > 0 && (
              <span className="ml-2 text-cyan-400 text-xs"><Zap size={10} className="inline" /> {files.filter(f => f.isLivePhoto).length} Live</span>
            )}
          </p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={uploadAll} disabled={uploading || files.every(f => f.status === 'done')}
            className="btn-primary px-6 py-2.5 rounded-xl disabled:opacity-40">
            {uploading ? 'Uploading...' : `Upload ${files.length} to R2 ✨`}
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
