'use client'
/**
 * FaceGrouping — detects faces in album photos client-side using face-api.js
 * Shows Instagram-style horizontal scrollable face bubbles at top of album.
 * Tap a face → filters the grid to photos containing that person.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Media } from '@/types'

interface FaceCluster {
  id: string
  label: string
  cover_url: string
  media_ids: string[]
  media_count: number
}

interface Props {
  media: Media[]
  groupId: string
  albumId: string
  onFilterChange: (mediaIds: string[] | null) => void
}

export function FaceGrouping({ media, groupId, albumId, onFilterChange }: Props) {
  const [clusters, setClusters]         = useState<FaceCluster[]>([])
  const [activeFace, setActiveFace]     = useState<string | null>(null)
  const [scanning, setScanning]         = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [hasScanned, setHasScanned]     = useState(false)
  const supabase = createClient()

  // Load existing clusters from DB on mount
  useEffect(() => {
    loadClusters()
  }, [albumId])

  async function loadClusters() {
    const { data } = await supabase
      .from('face_clusters')
      .select('*')
      .eq('group_id', groupId)
      .order('media_count', { ascending: false })
    if (data && data.length > 0) {
      // Build clusters with cover thumbnails from media
      const enriched: FaceCluster[] = data.map(c => {
        const coverMedia = media.find(m => m.id === c.cover_media_id)
        return {
          id: c.id,
          label: c.label || 'Person',
          cover_url: coverMedia?.storage_path || coverMedia?.thumbnail_path || '',
          media_ids: [],
          media_count: c.media_count || 0,
        }
      })
      // Load media_ids per cluster
      const { data: faces } = await supabase
        .from('media_faces')
        .select('media_id, cluster_id')
        .in('cluster_id', data.map(c => c.id))
      if (faces) {
        faces.forEach(f => {
          const cluster = enriched.find(c => c.id === f.cluster_id)
          if (cluster && !cluster.media_ids.includes(f.media_id)) {
            cluster.media_ids.push(f.media_id)
          }
        })
      }
      setClusters(enriched.filter(c => c.media_count > 0))
      setHasScanned(true)
    }
  }

  async function loadFaceApiModels() {
    if (modelsLoaded) return true
    try {
      // Dynamically import face-api.js
      const faceapi = await import('@vladmandic/face-api')
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model'
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ])
      setModelsLoaded(true)
      return true
    } catch (err) {
      console.error('Failed to load face-api models:', err)
      return false
    }
  }

  async function scanFaces() {
    if (scanning) return
    setScanning(true)
    setScanProgress(0)

    const loaded = await loadFaceApiModels()
    if (!loaded) { setScanning(false); return }

    const faceapi = await import('@vladmandic/face-api')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setScanning(false); return }

    // Only scan photos (not videos)
    const photoMedia = media.filter(m => m.media_type !== 'video').slice(0, 50)
    const allDescriptors: { mediaId: string; descriptor: Float32Array; imgUrl: string }[] = []

    for (let i = 0; i < photoMedia.length; i++) {
      const m = photoMedia[i]
      setScanProgress(Math.round((i / photoMedia.length) * 70))
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // skip on error
          img.src = m.storage_path.startsWith('http')
            ? m.storage_path
            : `${process.env.NEXT_PUBLIC_R2_URL}/${m.storage_path}`
          setTimeout(resolve, 5000) // timeout
        })
        const detections = await faceapi
          .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors()

        for (const det of detections) {
          allDescriptors.push({ mediaId: m.id, descriptor: det.descriptor, imgUrl: m.storage_path })
        }
      } catch { /* skip */ }
    }

    setScanProgress(75)

    if (allDescriptors.length === 0) {
      setScanning(false)
      setScanProgress(0)
      alert('No faces found in these photos. Try uploading photos with people in them!')
      return
    }

    // Simple clustering: group faces by similarity (Euclidean distance < 0.55)
    const THRESHOLD = 0.55
    const clusterGroups: { descriptors: Float32Array[]; mediaIds: string[]; coverUrl: string }[] = []

    for (const item of allDescriptors) {
      let matched = false
      for (const cluster of clusterGroups) {
        // Compare to all descriptors in cluster
        const distances = cluster.descriptors.map(d => {
          let sum = 0
          for (let k = 0; k < d.length; k++) sum += (d[k] - item.descriptor[k]) ** 2
          return Math.sqrt(sum)
        })
        const minDist = Math.min(...distances)
        if (minDist < THRESHOLD) {
          cluster.descriptors.push(item.descriptor)
          if (!cluster.mediaIds.includes(item.mediaId)) {
            cluster.mediaIds.push(item.mediaId)
          }
          matched = true
          break
        }
      }
      if (!matched) {
        clusterGroups.push({
          descriptors: [item.descriptor],
          mediaIds: [item.mediaId],
          coverUrl: item.imgUrl,
        })
      }
    }

    setScanProgress(85)

    // Save clusters to DB (only those with 2+ photos)
    const significantClusters = clusterGroups.filter(c => c.mediaIds.length >= 1)
    const newClusters: FaceCluster[] = []

    for (let i = 0; i < significantClusters.length; i++) {
      const cg = significantClusters[i]
      const coverMediaId = media.find(m => m.id === cg.mediaIds[0])?.id || null

      const { data: dbCluster } = await supabase.from('face_clusters').insert({
        group_id:        groupId,
        label:           `Person ${i + 1}`,
        cover_media_id:  coverMediaId,
        media_count:     cg.mediaIds.length,
      }).select().single()

      if (dbCluster) {
        // Save face links
        await supabase.from('media_faces').insert(
          cg.mediaIds.map(mid => ({ media_id: mid, cluster_id: dbCluster.id }))
        )
        newClusters.push({
          id: dbCluster.id,
          label: dbCluster.label || `Person ${i + 1}`,
          cover_url: cg.coverUrl,
          media_ids: cg.mediaIds,
          media_count: cg.mediaIds.length,
        })
        // Update cluster count
        await supabase.from('face_clusters').update({ media_count: cg.mediaIds.length }).eq('id', dbCluster.id)
      }
    }

    setScanProgress(100)
    setClusters(newClusters)
    setHasScanned(true)
    setScanning(false)
  }

  function handleFaceTap(cluster: FaceCluster) {
    if (activeFace === cluster.id) {
      setActiveFace(null)
      onFilterChange(null)
    } else {
      setActiveFace(cluster.id)
      onFilterChange(cluster.media_ids)
    }
  }

  async function renameFace(clusterId: string, currentLabel: string) {
    const newLabel = prompt('Rename this person:', currentLabel)
    if (!newLabel || newLabel === currentLabel) return
    await supabase.from('face_clusters').update({ label: newLabel }).eq('id', clusterId)
    setClusters(prev => prev.map(c => c.id === clusterId ? { ...c, label: newLabel } : c))
  }

  if (media.filter(m => m.media_type !== 'video').length === 0) return null

  return (
    <div className="mb-4">
      {clusters.length === 0 && !hasScanned ? (
        /* Scan prompt */
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={scanFaces}
          disabled={scanning}
          className="w-full py-3 px-4 rounded-2xl border border-dashed border-white/20 text-sm text-white/40 hover:text-white/70 hover:border-white/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {scanning ? (
            <>
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span>Scanning faces... {scanProgress}%</span>
              <div className="flex-1 max-w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${scanProgress}%` }} />
              </div>
            </>
          ) : (
            <>
              <span>👤</span>
              <span>Scan faces — group photos by person</span>
            </>
          )}
        </motion.button>
      ) : clusters.length > 0 ? (
        /* Face bubbles row */
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/30 uppercase tracking-widest">
              {activeFace ? `Filtering by person` : 'People'}
            </span>
            <button onClick={() => { setActiveFace(null); onFilterChange(null); setClusters([]); setHasScanned(false) }}
              className="text-xs text-white/20 hover:text-white/50 transition-colors">
              rescan
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* "All" pill */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setActiveFace(null); onFilterChange(null) }}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${
                !activeFace
                  ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30'
                  : 'border-white/20 bg-white/5'
              }`}>
                👥
              </div>
              <span className="text-xs text-white/50 w-16 text-center truncate">All</span>
            </motion.button>

            {clusters.map((cluster) => (
              <motion.button
                key={cluster.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFaceTap(cluster)}
                onContextMenu={e => { e.preventDefault(); renameFace(cluster.id, cluster.label) }}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                  activeFace === cluster.id
                    ? 'border-purple-500 shadow-lg shadow-purple-500/40 scale-110'
                    : 'border-white/20'
                }`}>
                  {cluster.cover_url ? (
                    <img
                      src={cluster.cover_url}
                      alt={cluster.label}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: 'top center' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/40 to-pink-500/40 flex items-center justify-center text-xl">
                      👤
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/60 w-16 text-center truncate">{cluster.label}</span>
                <span className="text-xs text-white/30">{cluster.media_count}</span>
              </motion.button>
            ))}
          </div>
          {activeFace && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-purple-300/70 px-1">
              Showing {clusters.find(c => c.id === activeFace)?.media_count || 0} photos · long-press face to rename · tap again to clear
            </motion.div>
          )}
        </div>
      ) : hasScanned && clusters.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-2">No faces detected. Photos need visible faces.</p>
      ) : null}
    </div>
  )
}
