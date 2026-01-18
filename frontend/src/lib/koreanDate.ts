/**
 * 한국 시간 유틸리티
 * AION2 게임은 새벽 5시에 일일 리셋됨
 */

/**
 * 한국 시간 기준 게임 날짜 계산 (새벽 5시 기준)
 * @returns YYYY-MM-DD 형식의 게임 날짜
 */
export function getKoreanGameDate(): string {
  const now = new Date()
  // 한국 시간으로 변환 (UTC+9)
  const koreaOffset = 9 * 60 // 분 단위
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  const koreaTime = new Date(utcTime + (koreaOffset * 60000))

  // 새벽 5시 이전이면 전날 날짜 사용
  if (koreaTime.getHours() < 5) {
    koreaTime.setDate(koreaTime.getDate() - 1)
  }

  // YYYY-MM-DD 형식으로 반환
  const year = koreaTime.getFullYear()
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0')
  const day = String(koreaTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 한국 시간 기준 게임 날짜+시간 계산 (새벽 5시 기준)
 * @returns ISO 형식의 게임 날짜시간 (YYYY-MM-DDTHH:mm:ss)
 */
export function getKoreanGameDateTime(): string {
  const now = new Date()
  // 한국 시간으로 변환 (UTC+9)
  const koreaOffset = 9 * 60 // 분 단위
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  const koreaTime = new Date(utcTime + (koreaOffset * 60000))

  // 새벽 5시 이전이면 전날 날짜 사용
  if (koreaTime.getHours() < 5) {
    koreaTime.setDate(koreaTime.getDate() - 1)
  }

  // ISO 형식으로 반환하되, 날짜는 게임 날짜 기준
  const year = koreaTime.getFullYear()
  const month = String(koreaTime.getMonth() + 1).padStart(2, '0')
  const day = String(koreaTime.getDate()).padStart(2, '0')
  const hours = String(koreaTime.getHours()).padStart(2, '0')
  const minutes = String(koreaTime.getMinutes()).padStart(2, '0')
  const seconds = String(koreaTime.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * 현재 한국 시간 반환
 * @returns Date 객체 (한국 시간)
 */
export function getKoreanTime(): Date {
  const now = new Date()
  const koreaOffset = 9 * 60
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utcTime + (koreaOffset * 60000))
}
