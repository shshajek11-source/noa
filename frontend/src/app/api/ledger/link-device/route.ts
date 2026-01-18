import { NextResponse } from 'next/server'
import { getSupabase } from '../../../../lib/auth'

/**
 * POST /api/ledger/link-device
 *
 * device_id를 Google 계정(google_user_id)과 연결
 * 다른 기기에서 동일한 Google 계정으로 로그인하면 같은 데이터에 접근 가능
 *
 * Request:
 * - Headers: X-Device-ID (필수)
 * - Body: { google_user_id: string, google_email?: string }
 *
 * 동작:
 * 1. 현재 device_id로 유저 조회/생성
 * 2. google_user_id로 기존 유저 조회
 * 3. 이미 연결된 Google 계정이 있으면:
 *    - 동일 계정이면 성공
 *    - 다른 계정이면 병합 또는 오류
 * 4. 연결된 계정이 없으면 google_user_id 저장
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabase()

    // device_id 확인
    const deviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 })
    }

    // body에서 Google user ID 추출
    const body = await request.json()
    const { google_user_id, google_email } = body

    if (!google_user_id) {
      return NextResponse.json({ error: 'Google user ID required' }, { status: 400 })
    }

    console.log('[Link Device] Linking device_id to Google account:', {
      deviceId: deviceId.substring(0, 8) + '...',
      googleUserId: google_user_id.substring(0, 8) + '...',
      google_email
    })

    // 1. 현재 device_id로 유저 조회
    const { data: deviceUser } = await supabase
      .from('ledger_users')
      .select('id, google_user_id, google_email')
      .eq('device_id', deviceId)
      .single()

    // 2. Google user_id로 기존 유저 조회
    const { data: googleUser } = await supabase
      .from('ledger_users')
      .select('id, device_id, google_email')
      .eq('google_user_id', google_user_id)
      .single()

    // Case 1: device_id 유저가 없는 경우 - 새로 생성
    if (!deviceUser) {
      if (googleUser) {
        // Google 계정에 이미 연결된 유저가 있으면 device_id 추가
        const { error: updateError } = await supabase
          .from('ledger_users')
          .update({
            device_id: deviceId,
            google_email: google_email || googleUser.google_email
          })
          .eq('id', googleUser.id)

        if (updateError) {
          console.error('[Link Device] Failed to update device_id:', updateError)
          return NextResponse.json({ error: 'Failed to link device' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Device linked to existing Google account',
          user_id: googleUser.id,
          merged: true
        })
      }

      // 새 유저 생성 (device_id + google_user_id)
      const { data: newUser, error: insertError } = await supabase
        .from('ledger_users')
        .insert({
          device_id: deviceId,
          google_user_id,
          google_email
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[Link Device] Failed to create user:', insertError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'New user created with Google account',
        user_id: newUser.id,
        merged: false
      })
    }

    // Case 2: device_id 유저가 이미 Google 계정에 연결된 경우
    if (deviceUser.google_user_id) {
      if (deviceUser.google_user_id === google_user_id) {
        // 동일한 계정 - 이미 연결됨
        return NextResponse.json({
          success: true,
          message: 'Already linked to this Google account',
          user_id: deviceUser.id,
          merged: false
        })
      }

      // 다른 Google 계정에 연결 시도 - 허용하지 않음
      return NextResponse.json({
        error: 'Device already linked to a different Google account',
        current_email: deviceUser.google_email
      }, { status: 409 })
    }

    // Case 3: device_id 유저가 Google 계정에 연결되지 않은 경우
    if (googleUser) {
      // 이 Google 계정에 이미 다른 device_id가 연결된 경우 - 데이터 병합
      // 기존 device_id 유저의 데이터를 Google 유저로 이전
      console.log('[Link Device] Merging data from device user to Google user:', {
        fromUserId: deviceUser.id,
        toUserId: googleUser.id
      })

      // 캐릭터 이전
      await supabase
        .from('ledger_characters')
        .update({ user_id: googleUser.id })
        .eq('user_id', deviceUser.id)

      // 기존 device_id 유저 삭제
      await supabase
        .from('ledger_users')
        .delete()
        .eq('id', deviceUser.id)

      // Google 유저에 현재 device_id 추가
      const { error: updateError } = await supabase
        .from('ledger_users')
        .update({
          device_id: deviceId,
          google_email: google_email || googleUser.google_email
        })
        .eq('id', googleUser.id)

      if (updateError) {
        console.error('[Link Device] Failed to update device_id:', updateError)
        return NextResponse.json({ error: 'Failed to merge accounts' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Device linked and data merged to existing Google account',
        user_id: googleUser.id,
        merged: true
      })
    }

    // Case 4: 단순 연결 - device_id 유저에 Google 정보 추가
    const { error: updateError } = await supabase
      .from('ledger_users')
      .update({
        google_user_id,
        google_email
      })
      .eq('id', deviceUser.id)

    if (updateError) {
      console.error('[Link Device] Failed to link Google account:', updateError)
      return NextResponse.json({ error: 'Failed to link Google account' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Google account linked successfully',
      user_id: deviceUser.id,
      merged: false
    })

  } catch (err) {
    console.error('[Link Device] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
