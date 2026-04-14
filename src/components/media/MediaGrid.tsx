'use client'
import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Media } from '@/types'
import { getMediaUrl, getThumbnailUrl } from '@/lib/supabase'
import { Check, Play, Zap, Heart } from 'lucide-react'
import Image from 'next/image'

interface Props {
  media: Media[]
  selectMode: boolean
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onMediaClick: (m: Media) => void
}

export function MediaGrid({ media, selectMode, selectedIds, onSelectionChange, onMediaClick }: Props) {
  const isSliding = useRef(false)
  const slideStartId = useRef<string | null>(null)
  const slideAdding = useRef(true)

  // Slide-select: pointer events for iPhone-like sweep selection
  const onPointerDown = useCallback((e: React.PointerEvent, mediaId: string) => {
    if (!selectMode) return
    isSliding.current = true
    slideStartId.current = mediaId
    const newSet = new Set(selectedIds)
    if (newSet.has(mediaId)) {
      newSet.delete(mediaId)
      slideAdding.current = false
    } else {
      newSet.add(mediaId)
      slideAdding.current = true
    }
    onSelectionChange(newSet)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [selectMode, selectedIds, onSelectionChange])

  const onPointerEnter = useCallback((mediaId: string) => {
    if (!isSliding.current || !selectMode) return
    const newSet = new Set(selectedIds)
    if (slideAdding.current) {
      newSet.add(mediaId)
    } else {
      newSet.delete(mediaId)
    }
    onSelectionChange(newSet)
  }, [selectMode, selectedIds, onSelectionChange])

  const onPointerUp = useCallback(() => {
    isSliding.current = false
    slideStartId.current = null
  }, [])

  // Masonry-ish layout: vary sizes
  const getSpan = (i: number) => {
    if (i % 11 === 0) return 'col-span-2 row-span-2'
    if (i % 7 === 0) return 'row-span-2'
    return ''
  }

  return (
    <div
      className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 auto-rows-[160px]"
      onPointerUp={onPointerUp}
      style={{ userSelect: 'none' }}
    >
      {media.map((m, i) => {
        const isSelected = selectedIds.has(m.id)
        const isLive = m.media_type === 'live_photo'
        const isVideo = m.media_type === 'video'
        const thumbUrl = m.thumbnail_path
          ? getThumbnailUrl(m.thumbnail_path)
          : m.storage_path
            ? getThumbnailUrl(m.storage_path)
            : null

        return (
          <motion.div
            key={m.id}
            className={`media-item ${getSpan(i)} ${isSelected ? 'selected' : ''} relative rounded-2xl overflow-hidden bg-dark-card`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            onPointerDown={e => onPointerDown(e, m.id)}
            onPointerEnter={() => onPointerEnter(m.id)}
            onClick={() => !isSliding.current && onMediaClick(m)}
            style={{ touchAction: selectMode ? 'none' : 'auto' }}
          >
            {/* Image */}
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={m.caption || ''}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                📸
              </div>
            )}

            {/* Overlay */}
            <div className="overlay" />

            {/* Live badge */}
            {isLive && (
              <div className="absolute top-2 left-2">
                <span className="live-badge flex items-center gap-1">
                  <Zap size={8} /> LIVE
                </span>
              </div>
            )}

            {/* Video indicator */}
            {isVideo && (
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/50 text-white text-xs">
                  <Play size={9} fill="white" />
                  {m.duration_seconds ? `${Math.round(m.duration_seconds)}s` : ''}
                </div>
              </div>
            )}

            {/* Favorite */}
            {m.is_favorite && (
              <div className="absolute top-2 right-2">
                <Heart size={14} fill="#f472b6" className="text-aurora-pink drop-shadow-lg" />
              </div>
            )}

            {/* Select checkbox */}
            {selectMode && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-memoria-500 border-memoria-500'
                    : 'bg-black/30 border-white/60'
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </motion.div>
            )}

            {/* Bottom: uploader */}
            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 hover:opacity-100 transition-opacity">
              {m.uploader && (
                <div className="flex items-center gap-1">
                  <span className="text-xs">{(m.uploader as any).avatar_emoji}</span>
                  <span className="text-white/70 text-xs truncate">{(m.uploader as any).display_name || (m.uploader as any).username}</span>
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
