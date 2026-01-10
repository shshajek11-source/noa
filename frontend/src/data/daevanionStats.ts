/**
 * 대바니온 보드별 활성화 노드에 따른 스탯 보너스
 * 이미지 출처: frontend/public/오류/2.png
 */

export interface DaevanionBoardStats {
  boardId: number
  name: string
  // 노드 개수별 스탯 매핑 (key: openNodeCount, value: stats)
  statsByNodeCount: Record<number, DaevanionStats>
}

export interface DaevanionStats {
  // 고정 수치 보너스
  생명력?: number
  정신력?: number
  '치명타 저항'?: number
  '추가 공격력'?: number
  치명타?: number
  '추가 방어력'?: number
  공격력?: number
  방어력?: number
  명중?: number
  회피?: number
  막기?: number

  // PVE 스탯
  'PVE 공격력'?: number
  'PVE 방어력'?: number
  'PVE 명중'?: number
  'PVE 회피'?: number
  '보스 공격력'?: number
  '보스 방어력'?: number

  // PVP 스탯
  'PVP 공격력'?: number
  'PVP 방어력'?: number
  'PVP 명중'?: number
  'PVP 회피'?: number
  'PVP 치명타'?: number
  'PVP 치명타 저항'?: number

  // 비율 보너스
  '재사용 시간 감소'?: number // %
  '전투 속도'?: number // %
  '이동 속도'?: number // %
  '공격력 증가'?: number // %
  '방어력 증가'?: number // %
  '치명타 증가'?: number // %
  '피해 증폭'?: number // %
  '피해 내성'?: number // %
  '치명타 피해 증폭'?: number // %
  '치명타 피해 내성'?: number // %
  '다단 히트 적중'?: number // %
  '다단 히트 저항'?: number // %

  // 스킬 레벨 증가 (나중에 필요시 추가)
  skills?: Record<string, number>
}

/**
 * 대바니온 보드 스탯 데이터
 * TODO: 각 보드의 노드 개수별 정확한 스탯을 게임 내에서 확인하여 추가 필요
 */
export const DAEVANION_BOARD_STATS: DaevanionBoardStats[] = [
  {
    boardId: 41,
    name: '네자칸',
    statsByNodeCount: {
      85: {
        생명력: 1100,
        정신력: 450,
        '치명타 저항': 90,
        '추가 공격력': 50,
        치명타: 100,
        '재사용 시간 감소': 5,
        '전투 속도': 5,
        '추가 방어력': 500,
      }
    }
  },
  {
    boardId: 42,
    name: '지켈',
    statsByNodeCount: {
      75: {
        '피해 내성': 10,
        생명력: 700,
        정신력: 250,
        '피해 증폭': 10,
        '치명타 저항': 70,
        '추가 공격력': 55,
        치명타: 100,
        '추가 방어력': 450,
      }
    }
  },
  {
    boardId: 43,
    name: '바이젤',
    statsByNodeCount: {
      81: {
        생명력: 700,
        '치명타 피해 증폭': 10,
        정신력: 450,
        '치명타 저항': 80,
        '추가 공격력': 50,
        '치명타 피해 내성': 10,
        치명타: 110,
        '추가 방어력': 500,
      }
    }
  },
  {
    boardId: 44,
    name: '트리니엘',
    statsByNodeCount: {
      103: {
        생명력: 1200,
        정신력: 600,
        '다단 히트 저항': 9,
        '치명타 저항': 90,
        '추가 공격력': 70,
        치명타: 150,
        '다단 히트 적중': 9,
        '추가 방어력': 650,
      }
    }
  },
  {
    boardId: 45,
    name: '아리엘',
    statsByNodeCount: {
      9: {
        'PVE 공격력': 10,
        'PVE 회피': 20,
        정신력: 50,
        '보스 공격력': 5,
        '보스 방어력': 50,
        'PVE 명중': 20,
        'PVE 방어력': 50,
      }
    }
  },
  {
    boardId: 46,
    name: '아스펠',
    statsByNodeCount: {
      5: {
        'PVP 치명타 저항': 5,
        정신력: 50,
        'PVP 치명타': 5,
        'PVP 회피': 10,
        'PVP 공격력': 10,
      }
    }
  }
]

/**
 * 활성화된 노드 개수에 따라 대바니온 스탯 반환
 * @param boardId 보드 ID
 * @param openNodeCount 활성화된 노드 개수
 * @returns 해당 노드 개수의 스탯 보너스
 */
export function getDaevanionStats(boardId: number, openNodeCount: number): DaevanionStats | null {
  const board = DAEVANION_BOARD_STATS.find(b => b.boardId === boardId)
  if (!board) return null

  // 정확한 노드 개수가 없으면 가장 가까운 값 찾기
  const counts = Object.keys(board.statsByNodeCount).map(Number).sort((a, b) => b - a)
  const closestCount = counts.find(count => count <= openNodeCount)

  return closestCount ? board.statsByNodeCount[closestCount] : null
}

/**
 * 보드 이름으로 대바니온 스탯 반환 (비례 계산 지원)
 * @param boardName 보드 이름 (네자칸, 지켈 등)
 * @param openNodeCount 활성화된 노드 개수
 * @param totalNodeCount 총 노드 개수
 * @returns 비례 계산된 스탯 보너스
 */
export function getDaevanionStatsByName(boardName: string, openNodeCount: number, totalNodeCount: number): DaevanionStats | null {
  if (!openNodeCount || openNodeCount <= 0) return null

  const board = DAEVANION_BOARD_STATS.find(b => b.name === boardName)
  if (!board) return null

  // 정의된 최대 노드 수의 스탯을 기준으로 비례 계산
  const counts = Object.keys(board.statsByNodeCount).map(Number).sort((a, b) => b - a)
  const maxDefinedCount = counts[0]
  const maxStats = board.statsByNodeCount[maxDefinedCount]

  if (!maxStats) return null

  // 활성화된 노드 수에 비례해서 스탯 계산
  // 실제 게임에서 총 노드 수가 다를 수 있으므로 totalNodeCount 사용
  const baseCount = totalNodeCount || maxDefinedCount
  const ratio = openNodeCount / baseCount

  const scaledStats: DaevanionStats = {}

  Object.entries(maxStats).forEach(([key, value]) => {
    if (key === 'skills' || typeof value !== 'number') return

    // 비례 계산 (소수점 버림)
    const scaledValue = Math.floor(value * ratio)
    if (scaledValue > 0) {
      (scaledStats as any)[key] = scaledValue
    }
  })

  return Object.keys(scaledStats).length > 0 ? scaledStats : null
}
