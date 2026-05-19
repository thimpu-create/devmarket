'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import Nav from '@/components/Nav'

export default function SellerStorePage({ params }: { params: { username: string } }) {
  const [seller, setSeller] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', params.username)
        .single()

      if (!profile) { setLoading(false); return }
      setSeller(profile)

      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      setProducts(prods || [])
      setLoading(false)
    }
    load()
  }, [params.username])

  if (loading) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontSize: 13 }}>
        loading...
      </div>
    </div>
  )

  if (!seller) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
          no seller found at /{params.username}
        </p>
        <Link href="/">
          <button className="btn-ghost">← back home</button>
        </Link>
      </div>
    </div>
  )

  const totalSales = products.reduce((sum, p) => sum + (p.sales_count || 0), 0)

  return (
    <div className="page">
      <Nav />

      {/* ── Seller header ─────────────────────────────── */}
      <section style={{
        borderBottom: '1px solid var(--border)',
        padding: '48px 24px 40px',
      }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              {/* Avatar placeholder */}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--mono)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: 16,
              }}>
                {(seller.display_name || seller.username).charAt(0).toUpperCase()}
              </div>

              <h1 style={{
                fontFamily: 'var(--sans)',
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: 6,
              }}>
                {seller.display_name || seller.username}
              </h1>

              <p style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                color: 'var(--text-dim)',
                marginBottom: seller.bio ? 12 : 0,
              }}>
                devmarket.in/{seller.username}
              </p>

              {seller.bio && (
                <p style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  maxWidth: 480,
                  lineHeight: 1.65,
                }}>
                  {seller.bio}
                </p>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {products.length}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  products
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
                  {totalSales}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  sales
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Products grid ─────────────────────────────── */}
      <section style={{ padding: '48px 24px', flex: 1 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          {products.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 24px',
              fontFamily: 'var(--mono)',
              color: 'var(--text-dim)',
              fontSize: 13,
            }}>
              no products yet
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/${seller.username}/${product.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="card-hover" style={{ height: '100%' }}>
                    {product.cover_url && (
                      <img
                        src={product.cover_url}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                          borderRadius: 6,
                          marginBottom: 16,
                          background: 'var(--surface-2)',
                        }}
                      />
                    )}

                    {!product.cover_url && (
                      <div style={{
                        width: '100%',
                        height: 120,
                        background: 'var(--surface-2)',
                        borderRadius: 6,
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--text-dim)',
                        letterSpacing: '0.05em',
                      }}>
                        {product.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                      </div>
                    )}

                    <div className="tag" style={{ marginBottom: 10, fontSize: 10 }}>digital product</div>

                    <h2 style={{
                      fontFamily: 'var(--sans)',
                      fontSize: 17,
                      fontWeight: 700,
                      marginBottom: 8,
                      lineHeight: 1.3,
                      letterSpacing: '-0.01em',
                    }}>
                      {product.name}
                    </h2>

                    {product.description && (
                      <p style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        marginBottom: 16,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 18,
                        fontWeight: 700,
                        color: 'var(--accent)',
                      }}>
                        {formatINR(product.price)}
                      </span>
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}>
                        {product.sales_count} sold
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <span style={{ color: 'var(--text-dim)' }}>
          {seller.display_name || seller.username} on devmarket
        </span>
        <Link href="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 11 }}>
          powered by devmarket 🇮🇳
        </Link>
      </footer>
    </div>
  )
}