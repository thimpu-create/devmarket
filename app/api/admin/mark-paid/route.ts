import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { payoutId } = await req.json()
    if (!payoutId) return NextResponse.json({ error: 'payoutId required' }, { status: 400 })

    const { data: payout } = await supabaseAdmin
      .from('payouts').select('*').eq('id', payoutId).eq('status', 'pending').single()

    if (!payout) return NextResponse.json({ error: 'payout not found' }, { status: 404 })

    await supabaseAdmin.from('payouts').update({
      status: 'paid',
      processed_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
    }).eq('id', payoutId)

    await supabaseAdmin
      .from('balance_transactions')
      .update({ payout_id: payoutId })
      .eq('seller_id', payout.seller_id)
      .is('payout_id', null)
      .eq('type', 'credit')

    await supabaseAdmin.from('balance_transactions').insert({
      seller_id: payout.seller_id,
      payout_id: payoutId,
      type: 'debit',
      amount: payout.amount,
      description: 'Payout transferred to bank (manual)',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[mark-paid]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}