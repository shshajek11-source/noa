/**
 * characterId 정규화 유틸리티
 *
 * AION2 API는 characterId를 URL 인코딩된 형태로 반환할 수 있습니다.
 * 예: "abc123%3D" (인코딩) vs "abc123=" (디코딩)
 *
 * DB에는 디코딩된 형태로 저장하므로, 조회 시 항상 정규화해야 합니다.
 * 이 파일은 characterId 처리의 "단일 진실 소스(Single Source of Truth)"입니다.
 */

/**
 * characterId를 정규화 (URL 디코딩)
 *
 * @param id - 원본 characterId (인코딩 또는 디코딩된 상태)
 * @returns 정규화된 characterId (항상 디코딩된 상태)
 *
 * @example
 * normalizeCharacterId("abc%3D") // "abc="
 * normalizeCharacterId("abc=")   // "abc=" (변경 없음)
 * normalizeCharacterId("")       // ""
 */
export function normalizeCharacterId(id: string): string {
  if (!id) return id

  try {
    // URL 인코딩된 문자 (%3D, %2B 등)가 있으면 디코딩
    if (id.includes('%')) {
      return decodeURIComponent(id)
    }
    return id
  } catch {
    // 디코딩 실패 시 원본 반환
    return id
  }
}

/**
 * characterId가 같은지 비교 (정규화 후 비교)
 *
 * @param id1 - 첫 번째 characterId
 * @param id2 - 두 번째 characterId
 * @returns 같으면 true
 *
 * @example
 * isSameCharacterId("abc%3D", "abc=") // true
 */
export function isSameCharacterId(id1: string, id2: string): boolean {
  return normalizeCharacterId(id1) === normalizeCharacterId(id2)
}
