'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Album } from '@/types'
import { formatDate } from '@/lib/utils'
import { MapPin, Camera } from 'lucide-react'

interface Props {
  album: Album
  groupId: string
  index: number
}

export function AlbumCard({ album, groupId, index }: Props) {
  const router = useRouter()
  const coverStyle = album.cover_url
    ? { backgroundImage: `url(${album.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `linear-gradient(135deg, hsl(${(index * 47) % 360}, 70%, 40%), hsl(${(index * 47 + 60) % 360}, 80%, 50%))` }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={() => router.push(`/groups/${groupId}/albums/${album.id}`)}
      className="relative h-44 rounded-3xl overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
      style={coverStyle}
      data-clickable
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="text-2xl drop-shadow-lg">{album.emoji}</span>
        {album.event_date && (
          <span className="pill bg-black/30 backdrop-blur-sm text-white/80 border border-white/10 text-xs">
            {formatDate(album.event_date)}
          </span>
        )}
      </div>

      {/* Memory count */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/30 backdrop-blur-sm text-white/70 text-xs border border-white/10">
          <Camera size={11} />
          {album.total_memories}
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display font-bold text-base text-white leading-tight mb-0.5">{album.name}</h3>
        {album.location && (
          <div className="flex items-center gap-1 text-white/50 text-xs">
            <MapPin size={10} />
            {album.location}
          </div>
        )}
      </div>
    </motion.div>
  )
}
