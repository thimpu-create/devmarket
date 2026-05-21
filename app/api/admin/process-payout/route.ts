import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { payoutId } = await req.json()
    if (!payoutId) return NextResponse.json({ success: false, error: 'payoutId required' }, { status: 400 })

    // Fetch payout with seller's fund account
    const { data: payout } = await supabaseAdmin
      .from('payouts')
      .select('*, payout_accounts(razorpay_fund_account_id, account_holder_name)')
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single()

    if (!payout) return NextResponse.json({ success: false, error: 'payout not found' }, { status: 404 })

    if (!payout.payout_accounts?.razorpay_fund_account_id) {
      return NextResponse.json({ success: false, error: 'seller has no razorpay fund account set up — add it manually in Razorpay dashboard first' }, { status: 400 })
    }

    // Call Razorpay Payouts API
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')

    const rzpRes = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'X-Payout-Idempotency': payoutId, // prevents double payouts
      },
      body: JSON.stringify({
        account_number: process.env.RAZORPAY_PAYOUT_ACCOUNT_NUMBER, // your Razorpay X account
        fund_account_id: payout.payout_accounts.razorpay_fund_account_id,
        amount: payout.amount,
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        narration: 'DevMarket earnings payout',
      }),
    })

    const rzpData = await rzpRes.json()

    if (!rzpRes.ok) {
      await supabaseAdmin.from('payouts').update({
        status: 'failed',
        failure_reason: rzpData.error?.description || 'Razorpay error',
      }).eq('id', payoutId)
      return NextResponse.json({ success: false, error: rzpData.error?.description }, { status: 400 })
    }

    // Mark payout as paid
    await supabaseAdmin.from('payouts').update({
      status: 'paid',
      razorpay_payout_id: rzpData.id,
      processed_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    }).eq('id', payoutId)

    // Mark balance transactions as paid out
    await supabaseAdmin
      .from('balance_transactions')
      .update({ payout_id: payoutId })
      .eq('seller_id', payout.seller_id)
      .is('payout_id', null)
      .eq('type', 'credit')

    // Record debit transaction
    await supabaseAdmin.from('balance_transactions').insert({
      seller_id: payout.seller_id,
      payout_id: payoutId,
      type: 'debit',
      amount: payout.amount,
      description: 'Payout transferred to bank',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[process-payout]', err)
    return NextResponse.json({ success: false, error: 'internal error' }, { status: 500 })
  }
}