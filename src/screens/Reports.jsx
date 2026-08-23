import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { LEVELS, LEVEL_MAP, TERMS } from '../lib/constants'
import { formatShortDate, getTermDateRange } from '../lib/format'
import GrowthStrip from '../components/GrowthStrip.jsx'
import '../styles/print.css'

const UNGROUPED = '__no_unit__'

// R3.6 — reports & printing. Screen side lets the teacher choose which
// students and which notes go in; print side (print.css) strips all
// decoration so the output looks like it came from the district office.
export default function Reports() {
  const [schoolYear, setSchoolYear] = useState(null)
  const [students, setStudents] = useState([])
  const [domains, setDomains] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('students') // 'students' | 'progress'
  const [includeGrowthStrip, setIncludeGrowthStrip] = useState(false)
  const [includeSummaryTerms, setIncludeSummaryTerms] = useState({ fall: false, winter: false, spring: false })

  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [obsByStudent, setObsByStudent] = useState({})
  const [selectedObsByStudent, setSelectedObsByStudent] = useState({})
  const [summariesByStudent, setSummariesByStudent] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [domainFilter, setDomainFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')

  const [yearObservations, setYearObservations] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const year = await api.getCurrentSchoolYear()
      if (!year) {
        setLoading(false)
        return
      }
      const [studentList, domainList, unitList] = await Promise.all([
        api.listStudents(year.id),
        api.listDomains({ includeHidden: false }),
        api.listUnits(),
      ])
      setSchoolYear(year)
      setStudents(studentList)
      setDomains(domainList)
      setUnits(unitList)
      setSelectedStudentIds(new Set(studentList.map((s) => s.id)))
      setLoading(false)
    }
    load()
  }, [])

  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])

  useEffect(() => {
    async function loadDetail() {
      const missing = [...selectedStudentIds].filter((id) => !(id in obsByStudent))
      if (missing.length === 0) return
      setLoadingDetail(true)
      const entries = await Promise.all(
        missing.map(async (id) => {
          const [obs, summaries] = await Promise.all([api.listObservationsForStudent(id), api.listSummariesForStudent(id)])
          return [id, obs, summaries]
        })
      )
      setObsByStudent((prev) => {
        const next = { ...prev }
        for (const [id, obs] of entries) next[id] = obs
        return next
      })
      setSelectedObsByStudent((prev) => {
        const next = { ...prev }
        for (const [id, obs] of entries) next[id] = new Set(obs.map((o) => o.id))
        return next
      })
      setSummariesByStudent((prev) => {
        const next = { ...prev }
        for (const [id, , summaries] of entries) {
          next[id] = Object.fromEntries(summaries.map((s) => [s.term, s.body]))
        }
        return next
      })
      setLoadingDetail(false)
    }
    loadDetail()
  }, [selectedStudentIds, obsByStudent])

  useEffect(() => {
    async function loadProgress() {
      if (viewMode !== 'progress' || !schoolYear || yearObservations !== null) return
      setLoadingProgress(true)
      const obs = await api.listObservationsForSchoolYear(schoolYear.id)
      setYearObservations(obs)
      setLoadingProgress(false)
    }
    loadProgress()
  }, [viewMode, schoolYear, yearObservations])

  function toggleStudent(id) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleObs(studentId, obsId) {
    setSelectedObsByStudent((prev) => {
      const set = new Set(prev[studentId] ?? [])
      set.has(obsId) ? set.delete(obsId) : set.add(obsId)
      return { ...prev, [studentId]: set }
    })
  }

  // Bulk action spanning every student at once — entries carry {id, student}.
  function setNotesIncluded(entries, included) {
    setSelectedObsByStudent((prev) => {
      const next = { ...prev }
      const byStudent = {}
      for (const e of entries) {
        byStudent[e.student.id] = byStudent[e.student.id] ?? []
        byStudent[e.student.id].push(e.id)
      }
      for (const [studentId, ids] of Object.entries(byStudent)) {
        const set = new Set(next[studentId] ?? [])
        for (const id of ids) included ? set.add(id) : set.delete(id)
        next[studentId] = set
      }
      return next
    })
  }

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s.id)),
    [students, selectedStudentIds]
  )

  const termRange = useMemo(() => (termFilter ? getTermDateRange(schoolYear, termFilter) : null), [schoolYear, termFilter])

  // The curated view: every note from every included student, filtered by
  // domain/term, organized as Domain -> Unit -> notes (each tagged with its
  // student) so bulk actions apply across the whole class at once.
  const curationGroups = useMemo(() => {
    const domainsToShow = domainFilter ? domains.filter((d) => d.id === domainFilter) : domains
    const groups = []
    for (const domain of domainsToShow) {
      const unitBuckets = {}
      const generalNotes = []
      for (const student of selectedStudents) {
        for (const obs of obsByStudent[student.id] ?? []) {
          if (!obs.domainIds.includes(domain.id)) continue
          if (termRange && (obs.observed_on < termRange[0] || obs.observed_on > termRange[1])) continue
          const entry = { ...obs, student }
          if (obs.unit_id) {
            unitBuckets[obs.unit_id] = unitBuckets[obs.unit_id] ?? []
            unitBuckets[obs.unit_id].push(entry)
          } else {
            generalNotes.push(entry)
          }
        }
      }
      const unitGroups = Object.entries(unitBuckets)
        .map(([unitId, notes]) => ({ unitId, label: unitMap[unitId]?.label ?? 'Unit', notes }))
        .sort((a, b) => a.label.localeCompare(b.label))
      generalNotes.sort((a, b) => a.observed_on.localeCompare(b.observed_on))
      for (const g of unitGroups) g.notes.sort((a, b) => a.observed_on.localeCompare(b.observed_on))
      if (unitGroups.length > 0 || generalNotes.length > 0) {
        groups.push({ domain, unitGroups, generalNotes })
      }
    }
    return groups
  }, [domains, domainFilter, termRange, selectedStudents, obsByStudent, unitMap])

  const allVisibleEntries = useMemo(
    () => curationGroups.flatMap((g) => [...g.unitGroups.flatMap((u) => u.notes), ...g.generalNotes]),
    [curationGroups]
  )

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div className="stack">
      <div className="page-header no-print">
        <h1>Reports</h1>
        <div className="row">
          <div className="row no-print" style={{ gap: 0 }}>
            <button
              className={viewMode === 'students' ? 'btn btn-secondary' : 'btn btn-ghost'}
              onClick={() => setViewMode('students')}
            >
              Student reports
            </button>
            <button
              className={viewMode === 'progress' ? 'btn btn-secondary' : 'btn btn-ghost'}
              onClick={() => setViewMode('progress')}
            >
              Class progress
            </button>
          </div>
          {viewMode === 'students' && (
            <button className="btn btn-primary" onClick={() => window.print()} disabled={selectedStudents.length === 0}>
              Print / Save as PDF
            </button>
          )}
        </div>
      </div>

      {viewMode === 'progress' ? (
        <ClassProgressView
          loading={loadingProgress}
          observations={yearObservations ?? []}
          domains={domains}
          unitMap={unitMap}
          students={students}
        />
      ) : (
        <>
          <section className="card stack no-print">
            <h2>Filters</h2>
            <p className="field-hint" style={{ margin: 0 }}>
              These narrow what you&rsquo;re curating below — nothing gets removed from the report just by
              filtering, only by unchecking it.
            </p>

            <div className="field" style={{ marginBottom: 0 }}>
              <div className="spread">
                <label style={{ marginBottom: 4 }}>Students</label>
                <div className="row" style={{ gap: 'var(--space-2)' }}>
                  <button className="obs-table__link" onClick={() => setSelectedStudentIds(new Set(students.map((s) => s.id)))}>
                    select all
                  </button>
                  <button className="obs-table__link" onClick={() => setSelectedStudentIds(new Set())}>
                    deselect all
                  </button>
                </div>
              </div>
              <div className="tag-row">
                {students.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={selectedStudentIds.has(s.id) ? 'tag' : 'tag tag-outline'}
                    onClick={() => toggleStudent(s.id)}
                  >
                    {s.first_name} {s.last_initial}.
                  </button>
                ))}
              </div>
            </div>

            <div className="row" style={{ flexWrap: 'wrap' }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="domain-filter">Domain</label>
                <select id="domain-filter" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ maxWidth: 220 }}>
                  <option value="">All domains</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="term-filter">Term</label>
                <select id="term-filter" value={termFilter} onChange={(e) => setTermFilter(e.target.value)} style={{ maxWidth: 160 }}>
                  <option value="">Whole year</option>
                  {TERMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card stack no-print">
            <h2>Report options</h2>
            <p className="field-hint" style={{ margin: 0 }}>
              The default report is lean — student name, then date and note grouped by domain and unit.
            </p>
            <label className="row" style={{ fontWeight: 400 }}>
              <input type="checkbox" checked={includeGrowthStrip} onChange={(e) => setIncludeGrowthStrip(e.target.checked)} />
              Include growth strip
            </label>
            <div>
              <label style={{ marginBottom: 4 }}>Include term summaries</label>
              <div className="row">
                {TERMS.map((t) => (
                  <label key={t.value} className="row" style={{ fontWeight: 400, gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={includeSummaryTerms[t.value]}
                      onChange={(e) => setIncludeSummaryTerms((prev) => ({ ...prev, [t.value]: e.target.checked }))}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {loadingDetail && <p className="muted no-print">Loading report details…</p>}

          <section className="card stack no-print">
            <div className="spread">
              <h2 style={{ margin: 0 }}>Build the summary</h2>
              <div className="row">
                <button className="btn btn-secondary" onClick={() => setNotesIncluded(allVisibleEntries, true)} disabled={allVisibleEntries.length === 0}>
                  Select all visible
                </button>
                <button className="btn btn-ghost" onClick={() => setNotesIncluded(allVisibleEntries, false)} disabled={allVisibleEntries.length === 0}>
                  Remove all visible
                </button>
              </div>
            </div>
            <p className="field-hint" style={{ margin: 0 }}>
              Everything starts checked. Uncheck raw daily notes that aren&rsquo;t parent-appropriate — the report
              should read as a curated summary, not the full working history.
            </p>

            {curationGroups.length === 0 && <p className="muted">No notes match these filters.</p>}

            <div className="stack">
              {curationGroups.map(({ domain, unitGroups, generalNotes }) => (
                <div key={domain.id} className="curation-domain">
                  <h3>{domain.icon} {domain.name}</h3>
                  {unitGroups.map((u) => (
                    <CurationUnit key={u.unitId} label={u.label} entries={u.notes} onToggle={toggleObs} onSetGroup={setNotesIncluded} selectedObsByStudent={selectedObsByStudent} />
                  ))}
                  {generalNotes.length > 0 && (
                    <CurationUnit label="General" entries={generalNotes} onToggle={toggleObs} onSetGroup={setNotesIncluded} selectedObsByStudent={selectedObsByStudent} />
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="report-print-area">
            {selectedStudents.map((student) => (
              <ReportPage
                key={student.id}
                student={student}
                schoolYear={schoolYear}
                domains={domains}
                unitMap={unitMap}
                observations={(obsByStudent[student.id] ?? []).filter((o) => selectedObsByStudent[student.id]?.has(o.id))}
                summaries={summariesByStudent[student.id] ?? {}}
                includeSummaryTerms={includeSummaryTerms}
                includeGrowthStrip={includeGrowthStrip}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CurationUnit({ label, entries, onToggle, onSetGroup, selectedObsByStudent }) {
  return (
    <div className="curation-unit">
      <div className="curation-unit__header">
        <span className="report-unit-heading" style={{ margin: 0 }}>
          {label} <span className="muted" style={{ fontWeight: 400 }}>({entries.length})</span>
        </span>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" style={{ padding: '4px 14px', minHeight: 32, fontSize: '0.8rem' }} onClick={() => onSetGroup(entries, true)}>
            Select all
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 14px', minHeight: 32, fontSize: '0.8rem' }} onClick={() => onSetGroup(entries, false)}>
            Remove all
          </button>
        </div>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        {entries.map((entry) => (
          <label key={entry.id} className="curation-note">
            <input
              type="checkbox"
              checked={selectedObsByStudent[entry.student.id]?.has(entry.id) ?? false}
              onChange={() => onToggle(entry.student.id, entry.id)}
            />
            <span className="curation-note__student">{entry.student.first_name} {entry.student.last_initial}.</span>
            <span className="utility muted curation-note__date">{formatShortDate(entry.observed_on)}</span>
            <span className="curation-note__body">{entry.body}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function groupByUnit(observations, unitMap) {
  const groups = {}
  for (const obs of observations) {
    const key = obs.unit_id || UNGROUPED
    groups[key] = groups[key] ?? []
    groups[key].push(obs)
  }
  // Named units first (alphabetical by label), general notes last.
  const keys = Object.keys(groups).filter((k) => k !== UNGROUPED).sort((a, b) => (unitMap[a]?.label ?? '').localeCompare(unitMap[b]?.label ?? ''))
  if (groups[UNGROUPED]) keys.push(UNGROUPED)
  return keys.map((key) => ({ unit: key === UNGROUPED ? null : unitMap[key]?.label ?? null, notes: groups[key] }))
}

function ReportPage({ student, schoolYear, domains, unitMap, observations, summaries, includeSummaryTerms, includeGrowthStrip }) {
  const byDomain = {}
  const undomained = []
  for (const obs of observations) {
    if (obs.domainIds.length === 0) {
      undomained.push(obs)
      continue
    }
    for (const did of obs.domainIds) {
      byDomain[did] = byDomain[did] ?? []
      byDomain[did].push(obs)
    }
  }

  return (
    <div className="report-page report-section">
      <h1 className="report-header">{student.first_name} {student.last_initial}.</h1>
      <hr className="report-rule" />

      {TERMS.filter((t) => includeSummaryTerms[t.value] && summaries[t.value]).map((t) => (
        <div key={t.value} className="report-section" style={{ marginBottom: '0.1in' }}>
          <div className="report-domain-heading">{t.label} summary</div>
          <p className="report-observation">{summaries[t.value]}</p>
        </div>
      ))}

      {includeGrowthStrip && (
        <div className="report-section" style={{ marginBottom: '0.1in' }}>
          <div className="report-domain-heading">Growth over the year</div>
          <GrowthStrip observations={observations} schoolYear={schoolYear} />
        </div>
      )}

      {domains.map(
        (domain) =>
          byDomain[domain.id] && (
            <div key={domain.id} className="report-section">
              <div className="report-domain-heading">{domain.name}</div>
              {groupByUnit(byDomain[domain.id], unitMap).map((group) => (
                <div key={group.unit ?? 'general'}>
                  {group.unit && <div className="report-unit-heading">{group.unit}</div>}
                  <ReportNotesTable notes={group.notes} />
                </div>
              ))}
            </div>
          )
      )}

      {undomained.length > 0 && (
        <div className="report-section">
          <div className="report-domain-heading">General observations</div>
          <ReportNotesTable notes={undomained} />
        </div>
      )}
    </div>
  )
}

function ReportNotesTable({ notes }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th style={{ width: '15%' }}>Date</th>
          <th style={{ width: '18%' }}>Level</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {notes.map((obs) => (
          <tr key={obs.id} className={obs.is_flagged ? 'report-row--flagged' : undefined}>
            <td className="obs-date">{formatShortDate(obs.observed_on)}</td>
            <td>{obs.level ? LEVEL_MAP[obs.level].label : '—'}</td>
            <td>{obs.body}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Class-wide view: for each domain, broken down by unit/lesson, how many
// students are at each level right now. Screen-only insight, not a graded
// ranking — just where to focus the next lesson.
function ClassProgressView({ loading, observations, domains, unitMap, students }) {
  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students])

  const byDomain = useMemo(() => {
    return domains.map((domain) => {
      const domainObs = observations.filter((o) => o.domainIds.includes(domain.id) && o.level)
      // Latest level per student, per unit within this domain.
      const unitBuckets = {}
      for (const obs of domainObs) {
        const unitKey = obs.unit_id || UNGROUPED
        unitBuckets[unitKey] = unitBuckets[unitKey] ?? {}
        const existing = unitBuckets[unitKey][obs.student_id]
        if (!existing || obs.observed_on > existing.observed_on) {
          unitBuckets[unitKey][obs.student_id] = obs
        }
      }
      const unitList = Object.entries(unitBuckets)
        .sort(([a], [b]) => {
          if (a === UNGROUPED) return 1
          if (b === UNGROUPED) return -1
          return (unitMap[a]?.label ?? '').localeCompare(unitMap[b]?.label ?? '')
        })
        .map(([key, byStudent]) => ({
          unit: key === UNGROUPED ? 'General' : unitMap[key]?.label ?? 'Unit',
          byLevel: LEVELS.reduce((acc, level) => {
            acc[level.value] = Object.values(byStudent).filter((o) => o.level === level.value)
            return acc
          }, {}),
          total: Object.keys(byStudent).length,
        }))
      return { domain, unitList }
    }).filter((d) => d.unitList.length > 0)
  }, [domains, observations, unitMap])

  if (loading) return <p className="muted">Loading class progress…</p>
  if (byDomain.length === 0) return <p className="muted">No leveled observations yet.</p>

  return (
    <div className="stack no-print">
      <p className="field-hint" style={{ margin: 0 }}>
        Most recent level per student, grouped by domain and unit/lesson — a quick read on where the class stands,
        not a score. ★ marks the most common level for that unit.
      </p>
      {byDomain.map(({ domain, unitList }) => (
        <section key={domain.id} className="card stack progress-domain">
          <h2 className="progress-domain__title">{domain.icon} {domain.name}</h2>
          {unitList.map((u, i) => {
            const maxCount = Math.max(...LEVELS.map((level) => u.byLevel[level.value].length))
            return (
              <div key={`${u.unit}-${i}`} className="progress-unit">
                <div className="progress-unit__label">{u.unit}</div>
                <div className="progress-unit__bars">
                  {LEVELS.map((level) => {
                    const list = u.byLevel[level.value]
                    const pct = u.total > 0 ? Math.round((list.length / u.total) * 100) : 0
                    const isMost = maxCount > 0 && list.length === maxCount
                    return (
                      <div key={level.value} className="progress-bar-row">
                        <span className="progress-bar-row__level">
                          {isMost && list.length > 0 && '★ '}
                          {LEVEL_MAP[level.value].emoji} {level.label}
                        </span>
                        <div className="progress-bar-row__track">
                          <div className="progress-bar-row__fill" style={{ width: `${pct}%`, background: isMost ? 'var(--grape)' : 'var(--chrome)' }} />
                        </div>
                        <span className="progress-bar-row__count">{list.length}</span>
                        {list.length > 0 && (
                          <span className="progress-bar-row__names">
                            {list.map((obs) => `${studentMap[obs.student_id]?.first_name} ${studentMap[obs.student_id]?.last_initial}.`).join(', ')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
