'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [newCover, setNewCover] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .eq('seller_id', user.id) // make sure this seller owns this product
        .single()

      if (!product) { window.location.href = '/dashboard'; return }

      setName(product.name)
      setDescription(product.description || '')
      setPrice(String(product.price / 100)) // paise to ₹
      setCoverPreview(product.cover_url || null)
      setLoading(false)
    }
    load()
  }, [params.id])

  function handleCoverChange(f: File | null) {
    if (!f) return
    setNewCover(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!name || !price) return setError('name and price are required')
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 1) return setError('price must be at least ₹1')

    setSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not logged in')

      let coverUrl: string | undefined = undefined

      // Upload new cover if changed
      if (newCover) {
        const coverRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileName: `cover_${newCover.name}`, fileType: newCover.type }),
        })
        if (!coverRes.ok) throw new Error('failed to get cover upload url')
        const { uploadUrl, fileKey } = await coverRes.json()

        const upload = await fetch(uploadUrl, {
          method: 'PUT',
          body: newCover,
          headers: { 'Content-Type': newCover.type },
        })
        if (!upload.ok) throw new Error('cover upload failed')
        coverUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}`
      }

      // Generate new slug from updated name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const updateData: any = {
        name,
        slug,
        description,
        price: Math.round(priceNum * 100),
      }
      if (coverUrl) updateData.cover_url = coverUrl

      const { error: dbErr } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', params.id)

      if (dbErr) throw dbErr
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
        loading...
      </div>
    </div>
  )

  if (done) return (
    <div className="page">
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>product updated!</h2>
        <a href="/dashboard">
          <button className="btn-primary">← back to dashboard</button>
        </a>
      </div>
    </div>
  )

  const label = (text: string) => (
    <label style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
      {text}
    </label>
  )

  return (
    <div className="page">
      <Nav />
      <main style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/dashboard" style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← dashboard
          </a>
        </div>

        <p className="section-label">// edit product</p>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 36 }}>
          edit product
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            {label('product name')}
            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div>
            {label('description')}
            <textarea
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Price */}
          <div>
            {label('price (in ₹)')}
            <input
              className="input"
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min="1"
              step="1"
            />
          </div>

          {/* Cover image */}
          <div>
            {label('cover image')}
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                borderColor: newCover ? 'var(--accent-border)' : 'var(--border)',
                transition: 'border-color 0.2s',
              }}
              onClick={() => document.getElementById('cover-input')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleCoverChange(e.dataTransfer.files[0]) }}
            >
              <input
                id="cover-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleCoverChange(e.target.files?.[0] || null)}
              />
              {coverPreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={coverPreview}
                    alt="cover"
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 8, right: 8,
                    background: 'rgba(0,0,0,0.7)', color: 'var(--text-muted)',
                    fontFamily: 'var(--mono)', fontSize: 11,
                    padding: '4px 8px', borderRadius: 4,
                  }}>
                    click to change
                  </div>
                </div>
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                  drag & drop or click to upload cover image
                </div>
              )}
            </div>
          </div>

          {error && <p className="msg-error">{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 14, padding: '13px' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'saving...' : 'save changes →'}
            </button>
            <a href="/dashboard" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost" style={{ fontSize: 14, padding: '13px 20px' }}>
                cancel
              </button>
            </a>
          </div>

        </div>
      </main>
    </div>
  )
}