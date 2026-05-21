'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import Nav from '@/components/Nav'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [editConfig, setEditConfig] = useState<Record<string, string>>({})
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([])
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalSellers: 0 })
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store',
      })

      if (res.status === 401) { setUnauthorized(true); setLoading(false); return }

      const data = await res.json()

      const cfgMap: Record<string, string> = {}
      data.config?.forEach((r: any) => { cfgMap[r.key] = r.value })
      setConfig(cfgMap)
      setEditConfig(cfgMap)
      setPendingPayouts(data.pendingPayouts || [])
      setStats({
        totalRevenue: data.orders?.reduce((s: number, o: any) => s + (o.platform_fee || 0), 0) || 0,
        totalOrders: data.orders?.length || 0,
        totalSellers: data.sellerCount || 0,
      })

      setLoading(false)
    }
    load()
  }, [])

  async function saveConfig(key: string) {
    setSavingKey(key)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/update-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ key, value: editConfig[key] }),
    })
    setConfig(prev => ({ ...prev, [key]: editConfig[key] }))
    setSavingKey(null)
  }

  async function markPaid(payout: any) {
    const name = payout.profiles?.display_name || payout.profiles?.username
    if (!confirm(`confirm you have manually transferred ${formatINR(payout.amount)} to ${name} via UPI/NEFT?`)) return
    setProcessingId(payout.id)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ payoutId: payout.id }),
    })
    const data = await res.json()
    if (data.success) {
      setPendingPayouts(prev => prev.filter(p => p.id !== payout.id))
    } else {
      alert(`failed: ${data.error}`)
    }
    setProcessingId(null)
  }

  const configLabels: Record<string, string> = {
    platform_fee_percent: 'Platform fee %',
    min_payout_amount: 'Min payout (paise)',
    payout_day: 'Payout day',
    payouts_enabled: 'Payouts enabled',
  }

  if (loading) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        loading...
      </div>
    </div>
  )

  if (unauthorized) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#f87171' }}>access denied</p>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>check ADMIN_USER_ID in .env.local</p>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <p className="section-label">// admin</p>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 36 }}>
          admin panel
        </h1>

        {/* ── Stats ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'platform revenue', value: formatINR(stats.totalRevenue) },
            { label: 'total orders', value: stats.totalOrders },
            { label: 'total sellers', value: stats.totalSellers },
          ].map(({ label, value }) => (
            <div key={label} className="card">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Platform config ─────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 16 }}>
            // platform settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(editConfig).map(([key, val]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 8, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {configLabels[key] || key}
                  </p>
                </div>
                <input
                  className="input" style={{ maxWidth: 200 }}
                  value={val}
                  onChange={e => setEditConfig(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <button
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: 12, opacity: editConfig[key] === config[key] ? 0.4 : 1 }}
                  onClick={() => saveConfig(key)}
                  disabled={savingKey === key || editConfig[key] === config[key]}
                >
                  {savingKey === key ? '...' : 'save'}
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
            min_payout_amount is in paise · 10000 = ₹100
          </p>
        </div>

        {/* ── Pending payouts ─────────────────────── */}
        <div>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 16 }}>
            // pending payouts ({pendingPayouts.length})
          </h2>
          {pendingPayouts.length === 0 ? (
            <div style={{
              padding: '32px', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-dim)',
              border: '1px solid var(--border)', borderRadius: 8,
            }}>
              no pending payouts 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingPayouts.map(p => (
                <div key={p.id} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <p style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                        {p.profiles?.display_name || p.profiles?.username}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>name: {p.payout_accounts?.account_holder_name}</p>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>account: {p.payout_accounts?.account_number}</p>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>IFSC: {p.payout_accounts?.ifsc_code}</p>
                        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                          requested {new Date(p.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                        {formatINR(p.amount)}
                      </span>
                      <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
                        transfer via UPI/NEFT first,<br />then mark as paid
                      </p>
                      <button
                        className="btn-primary"
                        style={{ fontSize: 13, padding: '10px 20px', opacity: processingId === p.id ? 0.5 : 1 }}
                        onClick={() => markPaid(p)}
                        disabled={processingId === p.id}
                      >
                        {processingId === p.id ? 'saving...' : '✓ mark as paid'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}