import { NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../../lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  const { error } = await supabase
    .from('ledger_characters')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[API] Delete character error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
