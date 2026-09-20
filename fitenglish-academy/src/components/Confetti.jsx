import { useEffect, useRef } from 'react'

const COLOURS = ['#FF6B35', '#00B894', '#2D3436', '#FFB088', '#55DBBF']

/**
 * Canvas confetti burst. Mounted for a moment after a correct streak or a
 * finished exercise, then unmounted by the parent.
 */
export default function Confetti({ pieces = 120, duration = 2000, onDone }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone?.()
      return undefined
    }

    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: pieces }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 11,
      vy: 2 + Math.random() * 3.4,
      vx: -1.4 + Math.random() * 2.8,
      angle: Math.random() * Math.PI * 2,
      spin: -0.18 + Math.random() * 0.36,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }))

    let raf
    const started = performance.now()
    const frame = (now) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.028
        p.angle += p.spin
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.colour
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      if (now - started < duration) {
        raf = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDone?.()
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [pieces, duration, onDone])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden="true" />
}
