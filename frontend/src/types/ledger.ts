// 가계부 전용 타입 정의

// 가계부 캐릭터
export interface LedgerCharacter {
  id: string
  user_id: string
  character_id?: string
  server_id?: number
  server_name: string
  name: string
  class_name: string
  race_name?: string
  race?: string
  profile_image?: string
  item_level?: number
  is_main: boolean
  display_order: number
  created_at: string
  updated_at?: string
  // 계산된 필드
  todayIncome?: number
  weeklyIncome?: number
}

// 컨텐츠 타입 정의
export interface ContentType {
  id: string
  name: string
  icon_url?: string
  display_order: number
  is_active: boolean
}

// 던전 단계/종류 정의
export interface DungeonTier {
  id: string
  content_type: string
  name: string
  default_kina: number
  display_order: number
}

// 일일 컨텐츠 기록
export interface ContentRecord {
  id: string
  ledger_character_id: string
  record_date: string
  content_type: string
  dungeon_tier: string
  max_count: number
  completion_count: number
  is_double: boolean
  base_kina: number
  total_kina: number
  notes?: string
  created_at: string
  updated_at?: string
}

// 아이템 획득 기록
export interface LedgerItem {
  id: string
  ledger_character_id: string
  item_id?: string
  item_name: string
  item_category: ItemCategory
  item_grade: ItemGrade
  quantity: number
  unit_price?: number  // 개당 가격
  total_price?: number  // 총 가격 (quantity * unit_price)
  obtained_date: string
  sold_price: number | null
  sold_date?: string  // 판매 날짜
  source_content?: string
  is_favorite?: boolean  // 즐겨찾기 여부 (조인된 필드)
  created_at: string
  updated_at?: string
}

// 아이템 카테고리
export type ItemCategory = 'equipment' | 'material' | 'wing' | 'etc'

// 아이템 등급
export type ItemGrade = 'common' | 'rare' | 'heroic' | 'legendary' | 'ultimate'

// 컨텐츠 수입 행 상태 (UI용)
export interface ContentIncomeRowState {
  contentType: string
  contentName: string
  dungeonTier: string
  maxCount: number
  completionCount: number
  isDouble: boolean
  baseKina: number
  totalKina: number
}

// 일일 통계
export interface DailyStats {
  date: string
  contentIncome: number
  itemIncome: number
  totalIncome: number
}

// 주간 통계
export interface WeeklyStats {
  startDate: string
  endDate: string
  dailyData: DailyStats[]
  totalIncome: number
  averageIncome: number
  bestDay: {
    date: string
    income: number
  }
}

// 전체 요약
export interface LedgerSummary {
  totalIncome: number
  todayIncome: number
  weeklyIncome: number
  unsoldItemCount: number
  unsoldItemsByGrade: {
    legendary: number
    heroic: number
    rare: number
    common: number
    ultimate: number
  }
}

// API 요청/응답 타입
export interface CreateCharacterRequest {
  name: string
  class_name?: string
  server_name?: string
  server_id?: number
  race_name?: string
  race?: string
  character_id?: string
  profile_image?: string
  item_level?: number
  is_main?: boolean
}

export interface UpdateContentRecordRequest {
  content_type: string
  dungeon_tier: string
  max_count: number
  completion_count: number
  is_double: boolean
  base_kina: number
}

export interface CreateItemRequest {
  item_name: string
  item_category: ItemCategory
  item_grade: ItemGrade
  quantity: number
  unit_price?: number
  total_price?: number
  source_content?: string
  item_id?: string
}

export interface UpdateItemSaleRequest {
  sold_price: number
}

// 레거시 호환 (기존 코드용)
export interface IncomeRecord {
  id: string
  label: string
  amount: number
  timeAgo: string
}

export interface IncomeSection {
  id: string
  title: string
  total: number
  records: IncomeRecord[]
}

export interface ItemSale {
  id: string
  name: string
  price: number
  icon?: React.ReactNode
  timeAgo: string
}

// 유틸리티 함수용 상수
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  equipment: '장비',
  material: '재료',
  wing: '날개',
  etc: '기타'
}

export const ITEM_GRADE_LABELS: Record<ItemGrade, string> = {
  common: '일반',
  rare: '희귀',
  heroic: '영웅',
  legendary: '전설',
  ultimate: '궁극'
}

export const ITEM_GRADE_COLORS: Record<ItemGrade, string> = {
  common: '#9CA3AF',
  rare: '#60A5FA',
  heroic: '#A78BFA',
  legendary: '#FBBF24',
  ultimate: '#F472B6'
}
