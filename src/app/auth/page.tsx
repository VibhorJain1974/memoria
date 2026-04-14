'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const EMOJIS = ['📸', '🎞️', '🌟', '💜', '🎉', '🌈', '✨', '🦋', '🎨', '🌸']

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🦄', '🐸', '🐺', '🦅', '🐬', '🦋']

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'landing' | 'phone' | 'otp' | 'profile'>('landing')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function sendOTP() {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone}`,
      })
      if (error) throw error
      setStep('otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP() {
    const code = otp.join('')
    if (code.length !== 6) {
      setError('Enter the 6-digit code')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+91${phone}`,
        token: code,
        type: 'sms',
      })
      if (error) throw error
      setStep('profile')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    if (!displayName.trim()) {
      setError('Pick a name!')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName.trim(),
        avatar_emoji: selectedAvatar,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#0a0a0f' }}>

      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>

      {/* Floating emojis */}
      {EMOJIS.map((emoji, i) => (
        <div
          key={i}
          className="float-emoji select-none pointer-events-none"
          style={{
            left: `${5 + (i * 10)}%`,
            top: `${10 + (i % 3) * 30}%`,
            animationDelay: `${i * 0.8}s`,
            fontSize: `${1.2 + (i % 3) * 0.4}rem`,
            opacity: 0.4,
          }}
        >
          {emoji}
        </div>
      ))}

      <div className="relative z-10 w-full max-w-sm mx-4">
        <AnimatePresence mode="wait">

          {/* STEP: LANDING */}
          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="text-7xl mb-6">📸</div>
              <h1 className="font-syne text-4xl font-black gradient-text mb-3">Memoria</h1>
              <p className="text-slate-400 mb-8 text-lg">Your memories, together. Forever.</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep('phone')}
                className="btn-primary w-full py-4 text-lg rounded-2xl"
              >
                Let&apos;s go ✨
              </motion.button>
              <p className="text-slate-600 text-sm mt-4">No passwords. Just your phone.</p>
            </motion.div>
          )}

          {/* STEP: PHONE */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="glass-card p-8"
            >
              <div className="text-4xl mb-4 text-center">📱</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">What&apos;s your number?</h2>
              <p className="text-slate-400 text-center text-sm mb-6">We&apos;ll text you a quick code</p>

              <div className="flex gap-2 mb-4">
                <div className="glass-card px-3 py-3 text-slate-400 text-sm rounded-xl whitespace-nowrap">
                  🇮🇳 +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  className="memoria-input flex-1"
                  maxLength={10}
                  autoFocus
                />
              </div>

              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={sendOTP}
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl"
              >
                {loading ? 'Sending...' : 'Send code 🚀'}
              </motion.button>

              <button onClick={() => setStep('landing')}
                className="w-full text-slate-500 text-sm mt-3 hover:text-slate-300 transition-colors">
                ← Back
              </button>
            </motion.div>
          )}

          {/* STEP: OTP */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="glass-card p-8"
            >
              <div className="text-4xl mb-4 text-center">🔐</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">Check your texts</h2>
              <p className="text-slate-400 text-center text-sm mb-6">
                Sent to {phone.startsWith('+') ? phone : `+91 ${phone}`}
              </p>

              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: digit ? '2px solid #6558f5' : '2px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                ))}
              </div>

              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={verifyOTP}
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl"
              >
                {loading ? 'Verifying...' : 'Verify ✓'}
              </motion.button>

              <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }}
                className="w-full text-slate-500 text-sm mt-3 hover:text-slate-300 transition-colors">
                ← Resend code
              </button>
            </motion.div>
          )}

          {/* STEP: PROFILE */}
          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="glass-card p-8"
            >
              <div className="text-4xl mb-4 text-center">🎨</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">Make it yours</h2>
              <p className="text-slate-400 text-center text-sm mb-6">Pick your vibe</p>

              {/* Avatar picker */}
              <div className="grid grid-cols-5 gap-2 mb-5">
                {AVATARS.map(avatar => (
                  <motion.button
                    key={avatar}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedAvatar(avatar)}
                    className="text-2xl p-2 rounded-xl transition-all"
                    style={{
                      background: selectedAvatar === avatar
                        ? 'rgba(101,88,245,0.3)'
                        : 'rgba(255,255,255,0.05)',
                      border: selectedAvatar === avatar
                        ? '2px solid #6558f5'
                        : '2px solid transparent',
                    }}
                  >
                    {avatar}
                  </motion.button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Your name (e.g. Vibhor 🔥)"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveProfile()}
                className="memoria-input mb-4"
                maxLength={30}
                autoFocus
              />

              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={saveProfile}
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl"
              >
                {loading ? 'Saving...' : 'Enter Memoria 🚀'}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}