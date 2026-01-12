import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)

    // Verify the user with Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user already has a ledger account
    const { data: existingUser } = await supabase
      .from('ledger_users')
      .select('id, nickname')
      .eq('auth_user_id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({
        user_id: existingUser.id,
        nickname: existingUser.nickname,
        message: 'User already exists'
      })
    }

    // Create new user with auth_user_id (without nickname - will be set later)
    const { data: newUser, error: createError } = await supabase
      .from('ledger_users')
      .insert({
        auth_user_id: user.id
      })
      .select('id, nickname')
      .single()

    if (createError) {
      console.error('[Auth Init] Create user error:', createError)
      throw createError
    }

    return NextResponse.json({
      user_id: newUser.id,
      nickname: newUser.nickname,
      message: 'User created'
    })

  } catch (error: any) {
    console.error('Auth init error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
