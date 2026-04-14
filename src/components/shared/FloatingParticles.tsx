'use client'
import { useEffect, useRef } from 'react'

const PARTICLES = [
  { emoji: '📸', size: 24, x: 10, y: 15, duration: 6, delay: 0 },
  { emoji: '✨', size: 18, x: 25, y: 70, duration: 8, delay: 0.5 },
  { emoji: '🌟', size: 20, x: 80, y: 20, duration: 7, delay: 1 },
  { emoji: '🎉', size: 22, x: 65, y: 80, duration: 9, delay: 0.3 },
  { emoji: '🫶', size: 18, x: 45, y: 10, duration: 7, delay: 1.5 },
  { emoji: '🔥', size: 20, x: 90, y: 60, duration: 6, delay: 0.8 },
  { emoji: '💫', size: 16, x: 15, y: 85, duration: 8, delay: 2 },
  { emoji: '🎨', size: 22, x: 55, y: 40, duration: 7, delay: 1.2 },
  { emoji: '🌈', size: 18, x: 35, y: 55, duration: 9, delay: 0.6 },
  { emoji: '💎', size: 16, x: 75, y: 45, duration: 6, delay: 1.8 },
  { emoji: '🎭', size: 20, x: 5, y: 50, duration: 8, delay: 0.4 },
  { emoji: '⚡', size: 18, x: 95, y: 30, duration: 7, delay: 2.2 },
]

export function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            opacity: 0.25,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  )
}
