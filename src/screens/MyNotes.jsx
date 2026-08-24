import { useEffect, useState } from 'react'
import * as api from '../lib/api'
import { TEACHER_NOTE_CATEGORIES, TEACHER_NOTE_CATEGORY_MAP } from '../lib/constants'
import { formatShortDate } from '../lib/format'
import { useToast } from '../components/Toast.jsx'

// A personal reflection space — ideas, what went well, what to change,
// routine tweaks. Not tied to any student, never printed in a report.
export default function MyNotes() {
  const [schoolYear, setSchoolYear] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [category, setCategory] = useState('idea')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingBody, setEditingBody] = useState('')

  const [toastNode, showToast] = useToast()

  async function loadAll() {
    setLoading(true)
    const year = await api.getCurrentSchoolYear()
    setSchoolYear(year)
    if (year) {
      const list = await api.listTeacherNotes(year.id)
      setNotes(list)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!body.trim() || !schoolYear) return
    setSaving(true)
    try {
      const note = await api.createTeacherNote({ school_year_id: schoolYear.id, category, body: body.trim() })
      setNotes((list) => [note, ...list])
      setBody('')
      showToast('Saved')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveEdit(note) {
    const updated = await api.updateTeacherNote(note.id, { body: editingBody.trim() })
    setNotes((list) => list.map((n) => (n.id === note.id ? updated : n)))
    setEditingId(null)
  }

  async function handleDelete(note) {
    if (!window.confirm('Delete this note?')) return
    await api.deleteTeacherNote(note.id)
    setNotes((list) => list.filter((n) => n.id !== note.id))
  }

  if (loading) return <p className="muted">Loading…</p>

  if (!schoolYear) {
    return <p className="muted">No current school year set up yet. Add one in Settings.</p>
  }

  const visibleNotes = notes
    .filter((n) => !categoryFilter || n.category === categoryFilter)
    .filter((n) => !searchTerm.trim() || n.body.toLowerCase().includes(searchTerm.trim().toLowerCase()))

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Teacher&rsquo;s Corner</h1>
          <p className="muted" style={{ margin: 0 }}>
            A space just for you — ideas, what went well, what to change. Never shown to anyone else, never printed.
          </p>
        </div>
      </div>

      <section className="card stack">
        <form onSubmit={handleAdd} className="stack">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="note-category">Category</label>
            <select id="note-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ maxWidth: 220 }}>
              {TEACHER_NOTE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
          />
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!body.trim() || saving}>
            {saving ? 'Saving…' : 'Add note'}
          </button>
        </form>
      </section>

      <div className="field no-print" style={{ maxWidth: 320, marginBottom: 0 }}>
        <label htmlFor="note-search">Search</label>
        <input
          id="note-search"
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search your notes…"
        />
      </div>

      <div className="tag-row no-print">
        <button
          type="button"
          className={categoryFilter === '' ? 'tag' : 'tag tag-outline'}
          onClick={() => setCategoryFilter('')}
        >
          All
        </button>
        {TEACHER_NOTE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            className={categoryFilter === c.value ? 'tag' : 'tag tag-outline'}
            style={categoryFilter === c.value ? { background: c.color } : undefined}
            onClick={() => setCategoryFilter(c.value)}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {visibleNotes.length === 0 ? (
        <p className="muted">{notes.length === 0 ? 'Nothing here yet.' : 'No notes match.'}</p>
      ) : (
        <div className="stack">
          {visibleNotes.map((note) => {
            const cat = TEACHER_NOTE_CATEGORY_MAP[note.category] ?? TEACHER_NOTE_CATEGORY_MAP.idea
            const isEditing = editingId === note.id
            return (
              <div key={note.id} className="card">
                <div className="spread" style={{ marginBottom: 'var(--space-2)' }}>
                  <span className="tag" style={{ background: cat.color }}>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="utility muted">{formatShortDate(note.created_at.slice(0, 10))}</span>
                </div>
                {isEditing ? (
                  <div className="stack">
                    <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={3} />
                    <div className="row">
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
                    <p style={{ margin: '0 0 var(--space-2)' }}>{note.body}</p>
                    <div className="row">
                      <button
                        className="obs-table__link"
                        onClick={() => {
                          setEditingId(note.id)
                          setEditingBody(note.body)
                        }}
                      >
                        edit
                      </button>
                      <button className="obs-table__link obs-table__link--danger" onClick={() => handleDelete(note)}>
                        delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {toastNode}
    </div>
  )
}
