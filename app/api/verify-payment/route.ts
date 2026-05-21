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

    // 1. Verify signature
    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 })
    }

    // 2. Fetch pending order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*, products(*, profiles(display_name, username))')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('status', 'pending')
      .single()

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found or already processed' }, { status: 404 })
    }

    // 3. Get platform fee % from config
    const { data: feeConfig } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'platform_fee_percent')
      .single()

    const feePercent = parseFloat(feeConfig?.value || '5')
    const platformFee = Math.round(order.amount * (feePercent / 100))
    const sellerEarning = order.amount - platformFee

    // 4. Generate download token
    const downloadToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // 5. Update order as paid with fee breakdown
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id,
        download_token: downloadToken,
        download_expires_at: expiresAt.toISOString(),
        platform_fee: platformFee,
        seller_earning: sellerEarning,
      })
      .eq('id', order.id)

    // 6. Increment sales count
    await supabaseAdmin.rpc('increment_sales_count', { product_id: order.product_id })

    // 7. Credit seller balance
    await supabaseAdmin.from('balance_transactions').insert({
      seller_id: order.products.seller_id,
      order_id: order.id,
      type: 'credit',
      amount: sellerEarning,
      description: `Sale: ${order.products.name}`,
    })

    // 8. Send download email
    const downloadUrl = getDownloadUrl(order.products.file_key)
    await sendDownloadEmail({
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name || 'there',
      productName: order.products.name,
      sellerName: order.products.profiles?.display_name || order.products.profiles?.username || 'the seller',
      downloadUrl,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify-payment]', err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}