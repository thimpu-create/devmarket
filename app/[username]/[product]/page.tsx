'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/format'

// Load Razorpay script
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function ProductPage({
  params,
}: {
  params: { username: string; product: string }
}) {
  const [product, setProduct] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [step, setStep] = useState<'details' | 'success'>('details')
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    async function load() {
      // Fetch seller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', params.username)
        .single()

      if (!profile) { setLoading(false); return }
      setSeller(profile)

      // FIX: match by slug (exact), not ilike on name — much more reliable
      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', profile.id)
        .eq('is_published', true)
        .eq('slug', params.product)
        .single()

      setProduct(prod)
      setLoading(false)
    }
    load()
  }, [params])

  async function handleBuy() {
    if (!buyerEmail || !buyerName) return
    setPaymentError('')
    setBuying(true)

    try {
      // 1. Create Razorpay order
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyerEmail,
          buyerName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create order')

      const { orderId, amount, currency } = data

      // 2. Load Razorpay and open checkout
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Failed to load payment. Please try again.')

      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        order_id: orderId,
        name: 'DevMarket',
        description: product.name,
        prefill: { email: buyerEmail, name: buyerName },
        theme: { color: '#22c55e' },
        handler: async (response: any) => {
          // 3. Verify payment on server
          const verify = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const result = await verify.json()
          if (result.success) {
            setStep('success')
          } else {
            setPaymentError('Payment verification failed. Contact support with your payment ID.')
          }
        },
        modal: {
          ondismiss: () => setBuying(false),
        },
      })
      rzp.open()
    } catch (err: any) {
      setPaymentError(err.message || 'Something went wrong')
      setBuying(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
      loading...
    </div>
  )

  if (!product || !seller) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
      product not found
    </div>
  )

  if (step === 'success') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{ fontSize: 48 }}>✓</div>
      <h2 style={{ fontFamily: 'var(--sans)', fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>Payment successful!</h2>
      <p style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>
        Download link sent to <strong style={{ color: 'var(--text)' }}>{buyerEmail}</strong>.
        Check your inbox — link expires in 10 minutes.
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: 680, margin: '0 auto' }}>
      {/* Seller info */}
      <div style={{ marginBottom: 32 }}>
        <a href={`/${seller.username}`} style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← {seller.display_name || seller.username}
        </a>
      </div>

      {/* Product */}
      <div className="card" style={{ marginBottom: 24 }}>
        {product.cover_url && (
          <img src={product.cover_url} alt={product.name}
            style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 6, marginBottom: 20 }} />
        )}
        <div className="tag" style={{ marginBottom: 12 }}>digital product</div>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.02em' }}>
          {product.name}
        </h1>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
          {product.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
            {formatINR(product.price)}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-dim)' }}>
            {product.sales_count} sold
          </span>
        </div>
      </div>

      {/* Buy form */}
      <div className="card">
        <h2 style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 400 }}>
          // enter your details
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <input
            className="input"
            type="text"
            placeholder="your name"
            value={buyerName}
            onChange={e => setBuyerName(e.target.value)}
          />
          <input
            className="input"
            type="email"
            placeholder="your email (download link sent here)"
            value={buyerEmail}
            onChange={e => setBuyerEmail(e.target.value)}
          />
        </div>

        {paymentError && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#f87171', marginBottom: 12 }}>{paymentError}</p>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', fontSize: 15, padding: '14px', opacity: buying ? 0.7 : 1 }}
          onClick={handleBuy}
          disabled={buying || !buyerEmail || !buyerName}
        >
          {buying ? 'opening payment...' : `pay ${formatINR(product.price)} via UPI / card →`}
        </button>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
          powered by Razorpay · secure payment
        </p>
      </div>
    </main>
  )
}