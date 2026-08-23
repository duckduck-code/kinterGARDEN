// Flat line-art SVG motifs for the metamorphosis metaphor (docs/requirements.md
// §5, "Signature element"). SVG rather than raster so they scale, print, and
// stay tiny. `currentColor` drives fill so callers can theme via CSS `color`,
// or pass `gradient` for a holographic fill (decorative/login use).

import { useId } from 'react'

export function Butterfly({ size = 28, className, style, gradient = false }) {
  const gid = useId()
  const wingFill = gradient ? `url(#${gid}-wing)` : 'currentColor'

  return (
    <svg viewBox="0 0 124 124" width={size} height={size} className={className} style={style} aria-hidden="true">
      {gradient && (
        <defs>
          <linearGradient id={`${gid}-wing`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--grape)" />
            <stop offset="55%" stopColor="var(--bubblegum)" />
            <stop offset="100%" stopColor="var(--babyblue)" />
          </linearGradient>
        </defs>
      )}

      {/* lower wings */}
      <path d="M62,58 C85,65 100,85 90,102 C82,116 65,100 62,78 Z" fill={wingFill} opacity="0.85" />
      <path d="M62,58 C39,65 24,85 34,102 C42,116 59,100 62,78 Z" fill={wingFill} opacity="0.85" />

      {/* upper wings */}
      <path d="M62,48 C90,18 118,22 112,50 C108,72 82,70 62,60 Z" fill={wingFill} />
      <path d="M62,48 C34,18 6,22 12,50 C16,72 42,70 62,60 Z" fill={wingFill} />

      {/* wing spots */}
      <circle cx="88" cy="42" r="4" fill="var(--cloud, #fff)" opacity="0.6" />
      <circle cx="36" cy="42" r="4" fill="var(--cloud, #fff)" opacity="0.6" />

      {/* antennae */}
      <path d="M66,32 C74,20 82,10 88,5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M58,32 C50,20 42,10 36,5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="5" r="2.5" fill="currentColor" />
      <circle cx="36" cy="5" r="2.5" fill="currentColor" />

      {/* body */}
      <path
        d="M62,26 C69,26 70,42 68,58 C67,74 66,90 62,98 C58,90 57,74 56,58 C54,42 55,26 62,26 Z"
        fill="currentColor"
      />
      <circle cx="62" cy="27" r="6.5" fill="currentColor" />
    </svg>
  )
}

export function CaterpillarIcon({ size = 22, className }) {
  return (
    <svg viewBox="0 0 32 20" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="5" cy="14" r="4" fill="currentColor" />
      <circle cx="12" cy="10" r="4.3" fill="currentColor" />
      <circle cx="20" cy="14" r="4.3" fill="currentColor" />
      <circle cx="27" cy="10" r="3.6" fill="currentColor" />
      <circle cx="4" cy="12" r="0.9" fill="var(--cloud, #fff)" />
      <path d="M26 6c1-1.5 2.5-1.5 3-0.3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function ChrysalisIcon({ size = 22, className }) {
  return (
    <svg viewBox="0 0 20 28" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M10 1c4 3 6 8 6 13s-2 10-6 13c-4-3-6-8-6-13S6 4 10 1Z"
        fill="currentColor"
      />
      <path d="M6.5 9h7M6 14h8M6.5 19h7" stroke="var(--cloud, #fff)" strokeWidth="0.9" opacity="0.6" />
    </svg>
  )
}

export function SparkleIcon({ size = 20, className, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d="M12 0c.6 4.8 2.2 8.4 5 11.2 2.8 2.8 6.4 4.4 11.2 5-4.8.6-8.4 2.2-11.2 5-2.8 2.8-4.4 6.4-5 11.2-.6-4.8-2.2-8.4-5-11.2C4.2 18.4.6 16.8 0 16.2c4.8-.6 8.4-2.2 11.2-5 2.8-2.8 4.4-6.4 5-11.2Z" />
    </svg>
  )
}

export function LevelIcon({ level, size = 22, className }) {
  if (level === 'emerging') return <CaterpillarIcon size={size} className={className} />
  if (level === 'developing') return <ChrysalisIcon size={size} className={className} />
  if (level === 'secure') return <Butterfly size={size} className={className} />
  return null
}

export default Butterfly
