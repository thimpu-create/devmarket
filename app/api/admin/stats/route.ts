import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user || user.id !== process.env.ADMIN_USER_ID) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { data: orders } = await supabaseAdmin
      .from('orders').select('amount, platform_fee').eq('status', 'paid')

    const { data: sellers } = await supabaseAdmin.from('profiles').select('id')

    const { data: payouts } = await supabaseAdmin
      .from('payouts').select('*').eq('status', 'pending')
      .order('requested_at', { ascending: true })

    const enrichedPayouts = await Promise.all(
      (payouts || []).map(async (payout) => {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('username, display_name').eq('id', payout.seller_id).single()
        const { data: bankAccount } = await supabaseAdmin
          .from('payout_accounts').select('account_holder_name, account_number, ifsc_code')
          .eq('seller_id', payout.seller_id).single()
        return { ...payout, profiles: profile, payout_accounts: bankAccount }
      })
    )

    const { data: config } = await supabaseAdmin.from('platform_config').select('*')

    return NextResponse.json(
      { orders: orders || [], sellerCount: sellers?.length || 0, pendingPayouts: enrichedPayouts, config: config || [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
  } catch (err) {
    console.error('[admin/stats] error:', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}