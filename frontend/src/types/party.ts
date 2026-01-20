// 파티찾기 시스템 타입 정의

// 던전 타입
export type DungeonType = 'transcend' | 'expedition' | 'sanctuary' | 'subjugation' | 'pvp'

// 파티 상태
export type PartyStatus = 'recruiting' | 'full' | 'in_progress' | 'completed' | 'cancelled'

// 참가 방식
export type JoinType = 'approval' | 'first_come'

// 파티원 상태
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'kicked'

// 파티원 역할
export type MemberRole = 'leader' | 'member'

// 슬롯 상태
export type SlotStatus = 'empty' | 'filled'

// 알림 타입
export type NotificationType =
  | 'apply_received'
  | 'apply_approved'
  | 'apply_rejected'
  | 'party_full'
  | 'party_starting'
  | 'party_cancelled'
  | 'party_completed'
  | 'new_comment'
  | 'member_left'
  | 'member_kicked'

// 시간대 타입
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

// 캐릭터 클래스
export const CHARACTER_CLASSES = [
  '검성', '수호성', '궁성', '살성', '정령성', '마도성', '치유성', '호법성'
] as const

export type CharacterClass = typeof CHARACTER_CLASSES[number]

// 파티 모집글
export interface PartyPost {
  id: string
  user_id: string
  character_name: string
  character_class: string
  character_server_id: number
  character_level?: number
  character_item_level?: number
  character_breakthrough?: number
  character_combat_power?: number
  title: string
  description?: string
  dungeon_type: DungeonType
  dungeon_id: string
  dungeon_name: string
  dungeon_tier?: number
  is_immediate: boolean
  scheduled_date?: string
  scheduled_time_start?: string
  scheduled_time_end?: string
  run_count: number
  max_members: number
  join_type: JoinType
  min_item_level?: number
  min_breakthrough?: number
  min_combat_power?: number
  notification_enabled: boolean
  status: PartyStatus
  view_count: number
  created_at: string
  updated_at: string
  // 집계 필드 (조인)
  current_members?: number
  slots?: PartySlot[]
  members?: PartyMember[]
}

// 파티 슬롯
export interface PartySlot {
  id: string
  party_id: string
  slot_number: number
  party_number: number
  required_class?: string
  member_id?: string
  status: SlotStatus
  created_at: string
  // 조인 필드
  member?: PartyMember
}

// 파티원
export interface PartyMember {
  id: string
  party_id: string
  user_id: string
  slot_id?: string
  character_name: string
  character_class: string
  character_server_id: number
  character_level?: number
  character_item_level?: number
  character_breakthrough?: number
  character_combat_power?: number
  character_equipment?: Record<string, unknown>
  character_stats?: Record<string, unknown>
  role: MemberRole
  status: MemberStatus
  apply_message?: string
  reject_reason?: string
  applied_at: string
  processed_at?: string
}

// 파티 댓글
export interface PartyComment {
  id: string
  party_id: string
  user_id: string
  content: string
  character_name: string
  is_system_message: boolean
  created_at: string
  is_deleted: boolean
}

// 파티 알림
export interface PartyNotification {
  id: string
  user_id: string
  party_id?: string
  type: NotificationType
  title: string
  message?: string
  data?: Record<string, unknown>
  is_read: boolean
  read_at?: string
  created_at: string
  // 조인 필드
  party?: PartyPost
}

// 내 모집 캐릭터
export interface PartyUserCharacter {
  id: string
  user_id: string
  character_id?: string
  character_name: string
  character_class: string
  character_server_id: number
  character_level?: number
  character_item_level?: number
  character_breakthrough?: number
  character_combat_power?: number
  character_pve_score?: number
  character_pvp_score?: number
  profile_image?: string
  display_order: number
  created_at: string
  updated_at: string
}

// 던전 정보
export interface DungeonInfo {
  id: string
  name: string
  type: DungeonType
  tiers?: { tier: number; kina: number }[]
  categories?: { id: string; name: string; bosses: { id: string; name: string; kina: number }[] }[]
  maxMembers: number
  isPvp: boolean
}

// API 요청/응답 타입

// 파티 생성 요청
export interface CreatePartyRequest {
  title: string
  description?: string
  dungeon_type: DungeonType
  dungeon_id: string
  dungeon_name: string
  dungeon_tier?: number
  is_immediate: boolean
  scheduled_date?: string
  scheduled_time_start?: string
  scheduled_time_end?: string
  run_count: number
  max_members: number
  join_type: JoinType
  min_item_level?: number
  min_breakthrough?: number
  min_combat_power?: number
  // 캐릭터 정보
  character_name: string
  character_class: string
  character_server_id: number
  character_level?: number
  character_item_level?: number
  character_breakthrough?: number
  character_combat_power?: number
  // 슬롯 설정
  slots: { slot_number: number; party_number: number; required_class?: string }[]
}

// 파티 목록 조회 파라미터
export interface ListPartyParams {
  status?: PartyStatus
  dungeon_type?: DungeonType
  is_immediate?: boolean
  page?: number
  limit?: number
}

// 파티 신청 요청
export interface ApplyPartyRequest {
  slot_id: string
  character_name: string
  character_class: string
  character_server_id: number
  character_level?: number
  character_item_level?: number
  character_breakthrough?: number
  character_combat_power?: number
  character_equipment?: Record<string, unknown>
  character_stats?: Record<string, unknown>
  apply_message?: string
}

// 내 파티 요약
export interface MyPartySummary {
  created: PartyPost[]
  joined: PartyPost[]
  pending: PartyPost[]
  totalCount: number
}

// 시간 유틸리티
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 24) return 'evening'
  return 'night'
}

export function getTimeOfDayLabel(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅 아침'
    case 'afternoon': return '☀️ 오후'
    case 'evening': return '🌙 저녁'
    case 'night': return '🌃 새벽'
  }
}

export function getTimeOfDayIcon(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'morning': return '🌅'
    case 'afternoon': return '☀️'
    case 'evening': return '🌙'
    case 'night': return '🌃'
  }
}

// 던전 타입 라벨
export function getDungeonTypeLabel(type: DungeonType): string {
  switch (type) {
    case 'transcend': return '초월'
    case 'expedition': return '원정'
    case 'sanctuary': return '성역'
    case 'subjugation': return '토벌전'
    case 'pvp': return 'PVP'
  }
}

// 상대 시간 계산
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR')
}

// 남은 시간 계산 (예약 파티용)
export function getRemainingTime(dateString: string, timeString: string): string {
  const dateTime = new Date(`${dateString}T${timeString}`)
  const now = new Date()
  const diffMs = dateTime.getTime() - now.getTime()

  if (diffMs <= 0) return '시작됨'

  const diffMin = Math.floor(diffMs / (1000 * 60))
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 60) return `${diffMin}분 후`
  if (diffHour < 24) return `${diffHour}시간 후`
  if (diffDay === 1) return '내일'
  return `${diffDay}일 후`
}
