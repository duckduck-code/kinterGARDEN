import { useEffect, useMemo, useState } from 'react'
import * as api from '../lib/api'
import { LEVELS, LEVEL_MAP } from '../lib/constants'
import { formatShortDate } from '../lib/format'
import StudentAvatar from '../components/StudentAvatar.jsx'
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
  const [includeSummaries, setIncludeSummaries] = useState(false)
  const [includeGrowthStrip, setIncludeGrowthStrip] = useState(false)

  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [obsByStudent, setObsByStudent] = useState({})
  const [selectedObsByStudent, setSelectedObsByStudent] = useState({})
  const [summariesByStudent, setSummariesByStudent] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [focusDomainId, setFocusDomainId] = useState('')
  const [focusUnitId, setFocusUnitId] = useState('')

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

  function applyLessonFocusToAll() {
    setSelectedObsByStudent((prev) => {
      const next = { ...prev }
      for (const student of selectedStudents) {
        const obs = obsByStudent[student.id] ?? []
        next[student.id] = new Set(obs.filter((o) => o.unit_id === focusUnitId).map((o) => o.id))
      }
      return next
    })
  }

  function clearLessonFocus() {
    setFocusDomainId('')
    setFocusUnitId('')
    setSelectedObsByStudent((prev) => {
      const next = { ...prev }
      for (const student of selectedStudents) {
        const obs = obsByStudent[student.id] ?? []
        next[student.id] = new Set(obs.map((o) => o.id))
      }
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

  function setObsGroup(studentId, obsIds, included) {
    setSelectedObsByStudent((prev) => {
      const set = new Set(prev[studentId] ?? [])
      for (const id of obsIds) {
        included ? set.add(id) : set.delete(id)
      }
      return { ...prev, [studentId]: set }
    })
  }

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.has(s.id)),
    [students, selectedStudentIds]
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
            <div className="spread">
              <h2 style={{ margin: 0 }}>Who's included</h2>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => setSelectedStudentIds(new Set(students.map((s) => s.id)))}>
                  Select all
                </button>
                <button className="btn btn-ghost" onClick={() => setSelectedStudentIds(new Set())}>
                  Deselect all
                </button>
              </div>
            </div>
            <div className="stack">
              {students.map((s) => (
                <label key={s.id} className="row" style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={selectedStudentIds.has(s.id)} onChange={() => toggleStudent(s.id)} />
                  {s.first_name} {s.last_initial}.
                </label>
              ))}
            </div>
          </section>

          <section className="card stack no-print">
            <h2>Lesson focus</h2>
            <p className="field-hint" style={{ margin: 0 }}>
              Pick a domain and unit to build a report for that lesson across every included student at once —
              overrides each student's checkboxes below.
            </p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select
                value={focusDomainId}
                onChange={(e) => {
                  setFocusDomainId(e.target.value)
                  setFocusUnitId('')
                }}
                style={{ maxWidth: 200 }}
              >
                <option value="">Choose a domain…</option>
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.name}
                  </option>
                ))}
              </select>
              <select
                value={focusUnitId}
                onChange={(e) => setFocusUnitId(e.target.value)}
                disabled={!focusDomainId}
                style={{ maxWidth: 220 }}
              >
                <option value="">Choose a unit…</option>
                {units
                  .filter((u) => u.domain_id === focusDomainId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
              </select>
              <button className="btn btn-secondary" onClick={applyLessonFocusToAll} disabled={!focusUnitId}>
                Apply to all students
              </button>
              {focusUnitId && (
                <button className="btn btn-ghost" onClick={clearLessonFocus}>
                  Clear focus
                </button>
              )}
            </div>
          </section>

          <section className="card stack no-print">
            <h2>Report options</h2>
            <p className="field-hint" style={{ margin: 0 }}>
              The default report is lean — student name, then date and note grouped by domain. Add sections back in
              if you want them.
            </p>
            <label className="row" style={{ fontWeight: 400 }}>
              <input type="checkbox" checked={includeSummaries} onChange={(e) => setIncludeSummaries(e.target.checked)} />
              Include term summaries
            </label>
            <label className="row" style={{ fontWeight: 400 }}>
              <input type="checkbox" checked={includeGrowthStrip} onChange={(e) => setIncludeGrowthStrip(e.target.checked)} />
              Include growth strip
            </label>
          </section>

          {loadingDetail && <p className="muted no-print">Loading report details…</p>}

          {selectedStudents.map((student) => (
            <StudentCurationCard
              key={student.id}
              student={student}
              observations={obsByStudent[student.id] ?? []}
              selectedIds={selectedObsByStudent[student.id] ?? new Set()}
              unitMap={unitMap}
              onToggleObs={(obsId) => toggleObs(student.id, obsId)}
              onSetGroup={(obsIds, included) => setObsGroup(student.id, obsIds, included)}
            />
          ))}

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
                includeSummaries={includeSummaries}
                includeGrowthStrip={includeGrowthStrip}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function StudentCurationCard({ student, observations, selectedIds, unitMap, onToggleObs, onSetGroup }) {
  const unitGroups = useMemo(() => {
    const groups = {}
    for (const obs of observations) {
      const key = obs.unit_id || UNGROUPED
      groups[key] = groups[key] ?? []
      groups[key].push(obs)
    }
    return Object.entries(groups)
      .filter(([key]) => key !== UNGROUPED)
      .map(([key, notes]) => ({ id: key, label: unitMap[key]?.label ?? 'Unit', notes }))
  }, [observations, unitMap])

  return (
    <section className="card stack no-print">
      <div className="row">
        <StudentAvatar student={student} />
        <h3 style={{ margin: 0 }}>{student.first_name} {student.last_initial}. — build the summary</h3>
      </div>
      <p className="field-hint" style={{ marginTop: 0 }}>
        Everything starts checked. Uncheck raw daily notes that aren't parent-appropriate — the report should read
        as a curated summary, not the full working history.
      </p>

      {unitGroups.length > 0 && (
        <div className="tag-row">
          {unitGroups.map((g) => (
            <span key={g.id} className="row" style={{ gap: 4 }}>
              <button type="button" className="tag" onClick={() => onSetGroup(g.notes.map((o) => o.id), true)}>
                ✓ {g.label} ({g.notes.length})
              </button>
              <button type="button" className="tag tag-outline" onClick={() => onSetGroup(g.notes.map((o) => o.id), false)}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="stack">
        {observations.map((obs) => (
          <label key={obs.id} className="row" style={{ fontWeight: 400, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={selectedIds.has(obs.id)}
              onChange={() => onToggleObs(obs.id)}
              style={{ marginTop: 4 }}
            />
            <span>
              <span className="utility muted">{formatShortDate(obs.observed_on)}</span>
              {obs.unit_id && unitMap[obs.unit_id] && <span className="utility muted"> · {unitMap[obs.unit_id].label}</span>} —{' '}
              {obs.body}
            </span>
          </label>
        ))}
      </div>
    </section>
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

function ReportPage({ student, schoolYear, domains, unitMap, observations, summaries, includeSummaries, includeGrowthStrip }) {
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

      {includeSummaries &&
        ['fall', 'winter', 'spring'].map(
          (term) =>
            summaries[term] && (
              <div key={term} className="report-section" style={{ marginBottom: '0.1in' }}>
                <div className="report-domain-heading">{term[0].toUpperCase() + term.slice(1)} summary</div>
                <p className="report-observation">{summaries[term]}</p>
              </div>
            )
        )}

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
        <section key={domain.id} className="card stack">
          <h2 style={{ margin: 0 }}>{domain.icon} {domain.name}</h2>
          {unitList.map((u, i) => {
            const maxCount = Math.max(...LEVELS.map((level) => u.byLevel[level.value].length))
            return (
              <div key={`${u.unit}-${i}`} style={{ borderTop: '1px solid var(--chrome)', paddingTop: 'var(--space-2)' }}>
                <div className="report-unit-heading" style={{ margin: '0 0 6px' }}>{u.unit}</div>
                <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  {LEVELS.map((level) => {
                    const list = u.byLevel[level.value]
                    if (list.length === 0) return null
                    const isMost = maxCount > 0 && list.length === maxCount
                    return (
                      <div key={level.value} style={{ minWidth: 140 }}>
                        <div
                          className="tag"
                          style={
                            isMost
                              ? { marginBottom: 4, background: 'var(--grape)', color: 'var(--white)', fontWeight: 700 }
                              : { marginBottom: 4 }
                          }
                        >
                          {isMost && '★ '}
                          {LEVEL_MAP[level.value].emoji} {level.label} ({list.length})
                        </div>
                        <div className="stack" style={{ gap: 2 }}>
                          {list.map((obs) => (
                            <span key={obs.id} style={{ fontSize: '0.8rem' }}>
                              {studentMap[obs.student_id]?.first_name} {studentMap[obs.student_id]?.last_initial}.
                            </span>
                          ))}
                        </div>
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
