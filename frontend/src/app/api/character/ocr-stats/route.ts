import { NextRequest, NextResponse } from 'next/server'
import { normalizeCharacterId } from '../../../../lib/characterId'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../../lib/supabaseClient'
import type { OcrStat } from '../../../../types/stats'

// GET: OCR 스탯 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCharacterId = searchParams.get('characterId')

    if (!rawCharacterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      )
    }

    // characterId 정규화: lib/characterId.ts의 공통 함수 사용
    const normalizedId = normalizeCharacterId(rawCharacterId)

    console.log('[ocr-stats] GET - rawCharacterId:', rawCharacterId)
    console.log('[ocr-stats] GET - normalizedId:', normalizedId)

    // 캐릭터 ID로 OCR 스탯 조회 (device_id와 무관하게 조회 가능)
    // 정규화된 ID로 조회 (인코딩되지 않은 원본 값)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/character_ocr_stats?character_id=eq.${encodeURIComponent(normalizedId)}&select=*&order=updated_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[ocr-stats] GET error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch OCR stats' },
        { status: res.status }
      )
    }

    const data = await res.json()

    if (data.length === 0) {
      return NextResponse.json({ stats: null })
    }

    return NextResponse.json({
      stats: data[0].stats,
      updatedAt: data[0].updated_at,
      characterName: data[0].character_name
    })
  } catch (error) {
    console.error('[ocr-stats] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: OCR 스탯 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    // Bearer 토큰 인증 (Google 로그인)
    const authHeader = request.headers.get('Authorization')
    console.log('[ocr-stats] POST - authHeader:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing')

    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[ocr-stats] POST - Authorization header missing or invalid')
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    // Supabase에서 사용자 정보 가져오기
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = user.id

    const body = await request.json()
    const { characterId: rawCharacterId, serverId, characterName, stats } = body as {
      characterId: string
      serverId?: number
      characterName?: string
      stats: OcrStat[]
    }

    if (!rawCharacterId || !stats || !Array.isArray(stats)) {
      return NextResponse.json(
        { error: 'characterId and stats array are required' },
        { status: 400 }
      )
    }

    // characterId 정규화: lib/characterId.ts의 공통 함수 사용
    const normalizedId = normalizeCharacterId(rawCharacterId)

    console.log('[ocr-stats] POST - userId:', userId)
    console.log('[ocr-stats] POST - normalizedId:', normalizedId)

    // UPSERT: user_id + character_id로 기존 데이터 업데이트 또는 새로 생성
    // device_id 필드에 user_id 저장 (기존 테이블 스키마 유지)
    const payload = {
      device_id: userId,
      character_id: normalizedId,
      server_id: serverId || null,
      character_name: characterName || null,
      stats: stats,
      updated_at: new Date().toISOString()
    }

    // Upsert (ON CONFLICT) - on_conflict 파라미터로 unique constraint 지정
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/character_ocr_stats?on_conflict=device_id,character_id`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[ocr-stats] POST error:', errorText)
      return NextResponse.json(
        { error: 'Failed to save OCR stats' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OCR stats saved successfully'
    })
  } catch (error) {
    console.error('[ocr-stats] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: OCR 스탯 삭제
export async function DELETE(request: NextRequest) {
  try {
    // Bearer 토큰 인증 (Google 로그인)
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    // Supabase에서 사용자 정보 가져오기
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const userId = user.id

    const { searchParams } = new URL(request.url)
    const rawCharacterId = searchParams.get('characterId')

    if (!rawCharacterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      )
    }

    // characterId 정규화: lib/characterId.ts의 공통 함수 사용
    const normalizedId = normalizeCharacterId(rawCharacterId)

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/character_ocr_stats?device_id=eq.${encodeURIComponent(userId)}&character_id=eq.${encodeURIComponent(normalizedId)}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[ocr-stats] DELETE error:', errorText)
      return NextResponse.json(
        { error: 'Failed to delete OCR stats' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OCR stats deleted successfully'
    })
  } catch (error) {
    console.error('[ocr-stats] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
