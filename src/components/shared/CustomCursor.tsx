'use client'
import { useEffect, useRef } from 'react'

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mouseX = 0, mouseY = 0
    let ringX = 0, ringY = 0
    let animId: number

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`
    }

    const animate = () => {
      ringX += (mouseX - ringX - 16) * 0.15
      ringY += (mouseY - ringY - 16) * 0.15
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`
      animId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    animId = requestAnimationFrame(animate)

    const onEnterClickable = () => {
      ring.style.width = '48px'
      ring.style.height = '48px'
      ring.style.borderColor = 'rgba(236,72,153,0.8)'
      ring.style.marginLeft = '-8px'
      ring.style.marginTop = '-8px'
    }
    const onLeaveClickable = () => {
      ring.style.width = '32px'
      ring.style.height = '32px'
      ring.style.borderColor = 'rgba(101,88,245,0.6)'
      ring.style.marginLeft = '0'
      ring.style.marginTop = '0'
    }

    const clickables = document.querySelectorAll('a, button, [data-clickable]')
    clickables.forEach(el => {
      el.addEventListener('mouseenter', onEnterClickable)
      el.addEventListener('mouseleave', onLeaveClickable)
    })

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  )
}
