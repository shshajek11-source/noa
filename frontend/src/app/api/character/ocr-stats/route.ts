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
    // device_id 인증
    const deviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 401 }
      )
    }

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

    console.log('[ocr-stats] POST - rawCharacterId:', rawCharacterId)
    console.log('[ocr-stats] POST - normalizedId:', normalizedId)

    // UPSERT: device_id + character_id로 기존 데이터 업데이트 또는 새로 생성
    const payload = {
      device_id: deviceId,
      character_id: normalizedId, // 정규화된 ID 사용
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
    const deviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 401 }
      )
    }

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
      `${SUPABASE_URL}/rest/v1/character_ocr_stats?device_id=eq.${encodeURIComponent(deviceId)}&character_id=eq.${encodeURIComponent(normalizedId)}`,
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
