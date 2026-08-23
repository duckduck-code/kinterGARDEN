import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import { TERMS, LEVEL_MAP, PINNED_CATEGORIES, PINNED_CATEGORY_MAP } from '../lib/constants'
import { formatShortDate } from '../lib/format'
import { getCurrentLevel } from '../lib/levelStats'
import StudentAvatar from '../components/StudentAvatar.jsx'
import { LevelIcon } from '../components/Butterfly.jsx'
import GrowthStrip from '../components/GrowthStrip.jsx'
import NoteComposer from '../components/NoteComposer.jsx'
import { useToast } from '../components/Toast.jsx'

export default function StudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [student, setStudent] = useState(null)
  const [schoolYear, setSchoolYear] = useState(null)
  const [domains, setDomains] = useState([])
  const [units, setUnits] = useState([])
  const [observations, setObservations] = useState([])
  const [summaries, setSummaries] = useState({})
  const [pinnedNotes, setPinnedNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [domainFilter, setDomainFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [groupByDomain, setGroupByDomain] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [editingObs, setEditingObs] = useState(null)

  const [toastNode, showToast] = useToast()

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [s, year, domainList, unitList, obsList, summaryList, pinned] = await Promise.all([
        api.getStudent(id),
        api.getCurrentSchoolYear(),
        api.listDomains(),
        api.listUnits(),
        api.listObservationsForStudent(id),
        api.listSummariesForStudent(id),
        api.listPinnedNotes(id),
      ])
      setStudent(s)
      setSchoolYear(year)
      setDomains(domainList)
      setUnits(unitList)
      setObservations(obsList)
      setPinnedNotes(pinned)
      const byTerm = {}
      for (const row of summaryList) byTerm[row.term] = row.body
      setSummaries(byTerm)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const domainMap = useMemo(() => Object.fromEntries(domains.map((d) => [d.id, d])), [domains])
  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])
  const visibleDomains = useMemo(() => domains.filter((d) => !d.is_hidden), [domains])

  // The domain filter lives at the top of the page and scopes everything
  // below it — growth strip included — not just the timeline.
  const domainScopedObservations = useMemo(() => {
    if (!domainFilter) return observations
    return observations.filter((o) => o.domainIds.includes(domainFilter))
  }, [observations, domainFilter])

  const filteredObservations = useMemo(() => {
    return domainScopedObservations.filter((obs) => {
      if (unitFilter && obs.unit_id !== unitFilter) return false
      if (fromDate && obs.observed_on < fromDate) return false
      if (toDate && obs.observed_on > toDate) return false
      return true
    })
  }, [domainScopedObservations, unitFilter, fromDate, toDate])

  const availableUnits = useMemo(
    () => (domainFilter ? units.filter((u) => u.domain_id === domainFilter) : units),
    [units, domainFilter]
  )

  const currentLevel = useMemo(() => getCurrentLevel(observations), [observations])

  // "Latest" is always the single most recent note across the whole
  // timeline (not just what's currently filtered), so the highlight stays
  // meaningful even while narrowing the view down.
  const latestObs = useMemo(() => {
    if (observations.length === 0) return null
    return observations.slice().sort((a, b) => b.observed_on.localeCompare(a.observed_on) || b.created_at.localeCompare(a.created_at))[0]
  }, [observations])

  const groupedByDomain = useMemo(() => {
    if (!groupByDomain) return null
    const groups = visibleDomains.map((d) => ({
      domain: d,
      notes: filteredObservations.filter((o) => o.domainIds.includes(d.id)),
    }))
    const undomained = filteredObservations.filter((o) => o.domainIds.length === 0)
    if (undomained.length > 0) groups.push({ domain: null, notes: undomained })
    return groups.filter((g) => g.notes.length > 0)
  }, [groupByDomain, visibleDomains, filteredObservations])

  async function handleSaveNote(values) {
    if (editingObs) {
      await api.updateObservation(editingObs.id, values)
      showToast('Note updated')
    } else {
      await api.createObservation({ student_id: id, school_year_id: schoolYear.id, ...values })
      showToast('Note saved')
    }
    setComposerOpen(false)
    setEditingObs(null)
    loadAll()
  }

  async function handleDelete(obs) {
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    await api.deleteObservation(obs.id)
    setObservations((list) => list.filter((o) => o.id !== obs.id))
  }

  async function handleToggleFlag(obs) {
    const updated = await api.toggleObservationFlag(obs.id, !obs.is_flagged)
    setObservations((list) => list.map((o) => (o.id === obs.id ? { ...o, is_flagged: updated.is_flagged } : o)))
  }

  async function handleSaveSummary(term, body) {
    await api.upsertSummary({ student_id: id, school_year_id: schoolYear.id, term, body })
    showToast(`${term[0].toUpperCase()}${term.slice(1)} summary saved`)
  }

  if (loading) return <p className="muted">Loading…</p>
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>
  if (!student) return null

  return (
    <div className="stack">
      <button className="btn btn-ghost no-print" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="page-header">
        <div className="row">
          <StudentAvatar student={student} size={56} />
          <div>
            <h1 style={{ margin: 0 }}>
              {student.first_name} {student.last_initial}.
            </h1>
            {currentLevel && (
              <div className="current-level-badge" title={currentLevel.isRecent ? 'Based on the last 30 days' : 'Based on all notes — nothing recent leveled'}>
                <LevelIcon level={currentLevel.level} size={20} />
                <span>{LEVEL_MAP[currentLevel.level].label}</span>
                <span className="muted utility" style={{ fontWeight: 400, fontSize: '0.7rem' }}>
                  {currentLevel.isRecent ? 'last 30 days' : 'all-time'}
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          className="btn btn-primary no-print"
          onClick={() => {
            setEditingObs(null)
            setComposerOpen(true)
          }}
        >
          + Add note
        </button>
      </div>

      <PinnedNotesSection studentId={id} notes={pinnedNotes} onChange={setPinnedNotes} />

      <section className="card">
        <h2>Growth strip</h2>
        <GrowthStrip observations={domainScopedObservations} schoolYear={schoolYear} />
      </section>

      <section className="card stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Timeline</h2>
          <label className="row no-print" style={{ fontWeight: 400, fontSize: '0.8rem' }}>
            <input type="checkbox" checked={groupByDomain} onChange={(e) => setGroupByDomain(e.target.checked)} />
            Group by domain
          </label>
        </div>
        <div className="row timeline-filters no-print" style={{ flexWrap: 'wrap' }}>
          <select
            value={domainFilter}
            onChange={(e) => {
              setDomainFilter(e.target.value)
              setUnitFilter('')
            }}
            aria-label="Filter by domain"
          >
            <option value="">All domains</option>
            {visibleDomains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {d.name}
              </option>
            ))}
          </select>
          {availableUnits.length > 0 && (
            <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="Filter by unit">
              <option value="">All units</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          )}
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} aria-label="From date" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} aria-label="To date" />
          {(domainFilter || unitFilter || fromDate || toDate) && (
            <button
              className="obs-table__link"
              onClick={() => {
                setDomainFilter('')
                setUnitFilter('')
                setFromDate('')
                setToDate('')
              }}
            >
              clear filters
            </button>
          )}
        </div>

        {filteredObservations.length === 0 && <p className="muted">No observations match these filters.</p>}

        {groupedByDomain ? (
          <div className="stack">
            {groupedByDomain.map((group) => (
              <div key={group.domain?.id ?? 'none'}>
                <h3>
                  {group.domain ? `${group.domain.icon} ${group.domain.name}` : 'No domain'}{' '}
                  <span className="muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>({group.notes.length})</span>
                </h3>
                <ObservationsTable
                  observations={group.notes}
                  domainMap={domainMap}
                  unitMap={unitMap}
                  latestObsId={latestObs?.id}
                  onEdit={(obs) => {
                    setEditingObs(obs)
                    setComposerOpen(true)
                  }}
                  onToggleFlag={handleToggleFlag}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        ) : (
          <ObservationsTable
            observations={filteredObservations}
            domainMap={domainMap}
            unitMap={unitMap}
            latestObsId={latestObs?.id}
            onEdit={(obs) => {
              setEditingObs(obs)
              setComposerOpen(true)
            }}
            onToggleFlag={handleToggleFlag}
            onDelete={handleDelete}
          />
        )}
      </section>

      <section className="card stack">
        <h2>Term summaries</h2>
        {TERMS.map((term) => (
          <SummaryField
            key={term.value}
            label={term.label}
            value={summaries[term.value] ?? ''}
            onSave={(body) => handleSaveSummary(term.value, body)}
          />
        ))}
      </section>

      {composerOpen && (
        <NoteComposer
          student={student}
          domains={domains}
          units={units}
          existing={editingObs}
          onSave={handleSaveNote}
          onCancel={() => {
            setComposerOpen(false)
            setEditingObs(null)
          }}
        />
      )}

      {toastNode}
    </div>
  )
}

// Excel-row style: domain, date, level, and note on one compact line so
// several days are visible at once instead of scrolling through big cards.
function ObservationsTable({ observations, domainMap, unitMap, latestObsId, onEdit, onToggleFlag, onDelete }) {
  if (observations.length === 0) return null
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="obs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Domain</th>
            <th>Level</th>
            <th>Note</th>
            <th className="no-print"></th>
          </tr>
        </thead>
        <tbody>
          {observations.map((obs) => {
            const unit = obs.unit_id ? unitMap[obs.unit_id] : null
            const isLatest = obs.id === latestObsId
            const rowClass = ['obs-row', obs.is_flagged && 'obs-row--flagged', isLatest && 'obs-row--latest'].filter(Boolean).join(' ')
            return (
              <tr key={obs.id} className={rowClass}>
                <td className="utility">
                  {isLatest && <span title="Most recent note">✨ </span>}
                  {formatShortDate(obs.observed_on)}
                </td>
                <td>
                  {obs.domainIds.map((did) => domainMap[did]?.icon).filter(Boolean).join(' ') || '—'}
                </td>
                <td className="obs-table__level">{obs.level ? LEVEL_MAP[obs.level].emoji : '—'}</td>
                <td>
                  {obs.is_flagged && <span title="Flagged for revisit">🚩 </span>}
                  {obs.body}
                  {unit && <span className="muted utility" style={{ marginLeft: 6 }}>· {unit.label}</span>}
                </td>
                <td className="no-print obs-table__actions">
                  <button className="obs-table__link" onClick={() => onEdit(obs)}>
                    edit
                  </button>
                  <button className="obs-table__link" onClick={() => onToggleFlag(obs)}>
                    {obs.is_flagged ? 'unflag' : 'flag'}
                  </button>
                  <button className="obs-table__link obs-table__link--danger" onClick={() => onDelete(obs)}>
                    delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PinnedNotesSection({ studentId, notes, onChange }) {
  const [adding, setAdding] = useState(false)
  const [category, setCategory] = useState('description')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingBody, setEditingBody] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!body.trim()) return
    const note = await api.createPinnedNote({ student_id: studentId, category, body: body.trim() })
    onChange((list) => [...list, note])
    setBody('')
    setCategory('description')
    setAdding(false)
  }

  async function handleSaveEdit(note) {
    const updated = await api.updatePinnedNote(note.id, { body: editingBody.trim() })
    onChange((list) => list.map((n) => (n.id === note.id ? updated : n)))
    setEditingId(null)
  }

  async function handleDelete(note) {
    if (!window.confirm('Remove this pinned note?')) return
    await api.deletePinnedNote(note.id)
    onChange((list) => list.filter((n) => n.id !== note.id))
  }

  return (
    <section className="pinned-notes stack">
      <div className="spread">
        <h3 style={{ margin: 0 }}>📌 Pinned</h3>
        <button className="btn btn-ghost no-print" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Close' : '+ Add'}
        </button>
      </div>

      {notes.length === 0 && !adding && <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Nothing pinned yet.</p>}

      <div className="stack" style={{ gap: 'var(--space-2)' }}>
        {notes.map((note) => {
          const cat = PINNED_CATEGORY_MAP[note.category] ?? PINNED_CATEGORY_MAP.other
          const isEditing = editingId === note.id
          return (
            <div key={note.id} className="pinned-note">
              <span title={cat.label} style={{ flexShrink: 0 }}>
                {cat.emoji}
              </span>
              {isEditing ? (
                <div className="stack" style={{ flex: 1, gap: 'var(--space-2)' }}>
                  <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={2} />
                  <div className="row no-print">
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleSaveEdit(note)}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, flex: 1 }}>{note.body}</p>
                  <div className="row no-print" style={{ flexShrink: 0 }}>
                    <button
                      className="btn btn-icon btn-ghost"
                      aria-label="Edit"
                      onClick={() => {
                        setEditingId(note.id)
                        setEditingBody(note.body)
                      }}
                    >
                      ✏️
                    </button>
                    <button className="btn btn-icon btn-ghost" aria-label="Delete" onClick={() => handleDelete(note)}>
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="stack no-print">
          <div className="row">
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 200 }}>
              {PINNED_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Short note…" autoFocus />
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!body.trim()}>
            Pin note
          </button>
        </form>
      )}
    </section>
  )
}

function SummaryField({ label, value, onSave }) {
  const [body, setBody] = useState(value)
  const [saving, setSaving] = useState(false)
  const dirty = body !== value

  useEffect(() => setBody(value), [value])

  async function save() {
    setSaving(true)
    try {
      await onSave(body)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      {dirty && (
        <button className="btn btn-secondary no-print" style={{ marginTop: 'var(--space-2)' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : `Save ${label.toLowerCase()} summary`}
        </button>
      )}
    </div>
  )
}
