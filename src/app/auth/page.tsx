'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ── Admin phone — your number gets auto-admin on signup ──────────────────────
const ADMIN_PHONE_DIGITS = '919729741974' // +91 9729741974
// ─────────────────────────────────────────────────────────────────────────────

const EMOJIS = ['📸', '🎞️', '🌟', '💜', '🎉', '🌈', '✨', '🦋', '🎨', '🌸']
const AVATARS = [
  '🦊', '🐼', '🦁', '🐯', '🦄', '🐸', '🐺', '🦅', '🐬', '🦋',
  '🌸', '🔥', '💎', '🌙', '⚡', '🎨', '🚀', '🍀', '🎭', '👑',
]

type AuthMethod = 'email' | 'phone'
type Step = 'landing' | 'method' | 'email' | 'phone' | 'otp' | 'profile'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('landing')
  const [method, setMethod] = useState<AuthMethod>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  async function sendEmailOTP() {
    if (!email || !email.includes('@')) { setError('Enter a valid email'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setMethod('email'); setStep('otp'); setResendTimer(30)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally { setLoading(false) }
  }

  async function sendPhoneOTP() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { setError('Enter a valid 10-digit number'); return }
    setLoading(true); setError('')
    const fullPhone = `+91${digits.slice(-10)}`
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone })
      if (error) throw error
      setMethod('phone'); setStep('otp'); setResendTimer(30)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'SMS not available — try email instead ✉️')
    } finally { setLoading(false) }
  }

  async function verifyOTP() {
    const code = otp.join('')
    if (code.length !== 6) { setError('Enter all 6 digits'); return }
    setLoading(true); setError('')
    try {
      let result
      if (method === 'email') {
        result = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      } else {
        const fullPhone = `+91${phone.replace(/\D/g, '').slice(-10)}`
        result = await supabase.auth.verifyOtp({ phone: fullPhone, token: code, type: 'sms' })
      }
      if (result.error) throw result.error
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (profile?.display_name) { router.push('/dashboard') } else { setStep('profile') }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid code — try again')
    } finally { setLoading(false) }
  }

  async function saveProfile() {
    if (!displayName.trim()) { setError('Pick a name!'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const phoneDigits = (user.phone || '').replace(/\D/g, '')
      const isAdminUser = phoneDigits === ADMIN_PHONE_DIGITS || phoneDigits.endsWith('9729741974')
      const username = (user.email?.split('@')[0] || `user_${user.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, '_')
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: displayName.trim(),
        avatar_emoji: selectedAvatar,
        is_admin: isAdminUser,
        username,
        vibe_color: '#6558f5',
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setLoading(false) }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 6)
      const newOtp = [...otp]
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
      otpRefs.current[nextIndex]?.focus()
      return
    }
    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]; newOtp[index] = digit; setOtp(newOtp)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    if (digit && index === 5 && newOtp.every(d => d !== '')) setTimeout(verifyOTP, 120)
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const n = [...otp]; n[index] = ''; setOtp(n)
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus()
        const n = [...otp]; n[index - 1] = ''; setOtp(n)
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
      </div>
      {EMOJIS.map((emoji, i) => (
        <div key={i} className="float-emoji select-none pointer-events-none hidden sm:block"
          style={{ left: `${5 + i * 10}%`, top: `${10 + (i % 3) * 30}%`, animationDelay: `${i * 0.8}s`, fontSize: `${1.2 + (i % 3) * 0.4}rem`, opacity: 0.35 }}>
          {emoji}
        </div>
      ))}

      <div className="relative z-10 w-full max-w-sm mx-4">
        <AnimatePresence mode="wait">

          {/* LANDING */}
          {step === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="text-center">
              <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="text-7xl mb-6 inline-block">📸</motion.div>
              <h1 className="font-syne text-5xl font-black gradient-text mb-3">Memoria</h1>
              <p className="text-slate-400 mb-8 text-lg">Your memories, together. Forever.</p>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep('method')} className="btn-primary w-full py-4 text-lg rounded-2xl">
                Let&apos;s go ✨
              </motion.button>
              <p className="text-slate-600 text-sm mt-4">No boring passwords. Just vibes.</p>
            </motion.div>
          )}

          {/* METHOD PICKER */}
          {step === 'method' && (
            <motion.div key="method" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="glass-card p-8">
              <div className="text-4xl mb-4 text-center">👋</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">How do you roll?</h2>
              <p className="text-slate-400 text-center text-sm mb-7">Pick how you want to sign in</p>
              <div className="space-y-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setStep('email')}
                  className="w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all"
                  style={{ background: 'rgba(101,88,245,0.12)', border: '2px solid rgba(101,88,245,0.4)' }}>
                  <span className="text-2xl">✉️</span>
                  <div>
                    <p className="font-semibold text-white">Email OTP</p>
                    <p className="text-xs text-slate-400">Code sent to your inbox — always works ✅</p>
                  </div>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setStep('phone')}
                  className="w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all"
                  style={{ background: 'rgba(236,72,153,0.1)', border: '2px solid rgba(236,72,153,0.3)' }}>
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="font-semibold text-white">Phone SMS</p>
                    <p className="text-xs text-slate-400">Text to your number</p>
                  </div>
                </motion.button>
              </div>
              <button onClick={() => setStep('landing')} className="w-full text-slate-500 text-sm mt-5 hover:text-slate-300 transition-colors">← Back</button>
            </motion.div>
          )}

          {/* EMAIL */}
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="glass-card p-8">
              <div className="text-4xl mb-4 text-center">✉️</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">What&apos;s your email?</h2>
              <p className="text-slate-400 text-center text-sm mb-6">No passwords — we&apos;ll email you a code</p>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendEmailOTP()} className="memoria-input mb-4" autoFocus autoComplete="email" />
              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={sendEmailOTP} disabled={loading} className="btn-primary w-full py-3 rounded-xl">
                {loading ? 'Sending...' : 'Send code 🚀'}
              </motion.button>
              <button onClick={() => setStep('method')} className="w-full text-slate-500 text-sm mt-3 hover:text-slate-300 transition-colors">← Back</button>
            </motion.div>
          )}

          {/* PHONE */}
          {step === 'phone' && (
            <motion.div key="phone" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="glass-card p-8">
              <div className="text-4xl mb-4 text-center">📱</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-2">What&apos;s your number?</h2>
              <p className="text-slate-400 text-center text-sm mb-6">We&apos;ll text you a quick code</p>
              <div className="flex gap-2 mb-4">
                <div className="px-3 py-3 rounded-xl text-slate-400 text-sm whitespace-nowrap flex items-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)' }}>🇮🇳 +91</div>
                <input type="tel" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && sendPhoneOTP()} className="memoria-input flex-1" maxLength={10} autoFocus />
              </div>
              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={sendPhoneOTP} disabled={loading} className="btn-primary w-full py-3 rounded-xl">
                {loading ? 'Sending...' : 'Send code 🚀'}
              </motion.button>
              <button onClick={() => setStep('method')} className="w-full text-slate-500 text-sm mt-3 hover:text-slate-300 transition-colors">← Back</button>
            </motion.div>
          )}

          {/* OTP — iPhone style */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }} className="glass-card p-8">
              <div className="text-center mb-6">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl mb-3">
                  {method === 'email' ? '📬' : '💬'}
                </motion.div>
                <h2 className="font-syne text-2xl font-bold mb-1">{method === 'email' ? 'Check your inbox' : 'Check your texts'}</h2>
                <p className="text-slate-400 text-sm">Code sent to <span className="text-white font-medium">{method === 'email' ? email : `+91 ${phone}`}</span></p>
              </div>

              {/* iPhone OTP boxes */}
              <div className="flex gap-2.5 justify-center mb-5">
                {otp.map((digit, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                    <input
                      ref={el => { otpRefs.current[i] = el }}
                      type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()}
                      className="w-11 h-14 text-center text-2xl font-bold rounded-2xl transition-all duration-150 outline-none"
                      style={{
                        background: digit ? 'rgba(101,88,245,0.22)' : 'rgba(255,255,255,0.05)',
                        border: digit ? '2px solid #6558f5' : '2px solid rgba(255,255,255,0.12)',
                        color: 'white',
                        boxShadow: digit ? '0 0 14px rgba(101,88,245,0.35)' : 'none',
                      }}
                    />
                    {!digit && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ background: 'rgba(101,88,245,0.4)' }} />}
                  </motion.div>
                ))}
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-5">
                {otp.map((d, i) => (
                  <motion.div key={i} animate={{ scale: d ? 1 : 0.6, opacity: d ? 1 : 0.3 }} className="w-1.5 h-1.5 rounded-full" style={{ background: d ? '#6558f5' : 'white' }} />
                ))}
              </div>

              {error && <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-red-400 text-sm mb-4 text-center">{error}</motion.p>}

              <motion.button whileTap={{ scale: 0.97 }} onClick={verifyOTP} disabled={loading || otp.join('').length < 6} className="btn-primary w-full py-3.5 rounded-xl font-semibold" style={{ opacity: otp.join('').length < 6 ? 0.5 : 1 }}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</span> : 'Verify ✓'}
              </motion.button>

              <div className="flex items-center justify-center gap-1 mt-3">
                <span className="text-slate-500 text-sm">Didn&apos;t get it?</span>
                <button onClick={async () => { if (resendTimer > 0) return; setOtp(['', '', '', '', '', '']); setError(''); method === 'email' ? await sendEmailOTP() : await sendPhoneOTP() }} disabled={resendTimer > 0} className="text-sm font-medium transition-colors" style={{ color: resendTimer > 0 ? 'rgba(101,88,245,0.4)' : '#6558f5' }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                </button>
              </div>
              <button onClick={() => { setStep(method === 'email' ? 'email' : 'phone'); setOtp(['', '', '', '', '', '']) }} className="w-full text-slate-500 text-sm mt-2 hover:text-slate-300 transition-colors">
                ← Change {method === 'email' ? 'email' : 'number'}
              </button>
            </motion.div>
          )}

          {/* PROFILE SETUP */}
          {step === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="glass-card p-8">
              <div className="text-4xl mb-4 text-center">🎨</div>
              <h2 className="font-syne text-2xl font-bold text-center mb-1">Make it yours</h2>
              <p className="text-slate-400 text-center text-sm mb-5">Pick your vibe avatar &amp; name</p>

              <div className="flex justify-center mb-4">
                <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: 'rgba(101,88,245,0.2)', border: '2px solid rgba(101,88,245,0.5)' }}>
                  {selectedAvatar}
                </motion.div>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-5">
                {AVATARS.map(avatar => (
                  <motion.button key={avatar} whileTap={{ scale: 0.85 }} onClick={() => setSelectedAvatar(avatar)} className="text-2xl py-2 rounded-xl transition-all"
                    style={{ background: selectedAvatar === avatar ? 'rgba(101,88,245,0.3)' : 'rgba(255,255,255,0.05)', border: selectedAvatar === avatar ? '2px solid #6558f5' : '2px solid transparent' }}>
                    {avatar}
                  </motion.button>
                ))}
              </div>

              <input type="text" placeholder="Your name (e.g. Vibhor 🔥)" value={displayName} onChange={e => setDisplayName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveProfile()} className="memoria-input mb-4" maxLength={30} autoFocus />
              {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={saveProfile} disabled={loading} className="btn-primary w-full py-3 rounded-xl">
                {loading ? 'Saving...' : 'Enter Memoria 🚀'}
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
