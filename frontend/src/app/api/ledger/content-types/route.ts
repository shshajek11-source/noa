import { NextResponse } from 'next/server'
import { ContentType, DungeonTier } from '@/types/ledger'

// 정적 컨텐츠 타입 데이터 (추후 DB로 이전 가능)
const CONTENT_TYPES: ContentType[] = [
  { id: 'transcend', name: '초월', display_order: 1, is_active: true },
  { id: 'expedition', name: '원정', display_order: 2, is_active: true },
]

// 정적 던전 단계 데이터 (추후 DB로 이전 가능)
const DUNGEON_TIERS: DungeonTier[] = [
  // 초월
  { id: 'transcend_1', content_type: 'transcend', name: '1단계', default_kina: 50000, display_order: 1 },
  { id: 'transcend_2', content_type: 'transcend', name: '2단계', default_kina: 75000, display_order: 2 },
  { id: 'transcend_3', content_type: 'transcend', name: '3단계', default_kina: 100000, display_order: 3 },
  // 원정
  { id: 'expedition_normal', content_type: 'expedition', name: '일반', default_kina: 60000, display_order: 1 },
  { id: 'expedition_hard', content_type: 'expedition', name: '어려움', default_kina: 90000, display_order: 2 },
]

export async function GET() {
  return NextResponse.json({
    contentTypes: CONTENT_TYPES,
    dungeonTiers: DUNGEON_TIERS
  })
}
