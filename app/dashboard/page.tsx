'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import Link from 'next/link'
import Nav from '@/components/Nav'

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Auth guard — redirect to login if not logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: prods } = await supabase
        .from('products').select('*').eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      setProducts(prods || [])

      if (prods?.length) {
        const { data: ords } = await supabase
          .from('orders').select('*, products(name)')
          .in('product_id', prods.map((p: any) => p.id))
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(20)
        setOrders(ords || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function togglePublish(product: any) {
    setTogglingId(product.id)
    const { error } = await supabase
      .from('products')
      .update({ is_published: !product.is_published })
      .eq('id', product.id)

    if (!error) {
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_published: !p.is_published } : p
      ))
    }
    setTogglingId(null)
  }

  async function deleteProduct(id: string) {
    if (!confirm('delete this product? this cannot be undone.')) return
    setDeletingId(id)
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0)

  if (loading) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        loading dashboard...
      </div>
    </div>
  )

  return (
    <div className="page">
      <Nav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p className="section-label">// dashboard</p>
            <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {profile?.display_name || profile?.username}
            </h1>
            <a
              href={`/${profile?.username}`}
              target="_blank"
              style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              devmarket.in/{profile?.username} ↗
            </a>
          </div>
          <button
            className="btn-ghost"
            style={{ fontSize: 12, padding: '8px 16px' }}
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          >
            sign out
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 40 }}>
          {[
            { label: 'total revenue', value: formatINR(totalRevenue) },
            { label: 'total sales', value: orders.length },
            { label: 'products', value: products.length },
            { label: 'published', value: products.filter(p => p.is_published).length },
          ].map(({ label, value }) => (
            <div key={label} className="card">
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Products ───────────────────────────────── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>// products</h2>
            <Link href="/dashboard/new-product">
              <button className="btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>+ new product</button>
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                no products yet
              </p>
              <Link href="/dashboard/new-product">
                <button className="btn-primary">upload your first product →</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.map((p) => (
                <div key={p.id} className="card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '16px 20px',
                }}>
                  {/* Product info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatINR(p.price)} · {p.sales_count} sold
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>

                    {/* Publish toggle */}
                    <div
                      onClick={() => !togglingId && togglePublish(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        cursor: togglingId === p.id ? 'wait' : 'pointer',
                        transition: 'opacity 0.15s',
                        opacity: togglingId === p.id ? 0.5 : 1,
                      }}
                    >
                      {/* Toggle pill */}
                      <div style={{
                        width: 32,
                        height: 18,
                        borderRadius: 9,
                        background: p.is_published ? 'var(--accent)' : 'var(--border)',
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 2,
                          left: p.is_published ? 14 : 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: p.is_published ? '#000' : 'var(--text-dim)',
                          transition: 'left 0.2s',
                        }} />
                      </div>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: p.is_published ? 'var(--accent)' : 'var(--text-dim)',
                        minWidth: 28,
                      }}>
                        {togglingId === p.id ? '...' : p.is_published ? 'live' : 'draft'}
                      </span>
                    </div>

                    {/* Edit */}
                    <Link href={`/dashboard/edit/${p.id}`}>
                      <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                        edit
                      </button>
                    </Link>

                    {/* Delete */}
                    <button
                      className="btn-ghost"
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        color: '#f87171',
                        borderColor: 'rgba(248,113,113,0.2)',
                        opacity: deletingId === p.id ? 0.5 : 1,
                      }}
                      onClick={() => deleteProduct(p.id)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? '...' : 'delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent sales ───────────────────────────── */}
        <div>
          <h2 style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginBottom: 16 }}>
            // recent sales
          </h2>
          {orders.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 13,
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}>
              no sales yet — share your store link to get your first sale
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map((o) => (
                <div key={o.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>{o.buyer_email}</span>
                    {o.products?.name && (
                      <span style={{ color: 'var(--text-dim)', marginLeft: 12, fontSize: 11 }}>
                        {o.products.name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>+{formatINR(o.amount)}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
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