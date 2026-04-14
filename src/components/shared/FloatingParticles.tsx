'use client'
import { useEffect, useRef } from 'react'

const PARTICLES = [
  { emoji: '📸', size: 28, x: 8, y: 15, duration: 7, delay: 0 },
  { emoji: '✨', size: 20, x: 90, y: 20, duration: 6, delay: 1 },
  { emoji: '🎞️', size: 24, x: 75, y: 70, duration: 8, delay: 2 },
  { emoji: '💫', size: 22, x: 15, y: 75, duration: 6, delay: 0.5 },
  { emoji: '🌟', size: 18, x: 50, y: 10, duration: 9, delay: 3 },
  { emoji: '🎨', size: 26, x: 92, y: 50, duration: 7, delay: 1.5 },
  { emoji: '🫶', size: 22, x: 5, y: 45, duration: 8, delay: 2.5 },
  { emoji: '🎉', size: 20, x: 60