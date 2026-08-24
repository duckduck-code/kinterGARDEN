import { Fragment, useEffect, useRef, useState } from 'react'
import { SparkleIcon } from './Butterfly.jsx'

// R3.1.5 — brief confirmation, no modal to dismiss. Sparkle is event-triggered
// (on save), never ambient (docs/requirements.md §5): a handful of sparkle
// particles pop around the toast and disappear, nothing loops.
const BURST_PARTICLES = [
  { dx: -70, dy: -18, size: 14, color: 'var(--butter)', delay: 0 },
  { dx: -30, dy: -34, size: 10, color: 'var(--babyblue)', delay: 60 },
  { dx: 10, dy: -30, size: 16, color: 'var(--bubblegum)', delay: 30 },
  { dx: 55, dy: -20, size: 12, color: 'var(--grape)', delay: 90 },
  { dx: 80, dy: -2, size: 10, color: 'var(--butter)', delay: 120 },
]

// A bigger burst for a first-time-Secure celebration — still one-shot on
// event, never ambient, just more of it since the moment earns it.
const CELEBRATE_PARTICLES = [
  { dx: -95, dy: -22, size: 16, color: 'var(--butter)', delay: 0 },
  { dx: -60, dy: -48, size: 12, color: 'var(--babyblue)', delay: 40 },
  { dx: -22, dy: -58, size: 18, color: 'var(--bubblegum)', delay: 20 },
  { dx: 15, dy: -54, size: 14, color: 'var(--grape)', delay: 90 },
  { dx: 52, dy: -46, size: 16, color: 'var(--butter)', delay: 60 },
  { dx: 88, dy: -24, size: 12, color: 'var(--bubblegum)', delay: 120 },
  { dx: 100, dy: 2, size: 14, color: 'var(--grape)', delay: 150 },
]

export function useToast() {
  const [message, setMessage] = useState(null)
  const [burstKey, setBurstKey] = useState(0)
  const [celebrate, setCelebrate] = useState(false)
  const timeoutRef = useRef(null)

  function showToast(text, { celebrate: isCelebration = false } = {}) {
    setMessage(text)
    setCelebrate(isCelebration)
    setBurstKey((k) => k + 1)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setMessage(null), isCelebration ? 3200 : 1800)
  }

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const particles = celebrate ? CELEBRATE_PARTICLES : BURST_PARTICLES

  const node = message ? (
    <Fragment>
      <div className={celebrate ? 'toast toast--celebrate' : 'toast'} role="status">
        {message}
      </div>
      {particles.map((p, i) => (
        <span
          key={`${burstKey}-${i}`}
          className="sparkle-burst"
          style={{
            left: `calc(50% + ${p.dx}px)`,
            bottom: `calc(var(--space-5) + 28px + ${-p.dy}px)`,
            color: p.color,
            animationDelay: `${p.delay}ms`,
          }}
        >
          <SparkleIcon size={p.size} />
        </span>
      ))}
    </Fragment>
  ) : null

  return [node, showToast]
}
