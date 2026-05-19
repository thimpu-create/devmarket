'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function LoginPage() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/dashboard'
    })
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email || !password) return setError('enter your email and password')
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="page">
      <Nav />
      <div className="auth-wrap">
        <div className="auth-box animate-fade-up">
          <div style={{ marginBottom: 32 }}>
            <p className="section-label">// welcome back</p>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
              log in
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <input
              className="input"
              type="password"
              placeholder="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && <p className="msg-error" style={{ marginTop: 12 }}>{error}</p>}

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 20, fontSize: 14, padding: '13px' }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'logging in...' : 'log in →'}
          </button>

          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text-dim)',
            textAlign: 'center',
            marginTop: 24,
          }}>
            no account?{' '}
            <Link href="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}