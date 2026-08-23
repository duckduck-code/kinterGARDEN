import { LevelIcon } from './Butterfly.jsx'
import { LEVEL_MAP } from '../lib/constants'
import { formatShortDate } from '../lib/format'

const ROW_ORDER = ['secure', 'developing', 'emerging'] // top to bottom

// R3.4.2 — the growth strip, the app's signature view. A student's year as a
// flight path: each leveled observation sits on a row that matches its
// level (Secure on top, Emerging on the bottom) so height on the strip
// always means the same thing — no earlier version of this used a
// decorative arc for vertical position, which could put a butterfly lower
// on the page than an earlier caterpillar and read backwards. X position is
// still chronological order, evenly spaced so same-week notes never pile up.
export default function GrowthStrip({ observations, schoolYear, className = '' }) {
  const leveled = observations
    .filter((o) => o.level)
    .slice()
    .sort((a, b) => new Date(a.observed_on) - new Date(b.observed_on))

  if (!schoolYear) return null

  const height = 100
  const rowY = { secure: 18, developing: 50, emerging: 82 }
  const gutter = 28
  const edgePad = 18
  const spacing = 50
  const chartWidth = Math.max(150, edgePad * 2 + Math.max(leveled.length - 1, 0) * spacing)
  const width = gutter + chartWidth

  function xFor(i) {
    return leveled.length > 1 ? gutter + edgePad + i * spacing : gutter + chartWidth / 2
  }

  const points = leveled.map((obs, i) => ({ obs, x: xFor(i), y: rowY[obs.level] }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className={`report-growth-strip ${className}`} style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} style={{ display: 'block' }} role="img" aria-label="Growth strip: level over time">
        {/* row legend + guides */}
        {ROW_ORDER.map((levelValue) => (
          <g key={levelValue}>
            <line x1={gutter} y1={rowY[levelValue]} x2={width - 4} y2={rowY[levelValue]} stroke="var(--chrome)" strokeWidth="1" strokeDasharray="1 6" />
            <foreignObject x="0" y={rowY[levelValue] - 9} width="20" height="18">
              <div style={{ color: 'var(--ink-soft)', opacity: 0.7, display: 'flex', alignItems: 'center' }} title={LEVEL_MAP[levelValue].label}>
                <LevelIcon level={levelValue} size={15} />
              </div>
            </foreignObject>
          </g>
        ))}

        {leveled.length === 0 && (
          <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize="12" fill="var(--ink-soft)">
            No leveled observations yet
          </text>
        )}

        {points.length > 1 && <path d={linePath} fill="none" stroke="var(--grape)" strokeWidth="1.5" opacity="0.5" />}

        {points.map(({ obs, x, y }, i) => (
          <g key={obs.id} transform={`translate(${x}, ${y})`}>
            <circle r="11" fill="var(--white)" stroke={i === points.length - 1 ? 'var(--grape)' : 'var(--chrome)'} strokeWidth="2" />
            <foreignObject x="-9" y="-9" width="18" height="18">
              <div style={{ color: 'var(--grape-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={`${LEVEL_MAP[obs.level]?.label ?? ''} — ${obs.observed_on}`}>
                <LevelIcon level={obs.level} size={15} />
              </div>
            </foreignObject>
            <text y="24" textAnchor="middle" fontSize="9" fill="var(--ink-soft)" fontFamily="var(--font-utility)">
              {formatShortDate(obs.observed_on)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
