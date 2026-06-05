'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

type Tab = 'profile' | 'account' | 'payout'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Profile tab
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Account tab
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Payout tab
  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccount, setConfirmAccount] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [bankName, setBankName] = useState('')
  const [payoutAccount, setPayoutAccount] = useState<any>(null)
  const [savingPayout, setSavingPayout] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      setNewEmail(user.email || '')

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      if (prof) {
        setProfile(prof)
        setDisplayName(prof.display_name || '')
        setUsername(prof.username || '')
        setBio(prof.bio || '')
        setAvatarUrl(prof.avatar_url || null)
        setAvatarPreview(prof.avatar_url || null)
      }

      const { data: acc } = await supabase
        .from('payout_accounts').select('*').eq('seller_id', user.id).maybeSingle()
      if (acc) {
        setPayoutAccount(acc)
        setHolderName(acc.account_holder_name)
        setAccountNumber(acc.account_number)
        setConfirmAccount(acc.account_number)
        setIfsc(acc.ifsc_code)
        setBankName(acc.bank_name || '')
      }

      setLoading(false)
    }
    load()
  }, [])

  function clearMessages() { setError(''); setSuccess('') }

  // ── Profile save ─────────────────────────────────────
  async function saveProfile() {
    if (!displayName) return setError('display name is required')
    if (username.length < 3) return setError('username must be at least 3 characters')
    clearMessages()
    setSavingProfile(true)

    try {
      // Check username if changed
      if (username !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('username', username).maybeSingle()
        if (existing) { setError('username already taken'); setSavingProfile(false); return }
      }

      // Upload avatar if changed
      let newAvatarUrl = avatarUrl
      if (avatarFile) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('not logged in')

        const res = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileName: `avatar_${avatarFile.name}`, fileType: avatarFile.type }),
        })
        const { uploadUrl, fileKey } = await res.json()
        await fetch(uploadUrl, { method: 'PUT', body: avatarFile, headers: { 'Content-Type': avatarFile.type } })
        newAvatarUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}`
      }

      const { error: err } = await supabase
        .from('profiles')
        .update({ display_name: displayName, username, bio, avatar_url: newAvatarUrl })
        .eq('id', user.id)

      if (err) throw err
      setAvatarUrl(newAvatarUrl)
      setSuccess('profile updated successfully')
    } catch (err: any) {
      setError(err.message || 'something went wrong')
    }
    setSavingProfile(false)
  }

  // ── Password reset ────────────────────────────────────
  async function sendPasswordReset() {
    clearMessages()
    setSavingPassword(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/dashboard/settings/reset-password`,
    })
    if (err) { setError(err.message) } else { setResetSent(true) }
    setSavingPassword(false)
  }

  async function updatePassword() {
    if (!newPassword) return setError('enter a new password')
    if (newPassword.length < 8) return setError('password must be at least 8 characters')
    if (newPassword !== confirmPassword) return setError('passwords do not match')
    clearMessages()
    setSavingPassword(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    if (err) { setError(err.message) } else {
      setSuccess('password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  // ── Payout account save ───────────────────────────────
  async function savePayout() {
    if (!holderName || !accountNumber || !ifsc) return setError('all fields except bank name are required')
    if (accountNumber !== confirmAccount) return setError('account numbers do not match')
    if (ifsc.length !== 11) return setError('IFSC code must be 11 characters')
    clearMessages()
    setSavingPayout(true)

    const payload = {
      seller_id: user.id,
      account_holder_name: holderName,
      account_number: accountNumber,
      ifsc_code: ifsc.toUpperCase(),
      bank_name: bankName || null,
      updated_at: new Date().toISOString(),
    }

    const { error: err } = payoutAccount
      ? await supabase.from('payout_accounts').update(payload).eq('seller_id', user.id)
      : await supabase.from('payout_accounts').insert(payload)

    if (err) { setError(err.message) } else {
      setSuccess('bank account saved successfully')
      setPayoutAccount(payload)
    }
    setSavingPayout(false)
  }

  const tabStyle = (t: Tab) => ({
    fontFamily: 'var(--mono)',
    fontSize: 13,
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: tab === t ? 'var(--surface-2)' : 'transparent',
    color: tab === t ? 'var(--text)' : 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const label = (text: string) => (
    <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
      {text}
    </label>
  )

  if (loading) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        loading...
      </div>
    </div>
  )

  return (
    <div className="page">
      <Nav />
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Header ───────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <a href="/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← dashboard
          </a>
        </div>

        <p className="section-label">// settings</p>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 32 }}>
          account settings
        </h1>

        {/* ── Tabs ─────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 32,
          padding: 4, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          width: 'fit-content',
        }}>
          <button style={tabStyle('profile')} onClick={() => { setTab('profile'); clearMessages() }}>profile</button>
          <button style={tabStyle('account')} onClick={() => { setTab('account'); clearMessages() }}>account</button>
          <button style={tabStyle('payout')} onClick={() => { setTab('payout'); clearMessages() }}>payout</button>
        </div>

        {/* ── Messages ─────────────────────────────── */}
        {error && <p className="msg-error" style={{ marginBottom: 20 }}>{error}</p>}
        {success && <p className="msg-success" style={{ marginBottom: 20 }}>{success}</p>}

        {/* ── Profile tab ──────────────────────────── */}
        {tab === 'profile' && (
          <div className="card">
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 24 }}>
              // public profile
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Avatar */}
              <div>
                {label('profile picture')}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 72, height: 72, borderRadius: 10,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => document.getElementById('avatar-input')?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
                        {(displayName || username || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input
                    id="avatar-input" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                    }}
                  />
                  <div>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: '7px 14px' }}
                      onClick={() => document.getElementById('avatar-input')?.click()}
                    >
                      upload photo
                    </button>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                      JPG or PNG · shown on your store
                    </p>
                  </div>
                </div>
              </div>

              {/* Display name */}
              <div>
                {label('display name')}
                <input className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Arjun Sharma" />
              </div>

              {/* Username */}
              <div>
                {label('username')}
                <div style={{ position: 'relative' }}>
                  <input
                    className="input" type="text" value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30))}
                    style={{ paddingLeft: 130 }}
                  />
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', pointerEvents: 'none',
                  }}>
                    devmarket.in/
                  </span>
                </div>
              </div>

              {/* Bio */}
              <div>
                {label('bio')}
                <textarea
                  className="input" rows={3}
                  placeholder="tell buyers about yourself and what you build..."
                  value={bio} onChange={e => setBio(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button
                className="btn-primary"
                style={{ fontSize: 14, padding: '13px' }}
                onClick={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? 'saving...' : 'save profile →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Account tab ──────────────────────────── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div className="card">
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 20 }}>
                // email address
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {label('current email')}
                <input className="input" type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  contact support to change your email address
                </p>
              </div>
            </div>

            {/* Password */}
            <div className="card">
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 20 }}>
                // password
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  className="input" type="password"
                  placeholder="new password (min 8 characters)"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  className="input" type="password"
                  placeholder="confirm new password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  className="btn-primary"
                  style={{ fontSize: 14, padding: '13px' }}
                  onClick={updatePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? 'updating...' : 'update password →'}
                </button>

                <div className="divider" />

                {resetSent ? (
                  <p className="msg-success">
                    reset link sent to {user?.email} — check your inbox
                  </p>
                ) : (
                  <div>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      forgot your current password?
                    </p>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 13, padding: '10px 20px' }}
                      onClick={sendPasswordReset}
                      disabled={savingPassword}
                    >
                      send password reset email
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Danger zone */}
            <div className="card" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#f87171', fontWeight: 400, marginBottom: 16 }}>
                // danger zone
              </h2>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                signing out will end your current session on this device.
              </p>
              <button
                className="btn-ghost"
                style={{ fontSize: 13, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)', padding: '10px 20px' }}
                onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
              >
                sign out
              </button>
            </div>
          </div>
        )}

        {/* ── Payout tab ───────────────────────────── */}
        {tab === 'payout' && (
          <div className="card">
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 24 }}>
              // bank account {payoutAccount ? '(saved ✓)' : '(not set up)'}
            </h2>

            {!payoutAccount && (
              <p className="msg-error" style={{ marginBottom: 20 }}>
                ⚠ add your bank account to receive payouts
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {label('account holder name (as per bank records)')}
                <input className="input" type="text" placeholder="e.g. Arjun Sharma" value={holderName} onChange={e => setHolderName(e.target.value)} />
              </div>
              <div>
                {label('account number')}
                <input className="input" type="password" placeholder="enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} autoComplete="off" />
              </div>
              <div>
                {label('confirm account number')}
                <input className="input" type="text" placeholder="re-enter account number" value={confirmAccount} onChange={e => setConfirmAccount(e.target.value)} autoComplete="off" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  {label('IFSC code')}
                  <input className="input" type="text" placeholder="e.g. SBIN0001234" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
                </div>
                <div>
                  {label('bank name (optional)')}
                  <input className="input" type="text" placeholder="e.g. State Bank of India" value={bankName} onChange={e => setBankName(e.target.value)} />
                </div>
              </div>
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 20, fontSize: 14, padding: '13px' }}
              onClick={savePayout}
              disabled={savingPayout}
            >
              {savingPayout ? 'saving...' : payoutAccount ? 'update bank account →' : 'save bank account →'}
            </button>

            <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
              your account details are stored securely and never shared
            </p>
          </div>
        )}

      </main>
    </div>
  )
}