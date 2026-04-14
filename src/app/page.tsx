'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'

const FEATURES = [
  { emoji: '📸', title: 'Full quality, always', desc: 'No WhatsApp compression. Ever. Your 108MP shots stay 108MP.' },
  { emoji: '✨', title: 'Live Photos, alive', desc: 'iPhone Live Photos play as they should — not frozen stills.' },
  { emoji: '👆', title: 'Slide to select', desc: 'Run your finger across the grid. Select 50 pics in 2 seconds.' },
  { emoji: '🧠', title: 'Face search', desc: 'Find every photo of a specific person across all albums instantly.' },
  { emoji: '🚫', title: 'Selective sharing', desc: 'Drama in the group? One tap to hide specific pics from specific people.' },
  { emoji: '🎞️', title: 'Monthly flashbacks', desc: 'Auto-generated collages of your best moments every month.' },
  { emoji: '🔍', title: 'Duplicate detection', desc: 'Everyone uploads the same pic? We catch it so your album stays clean.' },
  { emoji: '🎨', title: 'Vibe tags', desc: 'Tag albums with "chaotic", "core memory", "slay" — the way you actually talk.' },
]

const FLOATING_EMOJIS = ['📸', '✨', '🎉', '💫', '🌟', '🔥', '💜', '🫶', '🎞️', '🌈']

export default function LandingPage() {
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0])

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="min-h-screen bg-dark-base overflow-x-hidden">
      {/* HERO */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 aurora-bg"
      >
        {/* Background glow blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 transition-transform duration-300"
            style={{
              background: '#6558f5',
              left: `${mousePos.x * 0.03}px`,
              top: `${mousePos.y * 0.03}px`,
            }}
          />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: '#ec4899' }} />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-15"
            style={{ background: '#22d3ee' }} />
        </div>

        {/* Floating emoji decorations */}
        {FLOATING_EMOJIS.map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            style={{
              left: `${5 + (i * 9.5) % 90}%`,
              top: `${10 + (i * 13) % 80}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [-5, 5, -5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            {emoji}
          </motion.div>
        ))}

        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-memoria-500 to-aurora-pink flex items-center justify-center text-sm">
              📸
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Memoria</span>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => router.push('/auth')}
            className="px-5 py-2 rounded-full glass border border-white/10 text-sm font-medium hover:bg-white/10 transition-all"
            data-clickable
          >
            Sign in
          </motion.button>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm text-white/60 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-aurora-cyan animate-pulse" />
              Your friend group&apos;s private photo universe
            </div>

            <h1 className="font-display text-7xl md:text-9xl font-bold mb-6 leading-none tracking-tight">
              <span className="gradient-text">Memo</span>
              <span className="text-white">ria</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              One place for <span className="text-white/80">all your pics</span>, from every phone,
              at <span className="text-white/80">full quality</span>. No drama, no compression, no chaos.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push('/auth')}
                className="group relative px-10 py-4 rounded-2xl font-semibold text-lg overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
                data-clickable
              >
                <span className="relative z-10">Start a memory →</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-10 py-4 rounded-2xl font-medium text-lg glass border border-white/10 hover:border-white/20 transition-all"
                data-clickable
              >
                See features
              </motion.button>
            </div>
          </motion.div>

          {/* Fake phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative mx-auto w-72"
          >
            <div className="relative rounded-4xl overflow-hidden glass border border-white/15 shadow-card p-3"
              style={{ background: 'rgba(22,22,31,0.8)' }}>
              {/* Fake status bar */}
              <div className="flex justify-between items-center px-3 py-1 text-xs text-white/40 mb-2">
                <span>9:41</span>
                <span>Memoria</span>
                <span>⚡</span>
              </div>
              {/* Fake album grid */}
              <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                {[
                  { bg: 'from-purple-500 to-pink-500', emoji: '🎉' },
                  { bg: 'from-cyan-400 to-blue-500', emoji: '🏖️' },
                  { bg: 'from-orange-400 to-pink-500', emoji: '🍕' },
                  { bg: 'from-green-400 to-teal-500', emoji: '⛺' },
                  { bg: 'from-pink-500 to-violet-500', emoji: '💃' },
                  { bg: 'from-yellow-400 to-orange-500', emoji: '🎮' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, delay: i * 0.4, repeat: Infinity }}
                    className={`aspect-square bg-gradient-to-br ${item.bg} flex items-center justify-center text-2xl rounded-lg`}
                  >
                    {item.emoji}
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 px-2 pb-2">
                <div className="h-2 rounded-full bg-white/10 mb-1.5 w-3/4" />
                <div className="h-2 rounded-full bg-white/10 w-1/2" />
              </div>
            </div>
            {/* Glow under phone */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-12 blur-2xl rounded-full opacity-40"
              style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }} />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 text-xs"
        >
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
        </motion.div>
      </motion.section>

      {/* FEATURES */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-20"
          >
            <h2 className="font-display text-5xl md:text-6xl font-bold mb-4">
              Built for <span className="gradient-text-2">your group</span>
            </h2>
            <p className="text-white/40 text-lg">Everything your friend group actually needs.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-all cursor-default"
              >
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-display font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10"
            style={{ background: 'radial-gradient(circle, #6558f5, #ec4899)' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <div className="text-6xl mb-6">🫶</div>
          <h2 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your memories deserve<br />
            <span className="gradient-text">better than WhatsApp.</span>
          </h2>
          <p className="text-white/40 text-lg mb-10">Create your group in 30 seconds. Invite your crew. Start uploading.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/auth')}
            className="px-12 py-5 rounded-2xl font-bold text-xl text-white shadow-glow-purple transition-all"
            style={{ background: 'linear-gradient(135deg, #6558f5, #ec4899)' }}
            data-clickable
          >
            Create your Memoria ✨
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-white/20 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span>📸</span>
          <span className="font-display font-semibold text-white/40">Memoria</span>
        </div>
        <p>Made with 🫶 for friend groups everywhere</p>
      </footer>
    </div>
  )
}
