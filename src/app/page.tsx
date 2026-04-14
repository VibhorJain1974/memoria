'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'

const FEATURES = [
  { emoji: '📸', title: 'Full quality, always',   desc: 'No WhatsApp compression. Ever. Your 108MP shots stay 108MP.' },
  { emoji: '✨', title: 'Live Photos, alive',      desc: 'iPhone Live Photos play as they should — not frozen stills.' },
  { emoji: '👆', title: 'Slide to select',         desc: 'Run your finger across the grid. Select 50 pics in 2 seconds.' },
  { emoji: '🧠', title: 'Face search',             desc: 'Find every photo of a specific person across all albums instantly.' },
  { emoji: '🚫', title: 'Selective sharing',       desc: 'Drama in the group? One tap to hide specific pics from specific people.' },
  { emoji: '🎞️', title: 'Monthly flashbacks',     desc: 'Auto-generated collages of your best moments every month.' },
  { emoji: '🔍', title: 'Duplicate detection',     desc: 'Everyone uploads the same pic? We catch it so your album stays clean.' },
  { emoji: '🎨', title: 'Vibe tags',               desc: 'Tag albums with "chaotic", "core memory", "slay" — the way you actually talk.' },
]

const FLOATING = ['📸','✨','🎉','💫','🌟','🔥','💜','🫶','🎞️','🌈']

const MOCKUP_ITEMS = [
  { bg: 'from-purple-500 to-pink-500',   emoji: '🎉' },
  { bg: 'from-cyan-400 to-blue-500',     emoji: '🏖️' },
  { bg: 'from-orange-400 to-pink-500',   emoji: '🍕' },
  { bg: 'from-green-400 to-teal-500',    emoji: '⛺' },
  { bg: 'from-pink-500 to-violet-500',   emoji: '💃' },
  { bg: 'from-yellow-400 to-orange-500', emoji: '🎮' },
]

export default function LandingPage() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const { scrollYProgress } = useScroll()
  const heroY       = useTransform(scrollYProgress, [0, 0.3], [0, -60])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="min-h-screen bg-dark-base overflow-x-hidden">

      {/* ── NAV ────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4"
        style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg,#6558f5,#ec4899)' }}>📸</div>
          <span className="font-display font-bold text-lg sm:text-xl">Memoria</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push('/auth')}
          className="px-4 py-2 rounded-full text-sm font-medium glass border"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          Sign in
        </motion.button>
      </nav>

      {/* ── HERO ───────────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-screen flex flex-col items-center justify-center aurora-bg pt-20 pb-10 px-4"
      >
        {/* Mouse-tracking glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-64 sm:w-96 h-64 sm:h-96 rounded-full blur-3xl opacity-20 transition-transform duration-500"
            style={{ background: '#6558f5', left: mouse.x * 0.03, top: mouse.y * 0.03 }} />
          <div className="absolute top-1/3 right-0 w-56 sm:w-80 h-56 sm:h-80 rounded-full blur-3xl opacity-10"
            style={{ background: '#ec4899' }} />
          <div className="absolute bottom-1/4 left-1/3 w-48 sm:w-64 h-48 sm:h-64 rounded-full blur-3xl opacity-10"
            style={{ background: '#22d3ee' }} />
        </div>

        {/* Floating emojis — hidden on very small screens */}
        <div className="hidden sm:block">
          {FLOATING.map((e, i) => (
            <motion.div key={i}
              className="absolute text-xl select-none pointer-events-none"
              style={{ left: `${5 + (i*9.5)%88}%`, top: `${12+(i*13)%76}%` }}
              animate={{ y:[0,-14,0], rotate:[-4,4,-4], scale:[1,1.08,1] }}
              transition={{ duration: 4+i*0.5, repeat: Infinity, delay: i*0.3 }}
            >{e}</motion.div>
          ))}
        </div>

        {/* Hero copy */}
        <div className="relative z-10 text-center w-full max-w-4xl mx-auto">
          <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.8, ease:[0.16,1,0.3,1] }}>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border text-xs sm:text-sm mb-6 sm:mb-8"
              style={{ borderColor:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Your friend group&apos;s private photo universe
            </div>

            {/* Responsive heading — clamp so it never overflows */}
            <h1 className="font-display font-black leading-none tracking-tight mb-4 sm:mb-6"
              style={{ fontSize: 'clamp(3.5rem, 15vw, 9rem)' }}>
              <span className="gradient-text">Memo</span>
              <span className="text-white">ria</span>
            </h1>

            <p className="text-white/50 leading-relaxed font-light mb-8 sm:mb-12 mx-auto"
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', maxWidth: '600px' }}>
              One place for <span className="text-white/80">all your pics</span>, from every phone,
              at <span className="text-white/80">full quality</span>.{' '}
              No drama, no compression, no chaos.
            </p>

            {/* CTA buttons — stack on mobile, row on sm+ */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                onClick={() => router.push('/auth')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg text-white"
                style={{ background:'linear-gradient(135deg,#6558f5,#ec4899)' }}>
                ✨ Start a memory →
              </motion.button>
              <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-medium text-base sm:text-lg glass border"
                style={{ borderColor:'rgba(255,255,255,0.12)' }}>
                👀 See features
              </motion.button>
            </div>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            initial={{ opacity:0, y:60, scale:0.9 }}
            animate={{ opacity:1, y:0, scale:1 }}
            transition={{ delay:0.5, duration:1, ease:[0.16,1,0.3,1] }}
            className="mt-12 sm:mt-20 relative mx-auto"
            style={{ width: 'min(280px, 75vw)' }}
          >
            <div className="rounded-3xl overflow-hidden glass border p-3"
              style={{ background:'rgba(22,22,31,0.85)', borderColor:'rgba(255,255,255,0.15)' }}>
              <div className="flex justify-between items-center px-2 py-1 text-xs mb-2"
                style={{ color:'rgba(255,255,255,0.35)' }}>
                <span>9:41</span><span>Memoria</span><span>⚡</span>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                {MOCKUP_ITEMS.map((item,i) => (
                  <motion.div key={i}
                    animate={{ scale:[1,1.02,1] }}
                    transition={{ duration:3, delay:i*0.4, repeat:Infinity }}
                    className={`aspect-square bg-gradient-to-br ${item.bg} flex items-center justify-center rounded-lg`}
                    style={{ fontSize:'clamp(1.2rem,4vw,1.8rem)' }}>
                    {item.emoji}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 px-2 pb-2 space-y-1.5">
                <div className="h-1.5 rounded-full w-3/4" style={{ background:'rgba(255,255,255,0.1)' }} />
                <div className="h-1.5 rounded-full w-1/2"  style={{ background:'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-10 blur-2xl rounded-full opacity-40"
              style={{ background:'linear-gradient(135deg,#6558f5,#ec4899)' }} />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div animate={{ y:[0,8,0] }} transition={{ duration:2, repeat:Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-xs"
          style={{ color:'rgba(255,255,255,0.25)' }}>
          <span>scroll</span>
          <div className="w-px h-6" style={{ background:'linear-gradient(to bottom, rgba(255,255,255,0.25), transparent)' }} />
        </motion.div>
      </motion.section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }} transition={{ duration:0.7 }}
            className="text-center mb-10 sm:mb-16">
            <h2 className="font-display font-bold mb-3 leading-tight"
              style={{ fontSize:'clamp(2rem,6vw,4rem)' }}>
              Built for <span className="gradient-text-2">your group</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'clamp(0.9rem,2vw,1.1rem)' }}>
              Everything your friend group actually needs.
            </p>
          </motion.div>

          {/* Responsive grid: 1 col → 2 col → 4 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {FEATURES.map((f,i) => (
              <motion.div key={i}
                initial={{ opacity:0, y:25 }} whileInView={{ opacity:1, y:0 }}
                viewport={{ once:true }} transition={{ duration:0.5, delay:i*0.06 }}
                whileHover={{ y:-5, scale:1.02 }}
                className="glass rounded-3xl p-5 sm:p-6 border cursor-default"
                style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                <div className="mb-3" style={{ fontSize:'clamp(1.5rem,4vw,2rem)' }}>{f.emoji}</div>
                <h3 className="font-display font-semibold mb-2 text-sm sm:text-base">{f.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color:'rgba(255,255,255,0.4)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-10"
            style={{ width:'min(600px,80vw)', height:'min(600px,80vw)', background:'radial-gradient(circle,#6558f5,#ec4899)' }} />
        </div>
        <motion.div initial={{ opacity:0, scale:0.92 }} whileInView={{ opacity:1, scale:1 }}
          viewport={{ once:true }} transition={{ duration:0.8 }}
          className="relative z-10 max-w-2xl mx-auto">
          <div className="mb-5" style={{ fontSize:'clamp(2.5rem,8vw,4rem)' }}>🫶</div>
          <h2 className="font-display font-bold mb-5 leading-tight"
            style={{ fontSize:'clamp(1.8rem,5vw,3.5rem)' }}>
            Your memories deserve<br />
            <span className="gradient-text">better than WhatsApp.</span>
          </h2>
          <p className="mb-8 sm:mb-10" style={{ color:'rgba(255,255,255,0.4)', fontSize:'clamp(0.9rem,2vw,1.1rem)' }}>
            Create your group in 30 seconds. Invite your crew. Start uploading.
          </p>
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.97 }}
            onClick={() => router.push('/auth')}
            className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold text-lg sm:text-xl text-white shadow-glow-purple"
            style={{ background:'linear-gradient(135deg,#6558f5,#ec4899)' }}>
            Create your Memoria ✨
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="border-t py-6 px-4 text-center text-xs sm:text-sm"
        style={{ borderColor:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.2)' }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span>📸</span>
          <span className="font-display font-semibold" style={{ color:'rgba(255,255,255,0.35)' }}>Memoria</span>
        </div>
        <p>Made with 🫶 for friend groups everywhere</p>
      </footer>
    </div>
  )
}
