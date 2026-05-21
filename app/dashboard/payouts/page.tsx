'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import Nav from '@/components/Nav'

export default function PayoutsPage() {
  const [balance, setBalance] = useState(0)
  const [account, setAccount] = useState<any>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [minPayout, setMinPayout] = useState(10000)

  const [holderName, setHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccount, setConfirmAccount] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [bankName, setBankName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: balData } = await supabase.rpc('get_seller_balance', { p_seller_id: user.id })
      setBalance(balData || 0)

      const { data: acc } = await supabase
        .from('payout_accounts').select('*').eq('seller_id', user.id).maybeSingle()
      if (acc) {
        setAccount(acc)
        setHolderName(acc.account_holder_name)
        setAccountNumber(acc.account_number)
        setConfirmAccount(acc.account_number)
        setIfsc(acc.ifsc_code)
        setBankName(acc.bank_name || '')
      }

      const { data: pays } = await supabase
        .from('payouts').select('*').eq('seller_id', user.id)
        .order('requested_at', { ascending: false }).limit(10)
      setPayouts(pays || [])

      const { data: txns } = await supabase
        .from('balance_transactions').select('*').eq('seller_id', user.id)
        .order('created_at', { ascending: false }).limit(10)
      setTransactions(txns || [])

      const { data: cfg } = await supabase
        .from('platform_config').select('value').eq('key', 'min_payout_amount').single()
      if (cfg) setMinPayout(parseInt(cfg.value))

      setLoading(false)
    }
    load()
  }, [])

  async function refetchBalanceAndPayouts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: balData } = await supabase.rpc('get_seller_balance', { p_seller_id: user.id })
    setBalance(balData || 0)
    const { data: pays } = await supabase
      .from('payouts').select('*').eq('seller_id', user.id)
      .order('requested_at', { ascending: false }).limit(10)
    setPayouts(pays || [])
    const { data: txns } = await supabase
      .from('balance_transactions').select('*').eq('seller_id', user.id)
      .order('created_at', { ascending: false }).limit(10)
    setTransactions(txns || [])
  }

  async function saveAccount() {
    if (!holderName || !accountNumber || !ifsc) return setError('all fields except bank name are required')
    if (accountNumber !== confirmAccount) return setError('account numbers do not match')
    if (ifsc.length !== 11) return setError('IFSC code must be 11 characters')

    setSaving(true)
    setError('')
    setSuccess('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      seller_id: user.id,
      account_holder_name: holderName,
      account_number: accountNumber,
      ifsc_code: ifsc.toUpperCase(),
      bank_name: bankName || null,
      updated_at: new Date().toISOString(),
    }

    const { error: err } = account
      ? await supabase.from('payout_accounts').update(payload).eq('seller_id', user.id)
      : await supabase.from('payout_accounts').insert(payload)

    if (err) {
      setError(err.message)
    } else {
      setSuccess('bank account saved successfully')
      setAccount(payload)
    }
    setSaving(false)
  }

  async function requestPayout() {
    setRequesting(true)
    setError('')
    setSuccess('')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/request-payout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setSuccess('payout requested! you\'ll see it in your payout history below.')
      await refetchBalanceAndPayouts()
    }
    setRequesting(false)
  }

  const hasPendingPayout = payouts.some(p => p.status === 'pending')

  const statusColor = (status: string) => {
    if (status === 'paid') return 'var(--accent)'
    if (status === 'failed') return '#f87171'
    if (status === 'pending') return '#f59e0b'
    return 'var(--text-muted)'
  }

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
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← dashboard
          </a>
        </div>

        <p className="section-label">// payouts</p>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 36 }}>
          earnings & payouts
        </h1>

        {/* ── Balance card ─────────────────────────── */}
        <div style={{
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-border)',
          borderRadius: 10,
          padding: '28px 24px',
          marginBottom: 32,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 6, letterSpacing: '0.08em' }}>
                PENDING BALANCE
              </p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>
                {formatINR(balance)}
              </p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                automatically paid every Monday · min {formatINR(minPayout)}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              {hasPendingPayout ? (
                <div className="tag">payout requested ✓</div>
              ) : balance < minPayout ? (
                <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                  need {formatINR(minPayout - balance)} more<br />for payout
                </p>
              ) : !account ? (
                <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: '#f87171', textAlign: 'right' }}>
                  add bank account<br />to request payout
                </p>
              ) : (
                <button
                  className="btn-primary"
                  style={{ fontSize: 13, padding: '10px 20px' }}
                  onClick={requestPayout}
                  disabled={requesting}
                >
                  {requesting ? 'requesting...' : 'request payout →'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Error / success ──────────────────────── */}
        {error && <p className="msg-error" style={{ marginBottom: 20 }}>{error}</p>}
        {success && <p className="msg-success" style={{ marginBottom: 20 }}>{success}</p>}

        {/* ── Bank account ─────────────────────────── */}
        <div className="card" style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 24 }}>
            // bank account {account ? '(saved ✓)' : '(not set up)'}
          </h2>

          {!account && (
            <p className="msg-error" style={{ marginBottom: 20 }}>
              ⚠ add your bank account to receive payouts
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                account holder name (as per bank records)
              </label>
              <input className="input" type="text" placeholder="e.g. Arjun Sharma" value={holderName} onChange={e => setHolderName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                account number
              </label>
              <input className="input" type="password" placeholder="enter account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} autoComplete="off" />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                confirm account number
              </label>
              <input className="input" type="text" placeholder="re-enter account number" value={confirmAccount} onChange={e => setConfirmAccount(e.target.value)} autoComplete="off" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>IFSC code</label>
                <input className="input" type="text" placeholder="e.g. SBIN0001234" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>bank name (optional)</label>
                <input className="input" type="text" placeholder="e.g. State Bank of India" value={bankName} onChange={e => setBankName(e.target.value)} />
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 20, fontSize: 14, padding: '13px' }}
            onClick={saveAccount}
            disabled={saving}
          >
            {saving ? 'saving...' : account ? 'update bank account →' : 'save bank account →'}
          </button>

          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
            your account details are stored securely and never shared
          </p>
        </div>

        {/* ── Recent earnings ──────────────────────── */}
        {transactions.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 16 }}>
              // recent earnings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map(t => (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontFamily: 'var(--mono)', fontSize: 13, flexWrap: 'wrap', gap: 8,
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t.description}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: t.type === 'credit' ? 'var(--accent)' : '#f87171', fontWeight: 700 }}>
                      {t.type === 'credit' ? '+' : '-'}{formatINR(t.amount)}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payout history ───────────────────────── */}
        <div>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 16 }}>
            // payout history
          </h2>
          {payouts.length === 0 ? (
            <div style={{
              padding: '32px', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)',
              border: '1px solid var(--border)', borderRadius: 8,
            }}>
              no payouts yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payouts.map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontFamily: 'var(--mono)', fontSize: 13, flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: statusColor(p.status), fontSize: 11 }}>● {p.status}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {new Date(p.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>{formatINR(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}