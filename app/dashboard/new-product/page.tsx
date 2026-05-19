'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

export default function NewProductPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  function handleCoverChange(f: File | null) {
    if (!f) return
    setCover(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!name || !price || !file) return setError('product name, price and file are required')
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 1) return setError('price must be at least ₹1')

    setSubmitting(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('not logged in')

      // 1. Upload product file
      setProgress('uploading product file...')
      const uploadRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'failed to get upload url')
      }
      const { uploadUrl, fileKey } = await uploadRes.json()

      const fileUpload = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!fileUpload.ok) throw new Error('file upload failed')

      // 2. Upload cover image if provided
      let coverUrl: string | null = null
      if (cover) {
        setProgress('uploading cover image...')
        const coverRes = await fetch('/api/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileName: `cover_${cover.name}`, fileType: cover.type }),
        })
        if (!coverRes.ok) throw new Error('failed to get cover upload url')
        const { uploadUrl: coverUploadUrl, fileKey: coverKey } = await coverRes.json()

        const coverUpload = await fetch(coverUploadUrl, {
          method: 'PUT',
          body: cover,
          headers: { 'Content-Type': cover.type },
        })
        if (!coverUpload.ok) throw new Error('cover upload failed')

        // Build the public R2 URL for cover image
        // Cover images are public (not signed) since they're just previews
        coverUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${coverKey}`
      }

      // 3. Save product to DB
      setProgress('saving product...')
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const { error: dbErr } = await supabase.from('products').insert({
        seller_id: session.user.id,
        name,
        description,
        price: Math.round(priceNum * 100),
        slug,
        file_key: fileKey,
        file_name: file.name,
        cover_url: coverUrl,
        is_published: isPublished,
      })

      if (dbErr) throw dbErr
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'something went wrong')
    } finally {
      setSubmitting(false)
      setProgress('')
    }
  }

  if (done) return (
    <div className="page">
      <Nav />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
      }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <h2 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
          product {isPublished ? 'published!' : 'saved as draft!'}
        </h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
          {isPublished ? 'your product is now live on the explore page.' : 'you can publish it anytime from the dashboard.'}
        </p>
        <a href="/dashboard">
          <button className="btn-primary">← back to dashboard</button>
        </a>
      </div>
    </div>
  )

  const label = (text: string) => (
    <label style={{
      fontFamily: 'var(--mono)',
      fontSize: 12,
      color: 'var(--text-muted)',
      display: 'block',
      marginBottom: 8,
    }}>
      {text}
    </label>
  )

  return (
    <div className="page">
      <Nav />
      <main style={{ maxWidth: 620, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <a href="/dashboard" style={{
            fontFamily: 'var(--mono)',
            fontSize: 13,
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}>← dashboard</a>
        </div>

        <p className="section-label">// new product</p>
        <h1 style={{
          fontFamily: 'var(--sans)',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: 36,
        }}>
          upload product
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            {label('product name')}
            <input
              className="input"
              type="text"
              placeholder="e.g. Next.js SaaS Boilerplate"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            {label('description')}
            <textarea
              className="input"
              placeholder="what does this include? who is it for?"
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
              placeholder="e.g. 299"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min="1"
              step="1"
            />
          </div>

          {/* Cover image */}
          <div>
            {label('cover image (optional — JPG, PNG)')}
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                borderColor: cover ? 'var(--accent-border)' : 'var(--border)',
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
                    alt="cover preview"
                    style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    padding: '4px 8px',
                    borderRadius: 4,
                  }}>
                    click to change
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '32px 24px',
                  textAlign: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                }}>
                  drag & drop or click to upload cover image
                </div>
              )}
            </div>
          </div>

          {/* Product file */}
          <div>
            {label('product file (ZIP, PDF, etc.)')}
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 8,
                padding: '32px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                borderColor: file ? 'var(--accent-border)' : 'var(--border)',
                background: file ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            >
              <input
                id="file-input"
                type="file"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)' }}>
                  ✓ {file.name}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                  drag & drop or click to upload
                </span>
              )}
            </div>
          </div>

          {/* Publish toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}>
            <div>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                publish immediately
              </p>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                {isPublished ? 'visible on explore page after upload' : 'saved as draft — publish later from dashboard'}
              </p>
            </div>
            <div
              onClick={() => setIsPublished(!isPublished)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: isPublished ? 'var(--accent)' : 'var(--surface-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: isPublished ? 22 : 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: isPublished ? '#000' : 'var(--text-dim)',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

          {error && <p className="msg-error">{error}</p>}
          {progress && (
            <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
              {progress}
            </p>
          )}

          <button
            className="btn-primary"
            style={{ fontSize: 15, padding: '14px' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'uploading...' : isPublished ? 'publish product →' : 'save as draft →'}
          </button>
        </div>
      </main>
    </div>
  )
}