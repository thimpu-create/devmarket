'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function sanitizeUsername(val: string) {
    return val.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30)
  }

  async function handleSignup() {
    if (!email || !password || !username) return setError('all fields are required')
    if (username.length < 3) return setError('username must be at least 3 characters')
    if (password.length < 8) return setError('password must be at least 8 characters')
    setLoading(true)
    setError('')

    // FIX 1: use maybeSingle() not single()
    // single() throws a 406 error when no row is found
    // maybeSingle() cleanly returns null when username doesn't exist
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existing) {
      setError('username already taken')
      setLoading(false)
      return
    }

    // FIX 2: pass emailRedirectTo so Supabase doesn't reject the request
    // Also go to Supabase dashboard → Auth → Email → disable "Confirm email"
    // so users can sign in immediately without checking their inbox
    const { data, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (authErr) {
      setError(authErr.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('signup failed — try again')
      setLoading(false)
      return
    }

    // Create profile row
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      display_name: displayName || username,
    })

    if (profileErr) {
      setError(profileErr.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div className="page">
      <Nav />
      <div className="auth-wrap">
        <div className="auth-box animate-fade-up" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginBottom: 12 }}>
            you're in!
          </h2>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Your store is live at{' '}
            <span style={{ color: 'var(--text)' }}>devmarket.in/{username}</span>.
            Head to your dashboard to upload your first product.
          </p>
          <a href="/dashboard">
            <button className="btn-primary" style={{ width: '100%', fontSize: 14, padding: '13px' }}>
              go to dashboard →
            </button>
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Nav />
      <div className="auth-wrap">
        <div className="auth-box animate-fade-up">
          <div style={{ marginBottom: 32 }}>
            <p className="section-label">// free forever</p>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
              create your store
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="text"
              placeholder="display name (e.g. Arjun Sharma)"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />

            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type="text"
                placeholder="username"
                value={username}
                onChange={e => setUsername(sanitizeUsername(e.target.value))}
                style={{ paddingLeft: 130 }}
              />
              <span style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--text-dim)',
                pointerEvents: 'none',
              }}>
                devmarket.in/
              </span>
            </div>

            <input
              className="input"
              type="email"
              placeholder="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="input"
              type="password"
              placeholder="password (min 8 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
            />
          </div>

          {error && <p className="msg-error" style={{ marginTop: 12 }}>{error}</p>}

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 20, fontSize: 14, padding: '13px' }}
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? 'creating account...' : 'create store →'}
          </button>

          <p style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-dim)',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 1.6,
          }}>
            free to start · 5% fee only on sales · no monthly cost
          </p>

          <div className="divider" />

          <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
            already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}