'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import type { Group, Profile, Flashback } from '@/types'
import { GroupCard } from '@/components/group/GroupCard'
import { CreateGroupModal } from '@/components/group/CreateGroupModal'
import { Plus, Sparkles, Clock } from 'lucide-react'
import { formatRelative } from '@/lib/utils'

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [groups, setGroups] = useState<Group[]>([])
    const [flashbacks, setFlashbacks] = useState<Flashback[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [{ data: prof }, { data: memberGroups }, { data: fb }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('group_members').select('group_id').eq('user_id', user.id),
                supabase.from('flashbacks').select('*').eq('user_id', user.id)
                    .eq('is_seen', false).order('created_at', { ascending: false }).limit(3),
            ])

            setProfile(prof)
            setFlashbacks(fb || [])

            if (memberGroups?.length) {
                const groupIds = memberGroups.map(m => m.group_id)
                const { data: g } = await supabase.from('groups').select('*').in('id', groupIds)
                setGroups(g || [])
            }
            setLoading(false)
        }
        load()
    }, [])

    const GREETINGS = ['Hey', 'Sup', 'Yo', 'Heyy', 'Helloooo']
    const greeting = GREETINGS[Math.floor(Date.now() / 86400000) % GREETINGS.length]

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                {profile ? (
                    <>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl">{profile.avatar_emoji}</span>
                            <h1 className="font-display text-3xl font-bold">
                                {greeting},{' '}
                                <span className="gradient-text">{profile.display_name || profile.username}</span>
                            </h1>
                        </div>
                        <p className="text-white/30 text-sm ml-11">Your memories are waiting ✨</p>
                    </>
                ) : (
                    <div className="h-10 w-64 shimmer rounded-2xl" />
                )}
            </motion.div>

            {/* Flashbacks banner */}
            {flashbacks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-5 rounded-3xl border border-aurora-amber/20 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(244,114,182,0.1))' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="text-2xl animate-bounce-in">✨</div>
                        <div>
                            <p className="font-semibold text-aurora-amber">You have {flashbacks.length} new flashback{flashbacks.length > 1 ? 's' : ''}!</p>
                            <p className="text-white/40 text-sm">Memories from a month ago are ready 🎞️</p>
                        </div>
                        <button
                            onClick={() => router.push('/flashbacks')}
                            className="ml-auto px-4 py-2 rounded-xl text-sm font-medium bg-aurora-amber/20 text-aurora-amber hover:bg-aurora-amber/30 transition-all"
                            data-clickable
                        >
                            View →
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Groups */}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                    <Users size={18} className="text-memoria-400" />
                    Your groups
                </h2>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                    data-clickable
                >
                    <Plus size={15} />
                    New group
                </motion.button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 shimmer rounded-3xl" />
                    ))}
                </div>
            ) : groups.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20 glass rounded-3xl border border-white/5"
                >
                    <div className="text-5xl mb-4">🫂</div>
                    <h3 className="font-display text-xl font-semibold mb-2">No groups yet</h3>
                    <p className="text-white/30 text-sm mb-6">Create one and invite your crew!</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setShowCreate(true)}
                        className="px-6 py-3 rounded-2xl font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                        data-clickable
                    >
                        Create first group ✨
                    </motion.button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group, i) => (
                        <GroupCard key={group.id} group={group} index={i} />
                    ))}
                    <motion.button
                        whileHover={{ scale: 1.02, borderColor: 'rgba(101,88,245,0.4)' }}
                        onClick={() => setShowCreate(true)}
                        className="h-48 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-white/30 hover:text-white/60 transition-all"
                        data-clickable
                    >
                        <Plus size={28} />
                        <span className="text-sm font-medium">New group</span>
                    </motion.button>
                </div>
            )}

            <CreateGroupModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onCreated={(g) => {
                    setGroups(prev => [g, ...prev])
                    router.push(`/groups/${g.id}`)
                }}
            />
        </div>
    )
}

function Users({ size, className }: { size: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}