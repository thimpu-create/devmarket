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

    const { key, value } = await req.json()
    await supabaseAdmin
      .from('platform_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[update-config]', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}