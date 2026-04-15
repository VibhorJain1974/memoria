'use client'
/**
 * FaceGrouping — client-side face detection via face-api.js loaded from CDN.
 * No npm install needed — loads the library dynamically at runtime.
 * Shows Instagram-style face bubble row; tap to filter photos by person.
 */
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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

// Dynamically loads face-api.js from CDN — avoids any npm install
async function loadFaceApi(): Promise<typeof window.faceapi | null> {
  if (typeof window === 'undefined') return null
  if ((window as unknown as Record<string, unknown>).faceapi) {
    return (window as unknown as Record<string, unknown>).faceapi as typeof window.faceapi
  }
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js'
    script.onload = () => resolve((window as unknown as Record<string, unknown>).faceapi as typeof window.faceapi)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

export function FaceGrouping({ media, groupId, albumId, onFilterChange }: Props) {
  const [clusters, setClusters]         = useState<FaceCluster[]>([])
  const [activeFace, setActiveFace]     = useState<string | null>(null)
  const [scanning, setScanning]         = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [hasScanned, setHasScanned]     = useState(false)
  const supabase = createClient()

  useEffect(() => { loadClusters() }, [albumId])

  async function loadClusters() {
    const { data } = await supabase
      .from('face_clusters')
      .select('*')
      .eq('group_id', groupId)
      .order('media_count', { ascending: false })
    if (!data || data.length === 0) return

    const enriched: FaceCluster[] = data.map(c => {
      const coverMedia = media.find(m => m.id === c.cover_media_id)
      return {
        id: c.id,
        label: c.label || 'Person',
        cover_url: coverMedia?.storage_path || '',
        media_ids: [],
        media_count: c.media_count || 0,
      }
    })
    const { data: faces } = await supabase
      .from('media_faces')
      .select('media_id, cluster_id')
      .in('cluster_id', data.map(c => c.id))
    if (faces) {
      faces.forEach(f => {
        const cl = enriched.find(c => c.id === f.cluster_id)
        if (cl && !cl.media_ids.includes(f.media_id)) cl.media_ids.push(f.media_id)
      })
    }
    setClusters(enriched.filter(c => c.media_count > 0))
    setHasScanned(true)
  }

  async function scanFaces() {
    if (scanning) return
    setScanning(true); setScanProgress(5)

    const faceapi = await loadFaceApi()
    if (!faceapi) { alert('Could not load face detection library. Check your internet connection.'); setScanning(false); return }

    const MODEL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL),
      ])
    } catch { alert('Could not load face models. Try again.'); setScanning(false); return }

    setScanProgress(20)
    const photoMedia = media.filter(m => m.media_type !== 'video').slice(0, 40)
    const allItems: { mediaId: string; descriptor: number[]; imgUrl: string }[] = []

    for (let i = 0; i < photoMedia.length; i++) {
      const m = photoMedia[i]
      setScanProgress(20 + Math.round((i / photoMedia.length) * 55))
      try {
        const img = new Image(); img.crossOrigin = 'anonymous'
        await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); img.src = m.storage_path; setTimeout(res, 4000) })
        const dets = await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptors()
        for (const d of dets) allItems.push({ mediaId: m.id, descriptor: Array.from(d.descriptor), imgUrl: m.storage_path })
      } catch { /* skip */ }
    }

    setScanProgress(80)
    if (allItems.length === 0) { alert('No faces found! Make sure photos have visible faces.'); setScanning(false); setScanProgress(0); return }

    // Cluster by euclidean distance
    const THRESH = 0.55
    const groups: { descs: number[][]; mediaIds: string[]; coverUrl: string }[] = []
    for (const item of allItems) {
      let matched = false
      for (const g of groups) {
        const minDist = Math.min(...g.descs.map(d => Math.sqrt(d.reduce((s, v, k) => s + (v - item.descriptor[k]) ** 2, 0))))
        if (minDist < THRESH) { g.descs.push(item.descriptor); if (!g.mediaIds.includes(item.mediaId)) g.mediaIds.push(item.mediaId); matched = true; break }
      }
      if (!matched) groups.push({ descs: [item.descriptor], mediaIds: [item.mediaId], coverUrl: item.imgUrl })
    }
    setScanProgress(90)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setScanning(false); return }
    const significant = groups.filter(g => g.mediaIds.length >= 1)
    const newClusters: FaceCluster[] = []
    for (let i = 0; i < significant.length; i++) {
      const g = significant[i]
      const coverMediaId = media.find(m => m.id === g.mediaIds[0])?.id || null
      const { data: dbC } = await supabase.from('face_clusters').insert({ group_id: groupId, label: `Person ${i + 1}`, cover_media_id: coverMediaId, media_count: g.mediaIds.length }).select().single()
      if (dbC) {
        await supabase.from('media_faces').insert(g.mediaIds.map(mid => ({ media_id: mid, cluster_id: dbC.id })))
        newClusters.push({ id: dbC.id, label: dbC.label || `Person ${i + 1}`, cover_url: g.coverUrl, media_ids: g.mediaIds, media_count: g.mediaIds.length })
      }
    }
    setScanProgress(100); setClusters(newClusters); setHasScanned(true); setScanning(false)
  }

  function tap(cluster: FaceCluster) {
    if (activeFace === cluster.id) { setActiveFace(null); onFilterChange(null) }
    else { setActiveFace(cluster.id); onFilterChange(cluster.media_ids) }
  }

  async function rename(clusterId: string, cur: string) {
    const next = prompt('Rename:', cur)
    if (!next || next === cur) return
    await supabase.from('face_clusters').update({ label: next }).eq('id', clusterId)
    setClusters(p => p.map(c => c.id === clusterId ? { ...c, label: next } : c))
  }

  const photos = media.filter(m => m.media_type !== 'video')
  if (photos.length === 0) return null

  return (
    <div className="mb-3">
      {clusters.length === 0 && !hasScanned ? (
        <button onClick={scanFaces} disabled={scanning}
          className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-white/20 text-sm text-white/40 hover:text-white/60 hover:border-white/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          {scanning ? (
            <><div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"/>
            <span>Detecting faces... {scanProgress}%</span>
            <div className="flex-1 max-w-20 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}/></div></>
          ) : <><span>👤</span><span>Group photos by face</span></>}
        </button>
      ) : clusters.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-white/30 uppercase tracking-widest">People</span>
            <button onClick={() => { setActiveFace(null); onFilterChange(null); setClusters([]); setHasScanned(false) }} className="text-xs text-white/20 hover:text-white/50 transition-colors">rescan</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => { setActiveFace(null); onFilterChange(null) }} className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl border-2 transition-all ${!activeFace ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30' : 'border-white/20 bg-white/5'}`}>👥</div>
              <span className="text-xs text-white/40">All</span>
            </button>
            {clusters.map(c => (
              <button key={c.id} onClick={() => tap(c)} onContextMenu={e => { e.preventDefault(); rename(c.id, c.label) }}
                className="flex-shrink-0 flex flex-col items-center gap-1 transition-transform active:scale-95">
                <div className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${activeFace === c.id ? 'border-purple-500 shadow-lg shadow-purple-500/40 scale-110' : 'border-white/20'}`}>
                  {c.cover_url ? <img src={c.cover_url} alt={c.label} className="w-full h-full object-cover" style={{ objectPosition: 'top' }}/> : <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xl">👤</div>}
                </div>
                <span className="text-xs text-white/50 w-14 text-center truncate">{c.label}</span>
                <span className="text-xs text-white/25">{c.media_count}</span>
              </button>
            ))}
          </div>
          {activeFace && <p className="text-xs text-purple-300/60 px-1">Showing {clusters.find(c => c.id === activeFace)?.media_count || 0} photos · long-press to rename · tap again to clear</p>}
        </div>
      ) : hasScanned ? (
        <p className="text-xs text-white/25 text-center py-2">No faces detected in these photos.</p>
      ) : null}
    </div>
  )
}
