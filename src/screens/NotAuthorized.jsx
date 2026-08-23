import { useAuth } from '../lib/useAuth.jsx'

export default function NotAuthorized() {
  const { user, signOut } = useAuth()

  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <h1>Not authorized</h1>
        <p>
          <strong>{user?.email}</strong> signed in successfully, but isn't on the list of people who can use this
          app. This tracker only ever has two accounts, set up by hand in the Supabase dashboard.
        </p>
        <p className="muted">If this should be you, ask the app owner to add your profile row.</p>
        <button className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
