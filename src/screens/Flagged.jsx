import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { formatShortDate } from '../lib/format'

// R3.5.3 — flag a note as "revisit" and see all flagged notes in one place.
export default function Flagged() {
  const [schoolYear, setSchoolYear] = useState(null)
  const [flagged, setFlagged] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const year = await api.getCurrentSchoolYear()
    setSchoolYear(year)
    if (year) {
      const rows = await api.listFlaggedObservations(year.id)
      setFlagged(rows)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function unflag(obs) {
    await api.toggleObservationFlag(obs.id, false)
    setFlagged((list) => list.filter((o) => o.id !== obs.id))
  }

  if (loading) return <p className="muted">Loading…</p>

  return (
    <div className="stack">
      <h1>Flagged for revisit</h1>
      {flagged.length === 0 ? (
        <p className="muted">Nothing flagged right now.</p>
      ) : (
        <div className="stack">
          {flagged.map((obs) => (
            <div key={obs.id} className="card stack">
              <div className="spread">
                <Link to={`/students/${obs.student_id}`}>
                  <strong>
                    {obs.students?.first_name} {obs.students?.last_initial}.
                  </strong>
                </Link>
                <span className="utility muted">{formatShortDate(obs.observed_on)}</span>
              </div>
              <p style={{ margin: 0 }}>{obs.body}</p>
              <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => unflag(obs)}>
                Unflag
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
