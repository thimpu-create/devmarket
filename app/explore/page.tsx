'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'
import { CATEGORIES, getCategoryLabel } from '@/lib/categories'
import Nav from '@/components/Nav'

export default function ExplorePage() {
  const [products, setProducts] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'newest' | 'popular' | 'price_low' | 'price_high'>('newest')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('products')
        .select('*, profiles(username, display_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
      setProducts(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = [...products]

    if (category !== 'all') {
      result = result.filter(p => p.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.profiles?.display_name?.toLowerCase().includes(q) ||
        p.profiles?.username?.toLowerCase().includes(q) ||
        p.tech_stack?.some((t: string) => t.toLowerCase().includes(q))
      )
    }

    if (sort === 'popular') result.sort((a, b) => b.sales_count - a.sales_count)
    if (sort === 'price_low') result.sort((a, b) => a.price - b.price)
    if (sort === 'price_high') result.sort((a, b) => b.price - a.price)
    if (sort === 'newest') result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFiltered(result)
  }, [search, sort, category, products])

  return (
    <div className="page">
      <Nav />

      {/* ── Header ───────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)', padding: '48px 24px 36px' }}>
        <div className="container">
          <p className="section-label">// explore</p>
          <h1 style={{
            fontFamily: 'var(--sans)',
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 24,
          }}>
            browse products
          </h1>

          {/* Search + Sort */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              className="input"
              type="text"
              placeholder="search products, sellers, tech stack..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 13,
                padding: '11px 14px', borderRadius: 'var(--radius)', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="newest">newest first</option>
              <option value="popular">most popular</option>
              <option value="price_low">price: low to high</option>
              <option value="price_high">price: high to low</option>
            </select>
          </div>

          {/* Category filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setCategory('all')}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${category === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                background: category === 'all' ? 'var(--accent-dim)' : 'transparent',
                color: category === 'all' ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              all
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${category === c.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: category === c.value ? 'var(--accent-dim)' : 'transparent',
                  color: category === c.value ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ─────────────────────────────────────────── */}
      <section style={{ padding: '40px 24px', flex: 1 }}>
        <div className="container">

          {loading && (
            <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
              loading...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
              {search || category !== 'all' ? 'no results — try a different filter' : 'no products yet — be the first to sell!'}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                {category !== 'all' && ` in ${getCategoryLabel(category)}`}
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {filtered.map(product => (
                  <Link
                    key={product.id}
                    href={`/${product.profiles?.username}/${product.slug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                      {/* Cover */}
                      {product.cover_url ? (
                        <img
                          src={product.cover_url}
                          alt={product.name}
                          style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: 120, background: 'var(--surface-2)',
                          borderRadius: 6, marginBottom: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em',
                        }}>
                          {product.file_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                        </div>
                      )}

                      {/* Category + seller */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span className="tag" style={{ fontSize: 10 }}>
                          {getCategoryLabel(product.category || 'other')}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                          {product.profiles?.display_name || product.profiles?.username}
                        </span>
                      </div>

                      {/* Name */}
                      <h2 style={{
                        fontFamily: 'var(--sans)', fontSize: 17, fontWeight: 700,
                        letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 8,
                      }}>
                        {product.name}
                      </h2>

                      {/* Description */}
                      {product.description && (
                        <p style={{
                          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)',
                          lineHeight: 1.6, marginBottom: 12,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {product.description}
                        </p>
                      )}

                      {/* Tech stack badges */}
                      {product.tech_stack?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                          {product.tech_stack.slice(0, 4).map((tech: string) => (
                            <span key={tech} className="badge" style={{ fontSize: 10 }}>{tech}</span>
                          ))}
                          {product.tech_stack.length > 4 && (
                            <span className="badge" style={{ fontSize: 10 }}>+{product.tech_stack.length - 4}</span>
                          )}
                        </div>
                      )}

                      {/* Price + sales */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 'auto',
                      }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                          {formatINR(product.price)}
                        </span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                          {product.sales_count} sold
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="footer">
        <span>devmarket © 2025</span>
        <span>made in india 🇮🇳</span>
      </footer>
    </div>
  )
}