import { NextRequest, NextResponse } from 'next/server'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDownloadUrl } from '@/lib/storage'
import { sendDownloadEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment fields' }, { status: 400 })
    }

    // 1. Verify the payment signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    // 2. Fetch the order — make sure it's still pending (prevent replay attacks)
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, products(*, profiles(display_name, username))')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending') // IMPORTANT: only process pending orders
      .single()

    if (!order) {
      // Could be a replay — order already processed or doesn't exist
      return NextResponse.json({ success: false, error: 'Order not found or already processed' }, { status: 404 })
    }

    // 3. Generate secure download token
    const downloadToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // 4. Update order as paid
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id,
        download_token: downloadToken,
        download_expires_at: expiresAt.toISOString(),
      })
      .eq('id', order.id)

    // 5. Increment product sales count atomically (avoids race condition)
    await supabaseAdmin.rpc('increment_sales_count', { product_id: order.product_id })

    // 6. Generate signed R2 download URL
    const downloadUrl = getDownloadUrl(order.products.file_key)

    // 7. Send email with download link
    await sendDownloadEmail({
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name || 'there',
      productName: order.products.name,
      sellerName: order.products.profiles?.display_name || order.products.profiles?.username || 'the seller',
      downloadUrl,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('verify-payment error:', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
