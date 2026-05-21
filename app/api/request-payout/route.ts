import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Check no pending payout already exists
    const { data: existing } = await supabaseAdmin
      .from('payouts')
      .select('id')
      .eq('seller_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'you already have a pending payout request' }, { status: 400 })

    // Get current balance
    const { data: balance } = await supabaseAdmin
      .rpc('get_seller_balance', { p_seller_id: user.id })

    // Get min payout config
    const { data: cfg } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'min_payout_amount')
      .single()

    const minAmount = parseInt(cfg?.value || '10000')

    if (!balance || balance < minAmount) {
      return NextResponse.json({
        error: `minimum payout is ₹${minAmount / 100}. your balance is ₹${(balance || 0) / 100}`
      }, { status: 400 })
    }

    // Check seller has a payout account
    const { data: account } = await supabaseAdmin
      .from('payout_accounts')
      .select('id')
      .eq('seller_id', user.id)
      .maybeSingle()

    if (!account) return NextResponse.json({ error: 'please add your bank account before requesting a payout' }, { status: 400 })

    // Create payout request
    await supabaseAdmin.from('payouts').insert({
      seller_id: user.id,
      amount: balance,
      status: 'pending',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[request-payout]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}