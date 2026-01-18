import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../lib/supabaseClient'

interface FavoriteCharacter {
  characterId: string
  serverId: number
  serverName: string
  characterName: string
  className?: string
  raceName?: string
  level?: number
}

// GET: 즐겨찾기 캐릭터 목록 조회
export async function GET(request: NextRequest) {
  try {
    const deviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 401 }
      )
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/favorite_characters?device_id=eq.${encodeURIComponent(deviceId)}&select=*&order=sort_order.asc,created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[favorite-characters] GET error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch favorite characters' },
        { status: res.status }
      )
    }

    const data = await res.json()

    // 클라이언트 형식으로 변환
    const favorites = data.map((item: any) => ({
      characterId: item.character_id,
      serverId: item.server_id,
      serverName: item.server_name,
      characterName: item.character_name,
      className: item.class_name,
      raceName: item.race_name,
      level: item.level,
      sortOrder: item.sort_order,
      createdAt: item.created_at
    }))

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('[favorite-characters] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 즐겨찾기 캐릭터 추가
export async function POST(request: NextRequest) {
  try {
    const deviceId = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { characterId, serverId, serverName, characterName, className, raceName, level } = body as FavoriteCharacter

    if (!characterId || !serverId || !serverName || !characterName) {
      return NextResponse.json(
        { error: 'characterId, serverId, serverName, characterName are required' },
        { status: 400 }
      )
    }

    // 현재 최대 sort_order 조회
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/favorite_characters?device_id=eq.${encodeURIComponent(deviceId)}&select=sort_order&order=sort_order.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    let nextOrder = 0
    if (countRes.ok) {
      const countData = await countRes.json()
      if (countData.length > 0) {
        nextOrder = (countData[0].sort_order || 0) + 1
      }
    }

    const payload = {
      device_id: deviceId,
      character_id: characterId,
      server_id: serverId,
      server_name: serverName,
      character_name: characterName,
      class_name: className || null,
      race_name: raceName || null,
      level: level || 0,
      sort_order: nextOrder
    }

    // Upsert
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/favorite_characters`,
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
      console.error('[favorite-characters] POST error:', errorText)
      return NextResponse.json(
        { error: 'Failed to add favorite character' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite character added successfully'
    })
  } catch (error) {
    console.error('[favorite-characters] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: 즐겨찾기 캐릭터 삭제
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
    const characterId = searchParams.get('characterId')

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/favorite_characters?device_id=eq.${encodeURIComponent(deviceId)}&character_id=eq.${encodeURIComponent(characterId)}`,
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
      console.error('[favorite-characters] DELETE error:', errorText)
      return NextResponse.json(
        { error: 'Failed to delete favorite character' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite character deleted successfully'
    })
  } catch (error) {
    console.error('[favorite-characters] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
