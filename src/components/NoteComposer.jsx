import { useEffect, useRef, useState } from 'react'
import StudentAvatar from './StudentAvatar.jsx'
import LevelPicker from './LevelPicker.jsx'
import DomainPicker from './DomainPicker.jsx'
import { useDraft } from '../lib/useDraft'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// R3.1 — quick capture. Opens focused with the keyboard up, autosaves a draft
// on every keystroke, and everything but the note body is optional.
export default function NoteComposer({ student, domains, units = [], existing, onSave, onCancel }) {
  const draftKey = existing ? `edit:${existing.id}` : `new:${student.id}`
  const [draft, setDraft, clearDraft] = useDraft(draftKey, {
    body: existing?.body ?? '',
    level: existing?.level ?? null,
    domainIds: existing?.domainIds ?? [],
    observedOn: existing?.observed_on ?? todayISO(),
    unitId: existing?.unit_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function update(patch) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  const availableUnits = units.filter((u) => draft.domainIds.includes(u.domain_id))

  useEffect(() => {
    if (draft.unitId && !availableUnits.some((u) => u.id === draft.unitId)) {
      update({ unitId: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.domainIds])

  async function handleSave() {
    if (!draft.body.trim()) {
      textareaRef.current?.focus()
      return
    }
    setSaving(true)
    try {
      await onSave({
        body: draft.body.trim(),
        level: draft.level,
        domainIds: draft.domainIds,
        observed_on: draft.observedOn,
        unit_id: draft.unitId || null,
      })
      clearDraft()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="composer-overlay" role="dialog" aria-modal="true" aria-label={`Note for ${student.first_name}`}>
      <div className="composer-panel card">
        <div className="spread" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="row">
            <StudentAvatar student={student} size={40} />
            <h2 style={{ margin: 0 }}>{student.first_name}</h2>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="field">
          <textarea
            ref={textareaRef}
            value={draft.body}
            onChange={(e) => update({ body: e.target.value })}
            placeholder="What did you notice? (tap the mic on your keyboard to dictate)"
            rows={5}
          />
        </div>

        <div className="field">
          <label>Growth level</label>
          <LevelPicker value={draft.level} onChange={(level) => update({ level })} />
        </div>

        {domains.length > 0 && (
          <div className="field">
            <label>Domains</label>
            <DomainPicker domains={domains} value={draft.domainIds} onChange={(domainIds) => update({ domainIds })} />
          </div>
        )}

        {availableUnits.length > 0 && (
          <div className="field">
            <label htmlFor="unit-id">Unit / lesson (optional)</label>
            <select id="unit-id" value={draft.unitId} onChange={(e) => update({ unitId: e.target.value })}>
              <option value="">No specific unit</option>
              {availableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="observed-on">Date</label>
          <input
            id="observed-on"
            type="date"
            value={draft.observedOn}
            onChange={(e) => update({ observedOn: e.target.value })}
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !draft.body.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
