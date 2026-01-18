import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../../lib/supabaseClient'

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY

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

    const { device_id } = await request.json()

    if (!device_id) {
      return NextResponse.json({ message: 'No device_id to migrate' }, { status: 200 })
    }

    // Check if user already has a linked ledger account
    const { data: existingAuthUser } = await supabase
      .from('ledger_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (existingAuthUser) {
      return NextResponse.json({
        message: 'Account already linked',
        user_id: existingAuthUser.id,
        migrated: false
      }, { status: 200 })
    }

    // Find device_id user to migrate
    const { data: deviceUser, error: findError } = await supabase
      .from('ledger_users')
      .select('id, device_id')
      .eq('device_id', device_id)
      .single()

    if (findError || !deviceUser) {
      // No existing device data - create new user with auth_user_id
      const { data: newUser, error: createError } = await supabase
        .from('ledger_users')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Migrate] Create user error:', createError)
        throw createError
      }

      return NextResponse.json({
        message: 'New account created',
        user_id: newUser.id,
        migrated: false
      })
    }

    // Migrate: Link device_id user to auth user
    const { error: updateError } = await supabase
      .from('ledger_users')
      .update({
        auth_user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url
      })
      .eq('id', deviceUser.id)

    if (updateError) {
      console.error('[Migrate] Update error:', updateError)
      throw updateError
    }

    console.log(`[Migrate] Successfully linked device ${device_id} to user ${user.id}`)

    return NextResponse.json({
      message: 'Data migrated successfully',
      user_id: deviceUser.id,
      migrated: true
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
