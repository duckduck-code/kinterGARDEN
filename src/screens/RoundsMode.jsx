import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { useDraft } from '../lib/useDraft'
import StudentAvatar from '../components/StudentAvatar.jsx'
import LevelPicker from '../components/LevelPicker.jsx'
import { SparkleIcon } from '../components/Butterfly.jsx'
import { useToast } from '../components/Toast.jsx'

const FINISH_SPARKLES = [
  { top: '-10px', left: '15%', size: 16, delay: 0 },
  { top: '5px', left: '82%', size: 14, delay: 90 },
  { top: '30px', left: '4%', size: 12, delay: 180 },
  { top: '-14px', left: '55%', size: 18, delay: 60 },
  { top: '20px', left: '95%', size: 12, delay: 220 },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// R3.1.7/R3.1.8 — pick one domain and a prompt, then swipe through the whole
// class entering one short note each. Must survive interruption: progress,
// skip, and resume are all persisted so an interrupted round picks up where
// it left off instead of starting over.
export default function RoundsMode() {
  const [schoolYear, setSchoolYear] = useState(null)
  const [domains, setDomains] = useState([])
  const [units, setUnits] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [round, setRound, clearRound] = useDraft('round', null)
  const [toastNode, showToast] = useToast()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const year = await api.getCurrentSchoolYear()
      if (!year) {
        setLoading(false)
        return
      }
      const [domainList, unitList, studentList] = await Promise.all([
        api.listDomains({ includeHidden: false }),
        api.listUnits(),
        api.listStudents(year.id),
      ])
      setSchoolYear(year)
      setDomains(domainList)
      setUnits(unitList)
      setStudents(studentList)
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreateUnit(domainId, label) {
    const newUnit = await api.createUnit({
      domain_id: domainId,
      label,
      sort_order: units.filter((u) => u.domain_id === domainId).length + 1,
    })
    setUnits((list) => [...list, newUnit])
    return newUnit
  }

  // A student was archived mid-round — skip past them rather than getting stuck.
  useEffect(() => {
    if (!round || loading) return
    const total = round.studentIds.length
    if (round.currentIndex >= total) return
    const currentId = round.studentIds[round.currentIndex]
    if (students.length > 0 && !students.some((s) => s.id === currentId)) {
      setRound((r) => ({ ...r, currentIndex: r.currentIndex + 1 }))
    }
  }, [round, students, loading, setRound])

  if (loading) return <p className="muted">Loading…</p>

  if (!schoolYear) {
    return (
      <div className="empty-state">
        <p>No current school year set up yet.</p>
        <Link className="btn btn-primary" to="/settings">Go to Settings</Link>
      </div>
    )
  }

  if (!round) {
    return (
      <RoundSetup
        students={students}
        domains={domains}
        units={units}
        onCreateUnit={handleCreateUnit}
        onStart={(domainId, prompt, unitId) =>
          setRound({
            domainId: domainId || null,
            prompt,
            unitId: unitId || null,
            studentIds: students.map((s) => s.id),
            currentIndex: 0,
            skippedIds: [],
            completedIds: [],
            body: '',
            level: null,
          })
        }
      />
    )
  }

  const total = round.studentIds.length
  const done = round.currentIndex >= total

  if (done) {
    return (
      <RoundFinish
        round={round}
        students={students}
        onStartNew={() => clearRound()}
      />
    )
  }

  const currentStudent = students.find((s) => s.id === round.studentIds[round.currentIndex])
  if (!currentStudent) {
    // The effect above will advance past this student on the next render.
    return null
  }

  async function saveAndNext() {
    if (round.body.trim()) {
      await api.createObservation({
        student_id: currentStudent.id,
        school_year_id: schoolYear.id,
        body: round.body.trim(),
        level: round.level,
        unit_id: round.unitId || null,
        domainIds: round.domainId ? [round.domainId] : [],
        observed_on: todayISO(),
      })
      showToast(`Saved for ${currentStudent.first_name}`)
    }
    setRound((r) => ({
      ...r,
      completedIds: r.body.trim() ? [...r.completedIds, currentStudent.id] : r.completedIds,
      currentIndex: r.currentIndex + 1,
      body: '',
      level: null,
    }))
  }

  function skip() {
    setRound((r) => ({
      ...r,
      skippedIds: [...r.skippedIds, currentStudent.id],
      currentIndex: r.currentIndex + 1,
      body: '',
      level: null,
    }))
  }

  const domain = domains.find((d) => d.id === round.domainId)
  const unit = units.find((u) => u.id === round.unitId)

  return (
    <div className="stack">
      <div className="spread no-print">
        <div>
          <h1 style={{ marginBottom: 4 }}>Roll call in progress</h1>
          {round.prompt && <p className="muted" style={{ margin: 0 }}>{round.prompt}</p>}
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm('Exit roll call? Notes already saved will be kept, but progress will be cleared.')) {
              clearRound()
            }
          }}
        >
          Exit roll call
        </button>
      </div>

      <div className="card">
        <div className="utility muted" style={{ marginBottom: 'var(--space-2)' }}>
          {round.currentIndex + 1} of {total}
          {domain && <> · {domain.icon} {domain.name}</>}
          {unit && <> · {unit.label}</>}
        </div>

        <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
          <StudentAvatar student={currentStudent} size={56} />
          <h2 style={{ margin: 0 }}>{currentStudent.first_name} {currentStudent.last_initial}.</h2>
        </div>

        <div className="field">
          <textarea
            autoFocus
            value={round.body}
            onChange={(e) => setRound((r) => ({ ...r, body: e.target.value }))}
            placeholder="One quick note…"
            rows={4}
          />
        </div>

        <div className="field">
          <LevelPicker value={round.level} onChange={(level) => setRound((r) => ({ ...r, level }))} />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={skip}>
            Skip
          </button>
          <button className="btn btn-primary" onClick={saveAndNext}>
            {round.body.trim() ? 'Save & next' : 'Next'}
          </button>
        </div>
      </div>

      {toastNode}
    </div>
  )
}

function RoundSetup({ students, domains, units, onCreateUnit, onStart }) {
  const [domainId, setDomainId] = useState('')
  const [prompt, setPrompt] = useState('')
  const [unitId, setUnitId] = useState('')
  const [addingUnit, setAddingUnit] = useState(false)
  const [newUnitLabel, setNewUnitLabel] = useState('')
  const [creatingUnit, setCreatingUnit] = useState(false)

  const availableUnits = units.filter((u) => u.domain_id === domainId)

  async function handleCreateUnit(e) {
    e.preventDefault()
    if (!newUnitLabel.trim()) return
    setCreatingUnit(true)
    try {
      const unit = await onCreateUnit(domainId, newUnitLabel.trim())
      setUnitId(unit.id)
      setNewUnitLabel('')
      setAddingUnit(false)
    } finally {
      setCreatingUnit(false)
    }
  }

  return (
    <div className="card stack">
      <h1>Start roll call</h1>
      <p className="muted">
        Swipe through all {students.length} students entering one short note each. You can skip anyone, and if
        you're interrupted, come back later and pick up right where you left off.
      </p>
      <div className="field">
        <label htmlFor="round-domain">Domain (optional)</label>
        <select
          id="round-domain"
          value={domainId}
          onChange={(e) => {
            setDomainId(e.target.value)
            setUnitId('')
          }}
        >
          <option value="">No specific domain</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon} {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="round-unit">Unit / lesson (optional)</label>
        {!domainId ? (
          <p className="field-hint" style={{ marginTop: 0 }}>
            Pick a domain above to choose a unit — every note in this roll call gets tagged with it.
          </p>
        ) : (
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {availableUnits.length > 0 && (
              <select id="round-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">No specific unit</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            )}

            {addingUnit ? (
              <form onSubmit={handleCreateUnit} className="row">
                <input
                  type="text"
                  value={newUnitLabel}
                  onChange={(e) => setNewUnitLabel(e.target.value)}
                  placeholder="e.g. Unit 2 · Lesson 5"
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-secondary" disabled={!newUnitLabel.trim() || creatingUnit}>
                  {creatingUnit ? 'Adding…' : 'Add'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAddingUnit(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setAddingUnit(true)}>
                + New unit
              </button>
            )}
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="round-prompt">Prompt (optional, shown while you go)</label>
        <input
          id="round-prompt"
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Can they write their name independently?"
        />
      </div>
      <button className="btn btn-primary" disabled={students.length === 0} onClick={() => onStart(domainId, prompt, unitId)}>
        Start roll call
      </button>
      {students.length === 0 && <p className="muted">Add students in Settings first.</p>}
    </div>
  )
}

function RoundFinish({ round, students, onStartNew }) {
  const skippedStudents = students.filter((s) => round.skippedIds.includes(s.id))
  return (
    <div className="card stack">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <h1 style={{ margin: 0 }}>Roll call complete 🦋</h1>
        {round.completedIds.length > 0 &&
          FINISH_SPARKLES.map((s, i) => (
            <span
              key={i}
              className="sparkle-burst"
              style={{ position: 'absolute', top: s.top, left: s.left, color: 'var(--grape)', animationDelay: `${s.delay}ms` }}
            >
              <SparkleIcon size={s.size} />
            </span>
          ))}
      </div>
      <p>
        {round.completedIds.length} note{round.completedIds.length === 1 ? '' : 's'} recorded
        {round.skippedIds.length > 0 && <>, {round.skippedIds.length} skipped</>}.
      </p>
      {skippedStudents.length > 0 && (
        <div>
          <h3>Skipped</h3>
          <ul>
            {skippedStudents.map((s) => (
              <li key={s.id}>
                <Link to="/">{s.first_name} {s.last_initial}.</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button className="btn btn-primary" onClick={onStartNew}>
        Start another roll call
      </button>
    </div>
  )
}
