'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the token in the URL hash — getSession picks it up automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setError('invalid or expired reset link — request a new one from settings')
    })
  }, [])

  async function handleReset() {
    if (!password) return setError('enter a new password')
    if (password.length < 8) return setError('password must be at least 8 characters')
    if (password !== confirm) return setError('passwords do not match')
    setSaving(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message) } else { setDone(true) }
    setSaving(false)
  }

  if (done) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>password updated!</h2>
        <a href="/dashboard">
          <button className="btn-primary">go to dashboard →</button>
        </a>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Nav />
      <div className="auth-wrap">
        <div className="auth-box animate-fade-up">
          <p className="section-label">// reset password</p>
          <h1 style={{ fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 28 }}>
            set new password
          </h1>

          {!ready ? (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: error ? '#f87171' : 'var(--text-muted)' }}>
              {error || 'verifying reset link...'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input" type="password"
                placeholder="new password (min 8 characters)"
                value={password} onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <input
                className="input" type="password"
                placeholder="confirm new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
              {error && <p className="msg-error">{error}</p>}
              <button
                className="btn-primary"
                style={{ fontSize: 14, padding: '13px' }}
                onClick={handleReset}
                disabled={saving}
              >
                {saving ? 'updating...' : 'set new password →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}