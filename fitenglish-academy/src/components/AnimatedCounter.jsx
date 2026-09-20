import { useEffect, useRef, useState } from 'react'

/**
 * Counts up from 0 to `value` once the element is on screen.
 * Used by the footer statistics and the progress dashboard.
 */
export default function AnimatedCounter({ value = 0, duration = 1100, decimals = 0, className }) {
  const [display, setDisplay] = useState(0)
  const nodeRef = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return undefined

    const run = () => {
      const start = performance.now()
      const from = 0
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - (1 - t) ** 3
        setDisplay(from + (value - from) * eased)
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    // Replay whenever the target changes, but only once it has been seen.
    if (started.current) {
      run()
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          run()
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={nodeRef} className={className}>
      {display.toFixed(decimals)}
    </span>
  )
}
