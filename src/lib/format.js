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
