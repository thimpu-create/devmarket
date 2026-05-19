import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, generateFileKey } from '@/lib/storage'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated via Authorization header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { fileName, fileType } = await req.json()

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 })
    }

    const fileKey = generateFileKey(user.id, fileName)
    const uploadUrl = getUploadUrl(fileKey, fileType)

    return NextResponse.json({ uploadUrl, fileKey })
  } catch (err) {
    console.error('upload-url error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
