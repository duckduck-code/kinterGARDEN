import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { useAuth } from './lib/useAuth.jsx'
import { isPreviewMode, disablePreviewMode } from './lib/mockData'
import Butterfly from './components/Butterfly.jsx'
import Login from './screens/Login.jsx'
import NotAuthorized from './screens/NotAuthorized.jsx'
import ClassOverview from './screens/ClassOverview.jsx'
import StudentProfile from './screens/StudentProfile.jsx'
import RoundsMode from './screens/RoundsMode.jsx'
import Reports from './screens/Reports.jsx'
import Settings from './screens/Settings.jsx'
import Flagged from './screens/Flagged.jsx'
import MyNotes from './screens/MyNotes.jsx'

export default function App() {
  const { isLoading, isAuthenticated, isAuthorized } = useAuth()
  const preview = isPreviewMode()

  if (!preview) {
    if (isLoading) {
      return (
        <div className="center-screen">
          <p className="muted">Loading…</p>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      )
    }

    if (!isAuthorized) {
      return (
        <Routes>
          <Route path="*" element={<NotAuthorized />} />
        </Routes>
      )
    }
  }

  return (
    <div className="app-shell">
      {preview && (
        <div className="preview-banner no-print">
          Preview mode — sample data only, nothing is saved to Supabase.
          <button className="btn btn-ghost" onClick={disablePreviewMode}>
            Exit preview
          </button>
        </div>
      )}
      <AppHeader preview={preview} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ClassOverview />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/rollcall" element={<RoundsMode />} />
          <Route path="/rounds" element={<Navigate to="/rollcall" replace />} />
          <Route path="/flagged" element={<Flagged />} />
          <Route path="/my-notes" element={<MyNotes />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AppHeader({ preview }) {
  const { signOut } = useAuth()
  return (
    <header className="app-header no-print">
      <NavLink to="/" className="app-header__title">
        <Butterfly size={26} />
        kinterGARDEN
      </NavLink>
      <nav>
        <NavLink to="/rollcall">Roll Call</NavLink>
        <NavLink to="/flagged">Flagged</NavLink>
        <NavLink to="/my-notes">My Notes</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        <button onClick={preview ? disablePreviewMode : signOut}>{preview ? 'Exit preview' : 'Sign out'}</button>
      </nav>
    </header>
  )
}
