import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET - 대표 캐릭터 조회
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's main character
    const { data: ledgerUser } = await supabase
      .from('ledger_users')
      .select('main_character_id, main_character_server, main_character_name, main_character_class, main_character_level, main_character_race, main_character_item_level, main_character_hit_score, main_character_image_url')
      .eq('auth_user_id', user.id)
      .single()

    if (!ledgerUser || !ledgerUser.main_character_name) {
      return NextResponse.json({
        mainCharacter: null
      })
    }

    return NextResponse.json({
      mainCharacter: {
        characterId: ledgerUser.main_character_id,
        server: ledgerUser.main_character_server,
        name: ledgerUser.main_character_name,
        className: ledgerUser.main_character_class,
        level: ledgerUser.main_character_level,
        race: ledgerUser.main_character_race,
        item_level: ledgerUser.main_character_item_level,
        hit_score: ledgerUser.main_character_hit_score,
        imageUrl: ledgerUser.main_character_image_url
      }
    })
  } catch (error: any) {
    console.error('Get main character error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - 대표 캐릭터 설정
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { characterId, server, name, className, level, race, item_level, hit_score, imageUrl } = await request.json()

    console.log('[Main Character API] Saving:', { characterId, server, name, className, level, race, item_level, hit_score, imageUrl })

    // Check if this character is already set as main character by another user
    if (server && name) {
      const { data: existingMainChar } = await supabase
        .from('ledger_users')
        .select('auth_user_id')
        .eq('main_character_server', server)
        .eq('main_character_name', name)
        .neq('auth_user_id', user.id)
        .single()

      if (existingMainChar) {
        return NextResponse.json({
          error: '이미 다른 사용자가 대표 캐릭터로 설정한 캐릭터입니다.'
        }, { status: 400 })
      }
    }

    // IMPORTANT: Ensure ledger_users record exists BEFORE updating
    console.log('[Main Character API] Ensuring ledger_users exists for auth_user_id:', user.id)
    let { data: ledgerUser } = await supabase
      .from('ledger_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!ledgerUser) {
      console.log('[Main Character API] Creating new ledger_users record')
      const { data: newLedgerUser, error: createError } = await supabase
        .from('ledger_users')
        .insert({
          auth_user_id: user.id,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Main Character API] Failed to create ledger_users:', createError)
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
      }

      ledgerUser = newLedgerUser
      console.log('[Main Character API] Created ledger_users:', ledgerUser)
    }

    // Now update user's main character (null values will clear the character)
    const { error: updateError } = await supabase
      .from('ledger_users')
      .update({
        main_character_id: characterId ?? null,
        main_character_server: server ?? null,
        main_character_name: name ?? null,
        main_character_class: className ?? null,
        main_character_level: level ?? null,
        main_character_race: race ?? null,
        main_character_item_level: item_level ?? null,
        main_character_hit_score: hit_score ?? null,
        main_character_image_url: imageUrl ?? null,
        updated_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('Update main character error:', updateError)

      // Check if it's a unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json({
          error: '이미 다른 사용자가 대표 캐릭터로 설정한 캐릭터입니다.'
        }, { status: 400 })
      }

      return NextResponse.json({ error: 'Failed to update main character' }, { status: 500 })
    }

    // 대표 캐릭터가 설정되었을 때, 가계부 캐릭터 목록에 자동 추가 또는 업데이트
    console.log('[Main Character API] Auto-adding/updating character to ledger:', { server, name })
    if (server && name && ledgerUser) {
      // 이미 가계부에 등록된 캐릭터인지 확인
      console.log('[Main Character API] Checking for existing character in ledger_characters')
      const { data: existingChar } = await supabase
        .from('ledger_characters')
        .select('id')
        .eq('user_id', ledgerUser.id)
        .eq('server_name', server)
        .eq('name', name)
        .single()

      console.log('[Main Character API] Existing character check:', { existingChar })

      const characterData = {
        user_id: ledgerUser.id,
        server_name: server,
        name: name,
        class_name: className ?? null,
        level: level ?? null,
        item_level: item_level ?? null,
        profile_image: imageUrl ?? null,
        race: race ?? null
      }

      if (!existingChar) {
        // 새로 추가
        console.log('[Main Character API] Inserting new character to ledger_characters')
        const { data: insertedChar, error: insertError } = await supabase
          .from('ledger_characters')
          .insert({
            ...characterData,
            created_at: new Date().toISOString()
          })
          .select()

        if (insertError) {
          console.error('[Main Character API] Failed to add character to ledger:', insertError)
        } else {
          console.log('[Main Character API] Auto-added character to ledger:', insertedChar)
        }
      } else {
        // 기존 캐릭터 정보 업데이트
        console.log('[Main Character API] Updating existing character in ledger')
        const { data: updatedChar, error: updateError } = await supabase
          .from('ledger_characters')
          .update(characterData)
          .eq('id', existingChar.id)
          .select()

        if (updateError) {
          console.error('[Main Character API] Failed to update character in ledger:', updateError)
        } else {
          console.log('[Main Character API] Updated character in ledger:', updatedChar)
        }
      }
    } else {
      console.log('[Main Character API] Skipping ledger addition:', { hasServer: !!server, hasName: !!name, hasLedgerUser: !!ledgerUser })
    }

    return NextResponse.json({
      success: true,
      mainCharacter: server && name ? {
        characterId,
        server,
        name,
        className,
        level,
        race,
        item_level,
        hit_score,
        imageUrl
      } : null
    })
  } catch (error: any) {
    console.error('Main character API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
