import { NextRequest, NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/razorpay'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { productId, buyerEmail, buyerName } = await req.json()

    // Fetch product
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_published', true)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Create Razorpay order
    const order = await getRazorpayClient().orders.create({
      amount: product.price, // already in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: { productId, buyerEmail, buyerName },
    })

    // Save pending order in DB
    await supabaseAdmin.from('orders').insert({
      product_id: productId,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      amount: product.price,
      razorpay_order_id: order.id,
      status: 'pending',
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}