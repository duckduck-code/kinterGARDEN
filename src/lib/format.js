// Short, human date formatting shared by the growth strip and reports —
// full ISO dates (2026-08-16) read as noise in a summary; "Aug 16" doesn't.

const SHORT = { month: 'short', day: 'numeric', timeZone: 'UTC' }
const SHORT_WITH_YEAR = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }

export function formatShortDate(isoDate, { withYear = false } = {}) {
  if (!isoDate) return ''
  const d = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('en-US', withYear ? SHORT_WITH_YEAR : SHORT)
}

// The data model has no explicit "term" on an observation — terms are just
// the school year split into three even chunks by date, matching how the
// growth strip and term-summary fields already think about the year.
export function getTermDateRange(schoolYear, term) {
  if (!schoolYear) return null
  const start = new Date(schoolYear.start_date).getTime()
  const end = new Date(schoolYear.end_date).getTime()
  const third = (end - start) / 3
  const bounds = {
    fall: [start, start + third],
    winter: [start + third, start + third * 2],
    spring: [start + third * 2, end],
  }[term]
  if (!bounds) return null
  return bounds.map((t) => new Date(t).toISOString().slice(0, 10))
}
