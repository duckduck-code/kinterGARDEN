import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { QUIET_LIST_WINDOW_DAYS } from '../lib/constants'
import { formatShortDate } from '../lib/format'
import StudentAvatar from '../components/StudentAvatar.jsx'
import NoteComposer from '../components/NoteComposer.jsx'
import { useToast } from '../components/Toast.jsx'

function daysAgoISO(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function ClassOverview() {
  const [schoolYear, setSchoolYear] = useState(null)
  const [students, setStudents] = useState([])
  const [domains, setDomains] = useState([])
  const [units, setUnits] = useState([])
  const [quietCounts, setQuietCounts] = useState({})
  const [yearObservations, setYearObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [composerStudent, setComposerStudent] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const [toastNode, showToast] = useToast()

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const year = await api.getCurrentSchoolYear()
      if (!year) {
        setError('No current school year is set up yet. Add one in Settings.')
        setLoading(false)
        return
      }
      const [studentList, domainList, unitList, counts, yearObs] = await Promise.all([
        api.listStudents(year.id),
        api.listDomains(),
        api.listUnits(),
        api.getObservationCountsSince(year.id, daysAgoISO(QUIET_LIST_WINDOW_DAYS)),
        api.listObservationsForSchoolYear(year.id),
      ])
      setSchoolYear(year)
      setStudents(studentList)
      setDomains(domainList)
      setUnits(unitList)
      setQuietCounts(counts)
      setYearObservations(yearObs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const quietStudentIds = useMemo(() => {
    if (students.length === 0) return new Set()
    const sorted = students
      .map((s) => ({ id: s.id, count: quietCounts[s.id] ?? 0 }))
      .sort((a, b) => a.count - b.count)
    const threshold = Math.max(1, Math.ceil(students.length * 0.2))
    return new Set(sorted.slice(0, threshold).map((s) => s.id))
  }, [students, quietCounts])

  // "Still emerging" — most recent leveled observation is still Emerging.
  // A nudge to look closer, shown right on the card, never a score.
  const emergingStudentIds = useMemo(() => {
    const ids = new Set()
    for (const s of students) {
      const leveled = yearObservations
        .filter((o) => o.student_id === s.id && o.level)
        .sort((a, b) => new Date(b.observed_on) - new Date(a.observed_on))
      if (leveled.length > 0 && leveled[0].level === 'emerging') ids.add(s.id)
    }
    return ids
  }, [students, yearObservations])

  async function handleSaveNote(values) {
    await api.createObservation({
      student_id: composerStudent.id,
      school_year_id: schoolYear.id,
      ...values,
    })
    setComposerStudent(null)
    showToast(`Saved for ${composerStudent.first_name}`)
    const [counts, yearObs] = await Promise.all([
      api.getObservationCountsSince(schoolYear.id, daysAgoISO(QUIET_LIST_WINDOW_DAYS)),
      api.listObservationsForSchoolYear(schoolYear.id),
    ])
    setQuietCounts(counts)
    setYearObservations(yearObs)
  }

  async function runSearch(e) {
    e.preventDefault()
    if (!searchTerm.trim() || !schoolYear) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const results = await api.searchObservations(schoolYear.id, searchTerm.trim())
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setSearchTerm('')
    setSearchResults(null)
  }

  if (loading) {
    return <p className="muted">Loading class…</p>
  }

  if (error) {
    return (
      <div className="empty-state">
        <p>{error}</p>
        <Link className="btn btn-secondary" to="/settings">
          Go to Settings
        </Link>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>{schoolYear.label}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {students.length} student{students.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link to="/rollcall" className="btn btn-primary">
          Start roll call
        </Link>
      </div>

      <form onSubmit={runSearch} className="row">
        <input
          type="text"
          placeholder="Search all notes…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search notes"
        />
        {searchTerm && (
          <button type="button" className="btn btn-ghost" onClick={clearSearch}>
            Clear
          </button>
        )}
        <button type="submit" className="btn btn-secondary" disabled={searching}>
          Search
        </button>
      </form>

      {searchResults && (
        <div className="card stack">
          <h3>{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</h3>
          {searchResults.length === 0 && <p className="muted">No notes matched "{searchTerm}".</p>}
          {searchResults.map((obs) => (
            <Link key={obs.id} to={`/students/${obs.student_id}`} className="stack" style={{ textDecoration: 'none', color: 'inherit', borderBottom: '1px solid var(--chrome)', paddingBottom: 'var(--space-2)' }}>
              <div className="spread">
                <strong>
                  {obs.students?.first_name} {obs.students?.last_initial}.
                </strong>
                <span className="muted utility">{formatShortDate(obs.observed_on)}</span>
              </div>
              <p style={{ margin: 0 }}>{obs.body}</p>
            </Link>
          ))}
        </div>
      )}

      {!searchResults && (
        <>
          {students.length === 0 ? (
            <div className="empty-state">
              <p>No students yet.</p>
              <Link className="btn btn-primary" to="/settings">
                Add your class
              </Link>
            </div>
          ) : (
            <div className="class-grid">
              {students.map((student) => (
                <div key={student.id} className="student-card-wrap">
                  <Link to={`/students/${student.id}`} className="student-card">
                    {quietStudentIds.has(student.id) && (
                      <span className="student-card__flag student-card__flag--quiet" title="Quiet lately — fewest notes recently">
                        🌙
                      </span>
                    )}
                    {emergingStudentIds.has(student.id) && (
                      <span className="student-card__flag student-card__flag--emerging" title="Still emerging — worth a closer look">
                        🐛
                      </span>
                    )}
                    <StudentAvatar student={student} size={68} />
                    <span className="student-card__name">
                      {student.first_name} {student.last_initial}.
                    </span>
                  </Link>
                  <button
                    className="student-card__view-btn"
                    onClick={() => setComposerStudent(student)}
                    title={`Add a note for ${student.first_name}`}
                    aria-label={`Add a note for ${student.first_name}`}
                  >
                    ✏️
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="field-hint">
            Tap a student to see their stats and notes by domain. 🌙 hasn't had many notes in the last{' '}
            {QUIET_LIST_WINDOW_DAYS} days · 🐛 still emerging on their latest leveled note — tap ✏️ for a quick one.
          </p>
        </>
      )}

      {composerStudent && (
        <NoteComposer
          student={composerStudent}
          domains={domains}
          units={units}
          onSave={handleSaveNote}
          onCancel={() => setComposerStudent(null)}
        />
      )}

      {toastNode}
    </div>
  )
}
