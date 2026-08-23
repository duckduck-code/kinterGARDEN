import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { useAuth } from '../lib/useAuth.jsx'
import { AVATAR_COLORS } from '../lib/constants'
import { pickRandomAvatar } from '../lib/avatarPicker'
import { toCsv, downloadCsv } from '../lib/csv'
import StudentAvatar from '../components/StudentAvatar.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Settings() {
  const { isAdmin } = useAuth()
  const [schoolYear, setSchoolYear] = useState(null)
  const [schoolYears, setSchoolYears] = useState([])
  const [students, setStudents] = useState([])
  const [archivedStudents, setArchivedStudents] = useState([])
  const [domains, setDomains] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [toastNode, showToast] = useToast()

  async function loadAll() {
    setLoading(true)
    const year = await api.getCurrentSchoolYear()
    const years = await api.listSchoolYears()
    setSchoolYear(year)
    setSchoolYears(years)
    if (year) {
      const [active, archived, domainList, unitList] = await Promise.all([
        api.listStudents(year.id),
        api.listStudents(year.id, { includeArchived: true }).then((all) => all.filter((s) => s.status === 'archived')),
        api.listDomains(),
        api.listUnits(),
      ])
      setStudents(active)
      setArchivedStudents(archived)
      setDomains(domainList)
      setUnits(unitList)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleExportCsv() {
    if (!schoolYear) return
    const [obs, allStudents] = await Promise.all([
      api.listObservationsForSchoolYear(schoolYear.id),
      api.listStudents(schoolYear.id, { includeArchived: true }),
    ])
    const studentMap = Object.fromEntries(allStudents.map((s) => [s.id, s]))
    const domainMap = Object.fromEntries(domains.map((d) => [d.id, d.name]))

    downloadCsv(
      `students-${schoolYear.label}.csv`,
      toCsv(allStudents, [
        { label: 'First name', value: (s) => s.first_name },
        { label: 'Last initial', value: (s) => s.last_initial },
        { label: 'Status', value: (s) => s.status },
      ])
    )
    downloadCsv(
      `observations-${schoolYear.label}.csv`,
      toCsv(obs, [
        { label: 'Student', value: (o) => `${studentMap[o.student_id]?.first_name ?? ''} ${studentMap[o.student_id]?.last_initial ?? ''}` },
        { label: 'Date', value: (o) => o.observed_on },
        { label: 'Level', value: (o) => o.level ?? '' },
        { label: 'Domains', value: (o) => o.domainIds.map((id) => domainMap[id]).filter(Boolean).join('; ') },
        { label: 'Flagged', value: (o) => (o.is_flagged ? 'yes' : 'no') },
        { label: 'Note', value: (o) => o.body },
      ])
    )
    showToast('CSV files downloaded')
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div className="stack">
      <h1>Settings</h1>

      <SchoolYearSection
        schoolYear={schoolYear}
        schoolYears={schoolYears}
        isAdmin={isAdmin}
        onChanged={loadAll}
      />

      {schoolYear && (
        <>
          <UnitsSection domains={domains} units={units} onChanged={loadAll} />
          <DomainsSection domains={domains} onChanged={loadAll} />
          <StudentsSection schoolYear={schoolYear} students={students} archivedStudents={archivedStudents} onChanged={loadAll} />

          <section className="card stack">
            <h2>Data export</h2>
            <p className="muted" style={{ margin: 0 }}>
              Download everything as CSV — students and observations for {schoolYear.label}. Your data, always
              retrievable.
            </p>
            <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={handleExportCsv}>
              Export CSV
            </button>
          </section>
        </>
      )}

      {toastNode}
    </div>
  )
}

function SchoolYearSection({ schoolYear, schoolYears, isAdmin, onChanged }) {
  const [showNew, setShowNew] = useState(false)
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [className, setClassName] = useState(schoolYear?.class_name ?? '')
  const [savingClassName, setSavingClassName] = useState(false)

  useEffect(() => setClassName(schoolYear?.class_name ?? ''), [schoolYear])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createSchoolYear({ label, start_date: startDate, end_date: endDate })
      setShowNew(false)
      setLabel('')
      setStartDate('')
      setEndDate('')
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleMakeCurrent(id) {
    await api.setCurrentSchoolYear(id)
    onChanged()
  }

  async function handleSaveClassName() {
    setSavingClassName(true)
    try {
      await api.updateSchoolYear(schoolYear.id, { class_name: className.trim() || null })
      onChanged()
    } finally {
      setSavingClassName(false)
    }
  }

  return (
    <section className="card stack">
      <h2>School year</h2>
      {schoolYear ? (
        <p>
          Current: <strong>{schoolYear.label}</strong> ({schoolYear.start_date} – {schoolYear.end_date})
        </p>
      ) : (
        <p className="muted">No current school year set.</p>
      )}

      {schoolYear && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="class-name">Class name</label>
          <p className="field-hint" style={{ marginTop: 0 }}>
            Shown throughout the app instead of the bare year, e.g. "Ms. Madisen's Class."
          </p>
          {isAdmin ? (
            <div className="row">
              <input
                id="class-name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ms. Madisen's Class"
                style={{ flex: 1 }}
              />
              {className !== (schoolYear.class_name ?? '') && (
                <button className="btn btn-secondary" onClick={handleSaveClassName} disabled={savingClassName}>
                  {savingClassName ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>
          ) : (
            <p style={{ margin: 0 }}>{schoolYear.class_name || <span className="muted">Not set</span>}</p>
          )}
        </div>
      )}

      {schoolYears.length > 1 && (
        <div className="stack">
          {schoolYears.map((y) => (
            <div key={y.id} className="spread">
              <span>
                {y.label} {y.is_current && '(current)'}
              </span>
              {isAdmin && !y.is_current && (
                <button className="btn btn-ghost" onClick={() => handleMakeCurrent(y.id)}>
                  Make current
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        showNew ? (
          <form onSubmit={handleCreate} className="stack">
            <div className="field">
              <label htmlFor="year-label">Label</label>
              <input id="year-label" required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2027–2028" />
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="year-start">Start date</label>
                <input id="year-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="year-end">End date</label>
                <input id="year-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Create year
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setShowNew(true)}>
            + New school year (rollover)
          </button>
        )
      ) : (
        <p className="field-hint">Only the admin account can add or switch school years.</p>
      )}
    </section>
  )
}

function StudentsSection({ schoolYear, students, archivedStudents, onChanged }) {
  const [showForm, setShowForm] = useState(false)
  return (
    <section className="card stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Students ({students.length})</h2>
        <button className="btn btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ Add student'}
        </button>
      </div>

      {showForm && (
        <StudentForm
          schoolYear={schoolYear}
          existingEmojis={students.map((s) => s.avatar_emoji)}
          onSaved={() => {
            setShowForm(false)
            onChanged()
          }}
        />
      )}

      <div className="stack">
        {students.map((s) => (
          <StudentRow key={s.id} student={s} existingEmojis={students.map((s) => s.avatar_emoji)} onChanged={onChanged} />
        ))}
      </div>

      {archivedStudents.length > 0 && (
        <details>
          <summary>Archived ({archivedStudents.length})</summary>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {archivedStudents.map((s) => (
              <div key={s.id} className="row muted">
                <StudentAvatar student={s} size={32} /> {s.first_name} {s.last_initial}.
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function StudentForm({ schoolYear, existing, existingEmojis = [], onSaved, onCancel }) {
  const [firstName, setFirstName] = useState(existing?.first_name ?? '')
  const [lastInitial, setLastInitial] = useState(existing?.last_initial ?? '')
  const [{ avatar_color: initialColor, avatar_emoji: initialEmoji }] = useState(() =>
    existing ? { avatar_color: existing.avatar_color, avatar_emoji: existing.avatar_emoji } : pickRandomAvatar(existingEmojis)
  )
  const [avatarColor, setAvatarColor] = useState(initialColor)
  const [avatarEmoji, setAvatarEmoji] = useState(initialEmoji)
  const [saving, setSaving] = useState(false)

  function shuffleAvatar() {
    const { avatar_emoji, avatar_color } = pickRandomAvatar(existingEmojis)
    setAvatarEmoji(avatar_emoji)
    setAvatarColor(avatar_color)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const patch = { first_name: firstName.trim(), last_initial: lastInitial.trim(), avatar_color: avatarColor, avatar_emoji: avatarEmoji }
      if (existing) {
        await api.updateStudent(existing.id, patch)
      } else {
        await api.createStudent({ ...patch, school_year_id: schoolYear.id })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack card" style={{ boxShadow: 'none', border: '1px solid var(--chrome)' }}>
      <div className="row">
        <div className="field" style={{ flex: 2, marginBottom: 0 }}>
          <label htmlFor="first-name">First name</label>
          <input id="first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}>
          <label htmlFor="last-initial">Last initial</label>
          <input id="last-initial" maxLength={1} value={lastInitial} onChange={(e) => setLastInitial(e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="avatar-emoji">Avatar</label>
          <input id="avatar-emoji" style={{ width: 64 }} value={avatarEmoji} onChange={(e) => setAvatarEmoji(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Color</label>
          <div className="row">
            {AVATAR_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setAvatarColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: avatarColor === c ? '3px solid var(--ink)' : '1px solid var(--chrome)',
                  cursor: 'pointer',
                }}
                aria-label={`Choose color ${c}`}
              />
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={shuffleAvatar} style={{ marginBottom: 2 }}>
          🎲 Shuffle
        </button>
      </div>
      <div className="row">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {existing ? 'Save' : 'Add student'}
        </button>
      </div>
    </form>
  )
}

function StudentRow({ student, existingEmojis = [], onChanged }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <StudentForm
        schoolYear={{ id: student.school_year_id }}
        existing={student}
        existingEmojis={existingEmojis.filter((e) => e !== student.avatar_emoji)}
        onSaved={() => {
          setEditing(false)
          onChanged()
        }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  async function handleArchive() {
    if (!window.confirm(`Archive ${student.first_name}? They'll be hidden from the class grid but data is kept.`)) return
    await api.archiveStudent(student.id)
    onChanged()
  }

  return (
    <div className="spread">
      <div className="row">
        <StudentAvatar student={student} size={36} />
        <span>{student.first_name} {student.last_initial}.</span>
      </div>
      <div className="row">
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="btn btn-ghost" onClick={handleArchive}>
          Archive
        </button>
      </div>
    </div>
  )
}

function DomainsSection({ domains, onChanged }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('⭐')

  async function handleAdd(e) {
    e.preventDefault()
    await api.createDomain({ name: name.trim(), icon, color: '#C8A2E8', sort_order: domains.length + 1 })
    setName('')
    setIcon('⭐')
    setShowForm(false)
    onChanged()
  }

  async function handleRename(domain, newName) {
    await api.updateDomain(domain.id, { name: newName })
    onChanged()
  }

  async function handleToggleHidden(domain) {
    await api.updateDomain(domain.id, { is_hidden: !domain.is_hidden })
    onChanged()
  }

  async function handleMove(domain, direction) {
    const sorted = [...domains].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((d) => d.id === domain.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      api.updateDomain(domain.id, { sort_order: other.sort_order }),
      api.updateDomain(other.id, { sort_order: domain.sort_order }),
    ])
    onChanged()
  }

  async function handleDelete(domain) {
    if (!window.confirm(`Delete "${domain.name}"? This removes it from any notes that reference it.`)) return
    await api.deleteDomain(domain.id)
    onChanged()
  }

  const sorted = [...domains].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <section className="card stack">
      <div className="spread">
        <h2 style={{ margin: 0 }}>Domains</h2>
        <button className="btn btn-secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : '+ Add domain'}
        </button>
      </div>
      <p className="field-hint" style={{ margin: 0 }}>
        Rename, reorder, hide, or add domains to match your district's framework.
      </p>

      {showForm && (
        <form onSubmit={handleAdd} className="row">
          <input style={{ width: 56 }} value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="Icon" />
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Domain name" style={{ flex: 1 }} />
          <button className="btn btn-primary" type="submit">
            Add
          </button>
        </form>
      )}

      <div className="stack">
        {sorted.map((domain, i) => (
          <div key={domain.id} className="spread" style={{ opacity: domain.is_hidden ? 0.5 : 1 }}>
            <div className="row" style={{ flex: 1 }}>
              <span>{domain.icon}</span>
              <input
                defaultValue={domain.name}
                onBlur={(e) => e.target.value !== domain.name && handleRename(domain, e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, minHeight: 'auto', padding: 4 }}
              />
            </div>
            <div className="row">
              <button className="btn btn-icon btn-ghost" onClick={() => handleMove(domain, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button className="btn btn-icon btn-ghost" onClick={() => handleMove(domain, 1)} disabled={i === sorted.length - 1} aria-label="Move down">
                ↓
              </button>
              <button className="btn btn-ghost" onClick={() => handleToggleHidden(domain)}>
                {domain.is_hidden ? 'Show' : 'Hide'}
              </button>
              <button className="btn btn-ghost" onClick={() => handleDelete(domain)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function UnitsSection({ domains, units, onChanged }) {
  const [domainId, setDomainId] = useState(domains[0]?.id ?? '')
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!domainId && domains.length > 0) setDomainId(domains[0].id)
  }, [domains, domainId])

  const domainUnits = units.filter((u) => u.domain_id === domainId).sort((a, b) => a.sort_order - b.sort_order)

  async function handleAdd(e) {
    e.preventDefault()
    if (!label.trim() || !domainId) return
    await api.createUnit({ domain_id: domainId, label: label.trim(), sort_order: domainUnits.length + 1 })
    setLabel('')
    onChanged()
  }

  async function handleRename(unit, newLabel) {
    if (!newLabel.trim() || newLabel === unit.label) return
    await api.updateUnit(unit.id, { label: newLabel.trim() })
    onChanged()
  }

  async function handleMove(unit, direction) {
    const idx = domainUnits.findIndex((u) => u.id === unit.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= domainUnits.length) return
    const other = domainUnits[swapIdx]
    await Promise.all([
      api.updateUnit(unit.id, { sort_order: other.sort_order }),
      api.updateUnit(other.id, { sort_order: unit.sort_order }),
    ])
    onChanged()
  }

  async function handleDelete(unit) {
    if (!window.confirm(`Delete "${unit.label}"? Notes tagged with it keep their other info, just lose this tag.`)) return
    await api.deleteUnit(unit.id)
    onChanged()
  }

  if (domains.length === 0) return null

  return (
    <section className="card stack">
      <h2>Units &amp; lessons</h2>
      <p className="field-hint" style={{ margin: 0 }}>
        Curriculum references like "Unit 2 · Lesson 5" — scoped per domain so Math's units stay separate from
        Reading's. Pickable from a dropdown when recording a note.
      </p>

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="unit-domain">Domain</label>
        <select id="unit-domain" value={domainId} onChange={(e) => setDomainId(e.target.value)} style={{ maxWidth: 260 }}>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon} {d.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleAdd} className="row">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Unit 2 · Lesson 5" style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={!label.trim()}>
          Add
        </button>
      </form>

      {domainUnits.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No units yet for this domain.
        </p>
      ) : (
        <div className="stack">
          {domainUnits.map((unit, i) => (
            <div key={unit.id} className="spread">
              <input
                defaultValue={unit.label}
                onBlur={(e) => handleRename(unit, e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 700, minHeight: 'auto', padding: 4, flex: 1 }}
              />
              <div className="row">
                <button className="btn btn-icon btn-ghost" onClick={() => handleMove(unit, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button className="btn btn-icon btn-ghost" onClick={() => handleMove(unit, 1)} disabled={i === domainUnits.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button className="btn btn-ghost" onClick={() => handleDelete(unit)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
