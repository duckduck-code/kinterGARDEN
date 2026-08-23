import { useState } from 'react'
import { useAuth } from '../lib/useAuth.jsx'
import { enablePreviewMode, previewAllowed } from '../lib/mockData'
import Butterfly, { SparkleIcon } from '../components/Butterfly.jsx'
import '../styles/login.css'

// Full glitter Y2K treatment, desktop-only — this screen is used once in a
// while, not standing up in a classroom, so unlike the rest of the app it
// gets to be as loud as it wants.
const DECOR_BUTTERFLIES = [
  { top: '8%', left: '10%', size: 110, rot: -18, duration: 7, delay: 0 },
  { top: '15%', left: '85%', size: 90, rot: 12, duration: 8, delay: 0.6 },
  { top: '78%', left: '6%', size: 130, rot: 10, duration: 9, delay: 1.1 },
  { top: '72%', left: '88%', size: 100, rot: -12, duration: 6.5, delay: 0.3 },
  { top: '45%', left: '3%', size: 60, rot: 20, duration: 7.5, delay: 1.6 },
  { top: '5%', left: '48%', size: 50, rot: -8, duration: 6, delay: 0.9 },
]

const SPARKLES = [
  { top: '20%', left: '22%', size: 22, delay: 0 },
  { top: '30%', left: '75%', size: 16, delay: 0.5 },
  { top: '60%', left: '18%', size: 18, delay: 1 },
  { top: '65%', left: '80%', size: 24, delay: 1.4 },
  { top: '10%', left: '60%', size: 14, delay: 0.8 },
  { top: '88%', left: '40%', size: 20, delay: 1.8 },
  { top: '40%', left: '92%', size: 16, delay: 0.3 },
  { top: '85%', left: '65%', size: 14, delay: 1.2 },
]

export default function Login() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    const { error } = await signInWithEmail(email.trim())
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__glitter" />

      {DECOR_BUTTERFLIES.map((b, i) => (
        <div
          key={i}
          className="login-butterfly"
          style={{
            top: b.top,
            left: b.left,
            '--rot': `${b.rot}deg`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <Butterfly size={b.size} gradient />
        </div>
      ))}

      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="login-sparkle"
          style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }}
        >
          <SparkleIcon size={s.size} />
        </div>
      ))}

      <div className="login-content">
        <h1 className="login-welcome">Welcome</h1>
        <p className="login-tagline">Kindergarten 2026–2027</p>

        {status === 'sent' ? (
          <div className="stack" style={{ textAlign: 'center' }}>
            <p className="login-sent-text">
              Check <strong>{email}</strong> for a sign-in link. Tap it on this device to continue.
            </p>
            <button className="btn btn-ghost" style={{ color: 'var(--white)' }} onClick={() => setStatus('idle')}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="field" style={{ textAlign: 'left', marginBottom: 0 }}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </div>
            {status === 'error' && (
              <p style={{ color: 'var(--white)', background: 'rgba(209,53,90,0.85)', borderRadius: 12, padding: '8px 14px' }}>
                {errorMsg}
              </p>
            )}
            <button type="submit" className="btn login-btn" disabled={status === 'sending'}>
              <Butterfly size={28} />
              {status === 'sending' ? 'Sending link…' : 'Sign in'}
            </button>
            <p className="login-tagline" style={{ fontSize: '0.85rem', margin: 0 }}>
              No password needed. Accounts are set up by invitation only.
            </p>
          </form>
        )}

        {previewAllowed() && (
          <button
            type="button"
            onClick={enablePreviewMode}
            className="login-tagline"
            style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', marginTop: 24, opacity: 0.85 }}
          >
            {import.meta.env.DEV ? 'Skip login — preview with sample data (dev only)' : 'Try a demo with sample data'}
          </button>
        )}
      </div>
    </div>
  )
}
