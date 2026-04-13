'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const EMOJI_AVATARS = ['🌟', '🦋', '🌸', '🎭', '🦄', '🌊', '🎪', '🔮', '🌙', '⚡', '🎨', '🦁']
const VIBES = [
    'where memories live ✨',
    'your private photo universe 🌌',
    'no compression, no drama 🫶',
    'full quality, always 📸',
    'for the friend group era 🎉',
]

type Step = 'landing' | 'email' | 'otp' | 'profile'

export default function AuthPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [step, setStep] = useState<Step>('landing')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [loading, setLoading] = useState(false)
    const [vibeIdx, setVibeIdx] = useState(0)
    const [selectedEmoji, setSelectedEmoji] = useState('🌟')
    const [username, setUsername] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [inviteCode] = useState(searchParams.get('invite') || '')

    useEffect(() => {
        const interval = setInterval(() => setVibeIdx(v => (v + 1) % VIBES.length), 2800)
        return () => clearInterval(interval)
    }, [])

    // Check existing session
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.push('/dashboard')
        })
    }, [])

    const sendOTP = async () => {
        if (!email.trim()) return toast.error('Enter your email ✉️')
        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
        if (error) {
            toast.error(error.message)
        } else {
            toast.success('Code sent to your email! 🎉')
            setStep('otp')
        }
        setLoading(false)
    }

    const verifyOTP = async () => {
        const token = otp.join('')
        if (token.length < 6) return toast.error('Enter the full 6-digit code')
        setLoading(true)
        const { data, error } = await supabase.auth.verifyOtp({
            email, token, type: 'email'
        })
        if (error) {
            toast.error('Wrong code! Try again 😬')
            setOtp(['', '', '', '', '', ''])
        } else if (data.session) {
            // Check if profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', data.session.user.id)
                .single()
            if (profile?.username) {
                if (inviteCode) {
                    router.push(`/join?code=${inviteCode}`)
                } else {
                    router.push('/dashboard')
                }
            } else {
                setStep('profile')
            }
        }
        setLoading(false)
    }

    const saveProfile = async () => {
        if (!username.trim()) return toast.error('Choose a username!')
        if (username.length < 3) return toast.error('Username too short')
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            username: username.toLowerCase().replace(/\s+/g, '_'),
            display_name: displayName || username,
            avatar_emoji: selectedEmoji,
        })
        if (error) {
            if (error.message.includes('unique')) {
                toast.error('Username taken! Try another one 😅')
            } else {
                toast.error(error.message)
            }
        } else {
            toast.success('Welcome to Memoria! 🎉')
            if (inviteCode) {
                router.push(`/join?code=${inviteCode}`)
            } else {
                router.push('/dashboard')
            }
        }
        setLoading(false)
    }

    const handleOtpKey = (i: number, val: string, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !val && i > 0) {
            document.getElementById(`otp-${i - 1}`)?.focus()
        }
    }

    const handleOtpChange = (i: number, val: string) => {
        const digits = val.replace(/\D/g, '')
        if (!digits) {
            const next = [...otp]; next[i] = ''; setOtp(next); return
        }
        // Paste support
        if (digits.length === 6) {
            setOtp(digits.split(''))
            document.getElementById('otp-5')?.focus()
            return
        }
        const next = [...otp]
        next[i] = digits[0]
        setOtp(next)
        if (i < 5) document.getElementById(`otp-${i + 1}`)?.focus()
    }

    return (
        <div className="min-h-screen bg-dark-base flex items-center justify-center p-4 aurora-bg relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
                style={{ background: '#6558f5' }} />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-12 pointer-events-none"
                style={{ background: '#ec4899' }} />

            <div className="w-full max-w-sm relative z-10">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="text-5xl mb-3">📸</div>
                    <h1 className="font-display text-3xl font-bold">Memoria</h1>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={vibeIdx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="text-white/40 text-sm mt-1"
                        >
                            {VIBES[vibeIdx]}
                        </motion.p>
                    </AnimatePresence>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* STEP: EMAIL */}
                    {step === 'landing' || step === 'email' ? (
                        <motion.div
                            key="email"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass rounded-3xl p-7 border border-white/10"
                        >
                            <h2 className="font-display text-xl font-semibold mb-1">Enter the portal 🚪</h2>
                            <p className="text-white/40 text-sm mb-6">We&apos;ll text you a magic code. No passwords. Ever.</p>

                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendOTP()}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 focus:border-memoria-500 focus:bg-white/8 transition-all mb-4"
                                autoComplete="email"
                            />

                            {inviteCode && (
                                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-memoria-500/10 border border-memoria-500/20">
                                    <span className="text-lg">🎉</span>
                                    <span className="text-sm text-memoria-300">Joining with invite code: <strong>{inviteCode}</strong></span>
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={sendOTP}
                                disabled={loading}
                                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                                data-clickable
                            >
                                {loading ? '✨ Sending...' : 'Send me the code ✨'}
                            </motion.button>

                            <p className="text-center text-white/25 text-xs mt-4">
                                No account needed — just enter your email
                            </p>
                        </motion.div>
                    ) : step === 'otp' ? (
                        /* STEP: OTP */
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass rounded-3xl p-7 border border-white/10"
                        >
                            <button onClick={() => setStep('landing')} className="text-white/30 text-sm mb-4 flex items-center gap-1 hover:text-white/60 transition-colors" data-clickable>
                                ← back
                            </button>
                            <div className="text-3xl mb-3">📬</div>
                            <h2 className="font-display text-xl font-semibold mb-1">Check your inbox</h2>
                            <p className="text-white/40 text-sm mb-6">Enter the 6-digit code we sent to <strong className="text-white/60">{email}</strong></p>

                            <div className="flex gap-2 justify-center mb-6">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKey(i, digit, e)}
                                        className="w-11 h-13 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl focus:border-memoria-500 focus:bg-white/8 transition-all text-white"
                                        style={{ height: '52px' }}
                                    />
                                ))}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={verifyOTP}
                                disabled={loading || otp.join('').length < 6}
                                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                                data-clickable
                            >
                                {loading ? 'Verifying...' : "Let me in 🚀"}
                            </motion.button>

                            <button onClick={sendOTP} className="w-full text-center text-white/30 text-xs mt-4 hover:text-white/60 transition-colors" data-clickable>
                                Resend code
                            </button>
                        </motion.div>
                    ) : (
                        /* STEP: PROFILE SETUP */
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass rounded-3xl p-7 border border-white/10"
                        >
                            <div className="text-3xl mb-3">🎨</div>
                            <h2 className="font-display text-xl font-semibold mb-1">Make it yours</h2>
                            <p className="text-white/40 text-sm mb-6">Quick setup — you&apos;re almost in!</p>

                            {/* Emoji picker */}
                            <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">Pick your vibe</p>
                            <div className="grid grid-cols-6 gap-2 mb-5">
                                {EMOJI_AVATARS.map(emoji => (
                                    <motion.button
                                        key={emoji}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setSelectedEmoji(emoji)}
                                        className={`text-2xl py-2 rounded-xl transition-all ${selectedEmoji === emoji
                                                ? 'bg-memoria-500/30 border border-memoria-400'
                                                : 'bg-white/5 border border-transparent hover:bg-white/10'
                                            }`}
                                        data-clickable
                                    >
                                        {emoji}
                                    </motion.button>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Display name (e.g. Priya)"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all mb-3"
                            />
                            <div className="relative mb-5">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                                <input
                                    type="text"
                                    placeholder="username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && saveProfile()}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-white placeholder-white/30 focus:border-memoria-500 transition-all"
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={saveProfile}
                                disabled={loading || !username.trim()}
                                className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                                data-clickable
                            >
                                {loading ? 'Setting up...' : `Enter Memoria ${selectedEmoji}`}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}