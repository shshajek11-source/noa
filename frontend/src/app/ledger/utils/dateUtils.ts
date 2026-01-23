/**
 * 게임 리셋 기준 날짜/주간 계산 유틸리티
 * - 일일 리셋: 매일 새벽 5시
 * - 주간 리셋: 수요일 새벽 5시
 * - 모든 시간은 한국 표준시(KST, UTC+9) 기준
 */

/**
 * 한국 표준시(KST) 기준 현재 시간 반환
 * 사용자의 로컬 시간대와 관계없이 항상 한국 시간 기준으로 계산
 */
export function getKSTDate(): Date {
  const now = new Date()
  // UTC 시간 + 9시간 = KST
  const kstOffset = 9 * 60 // 9시간 = 540분
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (kstOffset * 60000))
}

/**
 * 현재 시간 기준 게임 날짜 계산 (새벽 5시 기준)
 * 예: 1월 15일 04:00 → 1월 14일로 계산
 *     1월 15일 06:00 → 1월 15일로 계산
 */
export function getGameDate(date?: Date): string {
  // 인자가 없으면 KST 현재 시간 사용
  const adjusted = date ? new Date(date) : getKSTDate()

  // 5시 이전이면 전날로 계산
  if (adjusted.getHours() < 5) {
    adjusted.setDate(adjusted.getDate() - 1)
  }

  // YYYY-MM-DD 포맷 반환
  const year = adjusted.getFullYear()
  const month = String(adjusted.getMonth() + 1).padStart(2, '0')
  const day = String(adjusted.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 주간 키 계산 (수요일 새벽 5시 기준)
 * 같은 주 내에서는 같은 키 반환
 * 예: 2026-W03 (2026년 3번째 주간)
 */
export function getWeekKey(date?: Date): string {
  // 인자가 없으면 KST 현재 시간 사용
  const adjusted = date ? new Date(date) : getKSTDate()

  // 5시 이전이면 전날로 계산
  if (adjusted.getHours() < 5) {
    adjusted.setDate(adjusted.getDate() - 1)
  }

  // 수요일(3)을 주의 시작으로 계산
  // 현재 요일 (0=일, 1=월, ..., 6=토)
  const dayOfWeek = adjusted.getDay()

  // 수요일 기준으로 며칠이 지났는지 계산
  // 수(3)->0, 목(4)->1, 금(5)->2, 토(6)->3, 일(0)->4, 월(1)->5, 화(2)->6
  const daysSinceWednesday = (dayOfWeek + 4) % 7

  // 이번 주 수요일 찾기
  const weekStart = new Date(adjusted)
  weekStart.setDate(adjusted.getDate() - daysSinceWednesday)

  // 연도와 주차 계산
  const year = weekStart.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const daysSinceStart = Math.floor((weekStart.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNumber = Math.ceil((daysSinceStart + 1) / 7)

  return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

/**
 * 특정 날짜가 수정 가능한지 확인 (당일만 수정 가능)
 */
export function isEditable(targetDate: string): boolean {
  // KST 기준 오늘 게임 날짜
  const gameToday = getGameDate()

  // 당일만 수정 가능
  return targetDate === gameToday
}

/**
 * 특정 날짜가 같은 주간에 속하는지 확인
 */
export function isSameWeek(date1: string, date2: string): boolean {
  return getWeekKey(new Date(date1)) === getWeekKey(new Date(date2))
}

/**
 * 주간 시작일 (수요일) 반환
 */
export function getWeekStartDate(date?: Date): string {
  // 인자가 없으면 KST 현재 시간 사용
  const adjusted = date ? new Date(date) : getKSTDate()

  if (adjusted.getHours() < 5) {
    adjusted.setDate(adjusted.getDate() - 1)
  }

  const dayOfWeek = adjusted.getDay()
  const daysSinceWednesday = (dayOfWeek + 4) % 7

  const weekStart = new Date(adjusted)
  weekStart.setDate(adjusted.getDate() - daysSinceWednesday)

  return formatLocalDate(weekStart)
}

/**
 * 주간 종료일 (다음 화요일) 반환
 */
export function getWeekEndDate(date?: Date): string {
  const weekStart = new Date(getWeekStartDate(date))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return formatLocalDate(weekEnd)
}

/**
 * 로컬 시간 기준으로 YYYY-MM-DD 포맷 반환
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
