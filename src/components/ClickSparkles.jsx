import { useEffect, useState } from 'react'
import { SparkleIcon } from './Butterfly.jsx'

const COLORS = ['var(--grape)', 'var(--bubblegum)', 'var(--butter)', 'var(--babyblue)']
let nextId = 0

// A little sparkle pop wherever a primary action button is tapped — event-
// triggered, not ambient, same rule the rest of the app's sparkle follows.
// One global listener instead of wiring this into every button by hand.
export default function ClickSparkles() {
  const [bursts, setBursts] = useState([])

  useEffect(() => {
    function handleClick(e) {
      const target = e.target.closest('.btn-primary, .login-btn')
      if (!target) return

      const rect = target.getBoundingClientRect()
      const particles = Array.from({ length: 4 }, (_, i) => ({
        id: nextId++,
        top: rect.top + rect.height / 2 + (Math.random() * 30 - 15),
        left: rect.left + rect.width * (0.15 + Math.random() * 0.7),
        size: 10 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 120,
      }))
      setBursts((prev) => [...prev, ...particles])
      setTimeout(() => {
        const ids = new Set(particles.map((p) => p.id))
        setBursts((prev) => prev.filter((p) => !ids.has(p.id)))
      }, 700)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <>
      {bursts.map((p) => (
        <span
          key={p.id}
          className="sparkle-burst"
          style={{ top: p.top, left: p.left, color: p.color, animationDelay: `${p.delay}ms` }}
        >
          <SparkleIcon size={p.size} />
        </span>
      ))}
    </>
  )
}
