'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Group } from '@/types'
import { Users, Image } from 'lucide-react'

interface Props {
    group: Group
    index: number
}

export function GroupCard({ group, index }: Props) {
    const router = useRouter()

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6, scale: 1.02 }}
            onClick={() => router.push(`/groups/${group.id}`)}
            className="relative h-48 rounded-3xl overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover transition-shadow"
            data-clickable
        >
            {/* Gradient background */}
            <div className="absolute inset-0" style={{ background: group.cover_gradient }} />

            {/* Noise overlay */}
            <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E\")" }} />

            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Invite code badge */}
            <div className="absolute top-3 right-3">
                <div className="px-2.5 py-1 rounded-xl bg-black/30 backdrop-blur-sm text-xs font-mono font-bold text-white/80 border border-white/10">
                    {group.invite_code}
                </div>
            </div>

            {/* Emoji */}
            <div className="absolute top-4 left-4 text-3xl">
                {group.invite_emoji}
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-display font-bold text-lg text-white leading-tight mb-1">
                    {group.name}
                </h3>
                {group.description && (
                    <p className="text-white/60 text-xs truncate">{group.description}</p>
                )}
            </div>
        </motion.div>
    )
}