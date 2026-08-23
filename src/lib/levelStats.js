// A single "current level" reading per student — used on the student profile,
// the class grid sort, and the report summary. Never a grade, just a rough
// "where do they land right now" computed from recent leveled notes.

export const LEVEL_VALUES = { emerging: 1, developing: 2, secure: 3 }
const VALUE_TO_LEVEL = { 1: 'emerging', 2: 'developing', 3: 'secure' }

export const ROLLING_WINDOW_DAYS = 30

function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

// Prefers leveled notes from the last ROLLING_WINDOW_DAYS; falls back to all
// leveled notes ever if there's nothing that recent, so a quiet week doesn't
// just blank the reading out.
export function getCurrentLevel(observations) {
  const leveled = observations.filter((o) => o.level)
  if (leveled.length === 0) return null

  const since = daysAgoISO(ROLLING_WINDOW_DAYS)
  const recent = leveled.filter((o) => o.observed_on >= since)
  const pool = recent.length > 0 ? recent : leveled

  const avg = pool.reduce((sum, o) => sum + LEVEL_VALUES[o.level], 0) / pool.length
  const rounded = Math.min(3, Math.max(1, Math.round(avg)))

  return {
    average: avg,
    level: VALUE_TO_LEVEL[rounded],
    count: pool.length,
    isRecent: recent.length > 0,
  }
}
