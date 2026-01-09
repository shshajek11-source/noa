// 캐릭터 수집기 타입 정의

export type CollectorStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error'

export interface CollectorState {
    status: CollectorStatus
    currentKeyword: string
    currentServer: string | null
    currentServerName: string
    currentPage: number
    totalCollected: number
    totalErrors: number
    startedAt: string | null
    lastUpdatedAt: string | null
    estimatedRemaining: string
    progress: number // 0-100
    errorMessage: string | null
}

export interface CollectorConfig {
    delayMs: number          // 요청 간 대기 시간 (ms)
    pageSize: number         // 페이지당 결과 수
    maxRetries: number       // 최대 재시도 횟수
    enabledServers: string[] // 수집할 서버 ID 목록 (string형)
    keywords: string[]       // 검색 키워드 목록
}

export interface CollectorLog {
    id: string
    timestamp: string
    type: 'info' | 'success' | 'warning' | 'error'
    message: string
    details?: any
}

export const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
    delayMs: 3000,           // 3초 간격 (안전)
    pageSize: 30,            // 최대값
    maxRetries: 3,
    enabledServers: [],      // 빈 배열 = 전체 서버
    keywords: [
        // 한글 초성 기반
        '가','나','다','라','마','바','사','아','자','차','카','타','파','하',
        // 영문
        'a','b','c','d','e','f','g','h','i','j','k','l','m',
        'n','o','p','q','r','s','t','u','v','w','x','y','z'
    ]
}

export const INITIAL_COLLECTOR_STATE: CollectorState = {
    status: 'idle',
    currentKeyword: '',
    currentServer: null,
    currentServerName: '',
    currentPage: 0,
    totalCollected: 0,
    totalErrors: 0,
    startedAt: null,
    lastUpdatedAt: null,
    estimatedRemaining: '-',
    progress: 0,
    errorMessage: null
}
