import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Vercel cron calls this every Monday at 9am IST
// Add to vercel.json: { "crons": [{ "path": "/api/cron/weekly-payouts", "schedule": "30 3 * * 1" }] }
// (3:30 UTC = 9:00 IST)

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron, not a random visitor
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    // Get config
    const { data: cfgRows } = await supabaseAdmin.from('platform_config').select('*')
    const cfg: Record<string, string> = {}
    cfgRows?.forEach(r => { cfg[r.key] = r.value })

    if (cfg.payouts_enabled !== 'true') {
      return NextResponse.json({ message: 'payouts disabled', processed: 0 })
    }

    const minAmount = parseInt(cfg.min_payout_amount || '10000')

    // Get all sellers with a verified payout account
    const { data: accounts } = await supabaseAdmin
      .from('payout_accounts')
      .select('seller_id')

    if (!accounts?.length) return NextResponse.json({ message: 'no payout accounts', processed: 0 })

    let processed = 0
    let skipped = 0

    for (const acc of accounts) {
      // Get seller's current balance
      const { data: balance } = await supabaseAdmin
        .rpc('get_seller_balance', { p_seller_id: acc.seller_id })

      if (!balance || balance < minAmount) { skipped++; continue }

      // Check no pending payout already exists
      const { data: existing } = await supabaseAdmin
        .from('payouts')
        .select('id')
        .eq('seller_id', acc.seller_id)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) { skipped++; continue }

      // Create payout request
      await supabaseAdmin.from('payouts').insert({
        seller_id: acc.seller_id,
        amount: balance,
        status: 'pending',
      })

      processed++
    }

    console.log(`[weekly-payouts] created ${processed} payouts, skipped ${skipped}`)
    return NextResponse.json({ message: 'done', processed, skipped })
  } catch (err) {
    console.error('[weekly-payouts]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}