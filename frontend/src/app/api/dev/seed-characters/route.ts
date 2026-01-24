import { NextResponse } from 'next/server'
import { getSupabase, getUserFromRequestWithDevice } from '../../../../lib/auth'

// 개발 환경에서만 사용 가능한 더미 캐릭터 생성 API
export async function POST(request: Request) {
  // 프로덕션 환경에서는 비활성화
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // 개발 환경에서는 device_id 자동 생성/사용
  let user = await getUserFromRequestWithDevice(request)

  // 인증 실패 시 임시 device_id로 시도
  if (!user) {
    const supabase = getSupabase()
    const tempDeviceId = 'dev-test-device-001'

    // 기존 사용자 찾기 또는 생성
    const { data: existingUser } = await supabase
      .from('ledger_users')
      .select('id')
      .eq('device_id', tempDeviceId)
      .single()

    if (existingUser) {
      user = { id: existingUser.id }
    } else {
      const { data: newUser, error } = await supabase
        .from('ledger_users')
        .insert({ device_id: tempDeviceId })
        .select('id')
        .single()

      if (error || !newUser) {
        return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 })
      }
      user = { id: newUser.id }
    }
  }

  const supabase = getSupabase()

  // 더미 캐릭터 데이터
  const dummyCharacters = [
    {
      user_id: user.id,
      name: '테스트검사',
      class_name: '검사',
      server_name: '지옥문',
      race: '천족',
      item_level: 1250,
      is_main: true,
      display_order: 0
    },
    {
      user_id: user.id,
      name: '테스트마법사',
      class_name: '마법사',
      server_name: '지옥문',
      race: '마족',
      item_level: 1180,
      is_main: false,
      display_order: 1
    },
    {
      user_id: user.id,
      name: '테스트궁수',
      class_name: '궁수',
      server_name: '지옥문',
      race: '천족',
      item_level: 1100,
      is_main: false,
      display_order: 2
    }
  ]

  try {
    // 기존 더미 캐릭터 삭제 (같은 이름으로 시작하는 캐릭터)
    await supabase
      .from('ledger_characters')
      .delete()
      .eq('user_id', user.id)
      .like('name', '테스트%')

    // 새 더미 캐릭터 추가
    const { data, error } = await supabase
      .from('ledger_characters')
      .insert(dummyCharacters)
      .select()

    if (error) {
      console.error('[Dev Seed] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Dev Seed] Created dummy characters:', data?.length)
    return NextResponse.json({
      message: `${data?.length}개의 더미 캐릭터가 생성되었습니다.`,
      characters: data
    })
  } catch (e: any) {
    console.error('[Dev Seed] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// 더미 캐릭터 삭제
export async function DELETE(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const user = await getUserFromRequestWithDevice(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  const { error } = await supabase
    .from('ledger_characters')
    .delete()
    .eq('user_id', user.id)
    .like('name', '테스트%')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: '더미 캐릭터가 삭제되었습니다.' })
}
