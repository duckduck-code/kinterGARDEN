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

// Which of the new note's domains are hitting Secure for the very first
// time for this student — checked against every other leveled note on
// record, not just chronologically-prior ones, so editing an older note
// still reads correctly. Worth celebrating; returns [] most of the time.
export function getFirstTimeSecureDomains(existingObservations, newObservation) {
  if (newObservation.level !== 'secure') return []
  const newDomainIds = newObservation.domainIds ?? []
  if (newDomainIds.length === 0) return []

  const priorSecureDomains = new Set()
  for (const o of existingObservations) {
    if (o.id && newObservation.id && o.id === newObservation.id) continue
    if (o.level !== 'secure') continue
    for (const d of o.domainIds ?? []) priorSecureDomains.add(d)
  }

  return newDomainIds.filter((d) => !priorSecureDomains.has(d))
}

// For every (student, domain) pair, the earliest date it was ever observed
// as Secure. Lets a digest ask "how many first-time Secures landed in this
// date range" without replaying the celebration logic note-by-note.
export function getFirstSecureDatesByStudentDomain(observations) {
  const first = new Map()
  for (const o of observations) {
    if (o.level !== 'secure') continue
    for (const d of o.domainIds ?? []) {
      const key = `${o.student_id}:${d}`
      const existing = first.get(key)
      if (!existing || o.observed_on < existing) first.set(key, o.observed_on)
    }
  }
  return first
}
