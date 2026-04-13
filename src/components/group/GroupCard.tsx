'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import type { Group, Album, GroupMember, Profile } from '@/types'
import { AlbumCard } from '@/components/album/AlbumCard'
import { CreateAlbumModal } from '@/components/album/CreateAlbumModal'
import { GroupSettings } from '@/components/group/GroupSettings'
import { Plus, Settings, Copy, Check, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GroupPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const supabase = createClient()

    const [group, setGroup] = useState<Group | null>(null)
    const [albums, setAlbums] = useState<Album[]>([])
    const [members, setMembers] = useState<GroupMember[]>([])
    const [currentUser, setCurrentUser] = useState<Profile | null>(null)
    const [showCreateAlbum, setShowCreateAlbum] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [{ data: g }, { data: a }, { data: m }, { data: prof }] = await Promise.all([
                supabase.from('groups').select('*').eq('id', id).single(),
                supabase.from('albums').select('*').eq('group_id', id).order('created_at', { ascending: false }),
                supabase.from('group_members').select('*, profile:profiles(*)').eq('group_id', id),
                supabase.from('profiles').select('*').eq('id', user.id).single(),
            ])

            setGroup(g)
            setAlbums(a || [])
            setMembers(m || [])
            setCurrentUser(prof)
            setLoading(false)
        }
        load()
    }, [id])

    const copyInvite = () => {
        if (!group) return
        navigator.clipboard.writeText(`${window.location.origin}/join?code=${group.invite_code}`)
        setCopied(true)
        toast.success('Invite link copied! 🔗')
        setTimeout(() => setCopied(false), 2000)
    }

    const isAdmin = members.find(m => (m.profile as any)?.id === currentUser?.id)?.role === 'admin'
        || currentUser?.is_admin

    if (loading) return (
        <div className="p-8">
            <div className="h-40 shimmer rounded-3xl mb-6" />
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-40 shimmer rounded-3xl" />)}
            </div>
        </div>
    )

    if (!group) return (
        <div className="p-8 text-center text-white/40">Group not found</div>
    )

    return (
        <div className="min-h-screen">
            {/* Hero banner */}
            <div className="relative h-52 overflow-hidden" style={{ background: group.cover_gradient }}>
                <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.3'/%3E%3C/svg%3E\")" }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-dark-base" />

                {/* Actions in banner */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={copyInvite}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-sm font-medium text-white"
                        data-clickable>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : `Invite • ${group.invite_code}`}
                    </motion.button>
                    {isAdmin && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSettings(true)}
                            className="p-2 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 text-white"
                            data-clickable>
                            <Settings size={16} />
                        </motion.button>
                    )}
                </div>

                {/* Group info */}
                <div className="absolute bottom-4 left-6">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl drop-shadow-lg">{group.invite_emoji}</span>
                        <div>
                            <h1 className="font-display text-3xl font-bold text-white drop-shadow-lg">{group.name}</h1>
                            {group.description && (
                                <p className="text-white/70 text-sm">{group.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Members strip */}
            <div className="px-6 py-3 flex items-center gap-3 border-b border-white/5">
                <div className="flex -space-x-2">
                    {members.slice(0, 8).map((m, i) => (
                        <div key={m.id}
                            className="w-7 h-7 rounded-full glass border border-white/20 flex items-center justify-center text-sm"
                            style={{ zIndex: 8 - i }}>
                            {(m.profile as any)?.avatar_emoji || '👤'}
                        </div>
                    ))}
                </div>
                <span className="text-white/40 text-sm">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                <span className="text-white/20">·</span>
                <span className="text-white/40 text-sm">{albums.length} album{albums.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Albums */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-xl font-semibold">Albums</h2>
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCreateAlbum(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium text-white"
                        style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                        data-clickable>
                        <Plus size={15} />
                        New album
                    </motion.button>
                </div>

                {albums.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-20 glass rounded-3xl border border-white/5">
                        <div className="text-5xl mb-4">📁</div>
                        <h3 className="font-display text-xl font-semibold mb-2">No albums yet</h3>
                        <p className="text-white/30 text-sm mb-6">Create one for your first memory!</p>
                        <button onClick={() => setShowCreateAlbum(true)}
                            className="px-6 py-3 rounded-2xl font-semibold text-white"
                            style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                            data-clickable>
                            Create album 📸
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {albums.map((album, i) => (
                            <AlbumCard key={album.id} album={album} groupId={id} index={i} />
                        ))}
                    </div>
                )}
            </div>

            <CreateAlbumModal
                open={showCreateAlbum}
                groupId={id}
                onClose={() => setShowCreateAlbum(false)}
                onCreated={(a) => setAlbums(prev => [a, ...prev])}
            />

            {showSettings && group && (
                <GroupSettings
                    group={group}
                    members={members}
                    currentUser={currentUser!}
                    onClose={() => setShowSettings(false)}
                    onUpdated={(g) => setGroup(g)}
                />
            )}
        </div>
    )
}