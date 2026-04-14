'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import type { Group } from '@/types'
import { GROUP_GRADIENTS } from '@/types'
import { X, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (group: Group) => void
}

const INVITE_EMOJIS = ['🎉', '🔥', '💫', '🌊', '🎭', '🦋', '🌟', '⚡', '🎨', '🫶', '🏖️', '🎪']

export function CreateGroupModal({ open, onClose, onCreated }: Props) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [gradient, setGradient] = useState(GROUP_GRADIENTS[0])
  const [emoji, setEmoji] = useState('🎉')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'invite'>('form')
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null)
  const [copied, setCopied] = useState(false)

  const create = async () => {
    if (!name.trim()) return toast.error('Give your group a name!')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), description: desc.trim(), cover_gradient: gradient, invite_emoji: emoji, created_by: user.id })
      .select()
      .single()

    if (error || !group) {
      toast.error('Could not create group')
      setLoading(false)
      return
    }

    // Add creator as admin
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' })

    setCreatedGroup(group)
    setStep('invite')
    setLoading(false)
  }

  const copyLink = () => {
    if (!createdGroup) return
    const url = `${window.location.origin}/join?code=${createdGroup.invite_code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Invite link copied! 🔗')
    setTimeout(() => setCopied(false), 2000)
  }

  const finish = () => {
    if (createdGroup) onCreated(createdGroup)
    onClose()
    setStep('form')
    setName(''); setDesc(''); setCreatedGroup(null)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full max-w-md glass-strong rounded-4xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{step === 'form' ? '🫂' : '🎉'}</div>
              <h2 className="font-display text-xl font-semibold">
                {step === 'form' ? 'Create a group' : 'Invite your crew!'}
              </h2>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose} className="text-white/30 hover:text-white transition-colors" data-clickable>
              <X size={20} />
            </motion.button>
          </div>

          {step === 'form' ? (
            <div className="p-6 space-y-5">
              {/* Gradient preview + picker */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Pick a vibe</p>
                <div className="h-24 rounded-2xl mb-3 transition-all duration-500 relative overflow-hidden"
                  style={{ background: gradient }}>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">{emoji}</div>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {GROUP_GRADIENTS.map((g, i) => (
                    <motion.button key={i} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setGradient(g)}
                      className={`h-7 rounded-lg transition-all ${gradient === g ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-card' : ''}`}
                      style={{ background: g }} data-clickable />
                  ))}
                </div>
              </div>

              {/* Emoji */}
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Group emoji</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {INVITE_EMOJIS.map(e => (
                    <motion.button key={e} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setEmoji(e)}
                      className={`text-xl py-1.5 rounded-xl transition-all ${emoji === e ? 'bg-memoria-500/30 border border-memoria-400' : 'bg-white/5 hover:bg-white/10'}`}
                      data-clickable>
                      {e}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <input type="text" placeholder="Group name (e.g. Hackathon Crew 🔥)"
                  value={name} onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && create()}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all mb-3" />
                <textarea placeholder="Description (optional)"
                  value={desc} onChange={e => setDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all resize-none" />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={create} disabled={loading || !name.trim()}
                className="w-full py-3.5 rounded-2xl font-semibold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                data-clickable>
                {loading ? 'Creating...' : 'Create group ✨'}
              </motion.button>
            </div>
          ) : (
            <div className="p-6 text-center space-y-5">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: 2 }}
                className="text-6xl">🎉</motion.div>
              <div>
                <h3 className="font-display text-2xl font-bold mb-1">{createdGroup?.name} is ready!</h3>
                <p className="text-white/40 text-sm">Share the invite code or link with your friends</p>
              </div>

              {/* Invite code */}
              <div className="py-4 px-6 rounded-2xl glass border border-white/10">
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Invite code</p>
                <p className="font-mono text-4xl font-bold tracking-[0.3em] gradient-text">
                  {createdGroup?.invite_code}
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={copyLink}
                className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 transition-all border border-white/10"
                data-clickable>
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy invite link'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={finish}
                className="w-full py-3.5 rounded-2xl font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                data-clickable>
                Open group →
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
