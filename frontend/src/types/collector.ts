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
    maxPages: number         // 키워드당 최대 페이지 수
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

// 체크포인트 (진행 상황 저장)
export interface CollectorCheckpoint {
    keywordIndex: number      // 현재 키워드 인덱스
    serverIndex: number       // 현재 서버 인덱스
    totalCollected: number    // 총 수집된 캐릭터 수
    lastKeyword: string       // 마지막 키워드
    lastServer: string        // 마지막 서버
    savedAt: string           // 저장 시간
}

export const DEFAULT_COLLECTOR_CONFIG: CollectorConfig = {
    delayMs: 3000,           // 3초 간격 (안전)
    pageSize: 30,            // 최대값
    maxPages: 5,             // 키워드당 최대 5페이지 (150명)
    maxRetries: 3,
    enabledServers: [],      // 빈 배열 = 전체 서버
    keywords: [
        // ㄱ 계열 (10개)
        '가','갸','거','겨','고','교','구','규','그','기',
        // ㄲ 계열 (10개)
        '까','꺄','꺼','껴','꼬','꾜','꾸','뀨','끄','끼',
        // ㄴ 계열 (10개)
        '나','냐','너','녀','노','뇨','누','뉴','느','니',
        // ㄷ 계열 (10개)
        '다','댜','더','뎌','도','됴','두','듀','드','디',
        // ㄸ 계열 (10개)
        '따','땨','떠','뗘','또','뚀','뚜','뜌','뜨','띠',
        // ㄹ 계열 (10개)
        '라','랴','러','려','로','료','루','류','르','리',
        // ㅁ 계열 (10개)
        '마','먀','머','며','모','묘','무','뮤','므','미',
        // ㅂ 계열 (10개)
        '바','뱌','버','벼','보','뵤','부','뷰','브','비',
        // ㅃ 계열 (10개)
        '빠','뺘','뻐','뼈','뽀','뾰','뿌','쀼','쁘','삐',
        // ㅅ 계열 (10개)
        '사','샤','서','셔','소','쇼','수','슈','스','시',
        // ㅆ 계열 (10개)
        '싸','쌰','써','쎠','쏘','쑈','쑤','쓔','쓰','씨',
        // ㅇ 계열 (10개)
        '아','야','어','여','오','요','우','유','으','이',
        // ㅈ 계열 (10개)
        '자','쟈','저','져','조','죠','주','쥬','즈','지',
        // ㅉ 계열 (10개)
        '짜','쨔','쩌','쪄','쪼','쬬','쭈','쮸','쯔','찌',
        // ㅊ 계열 (10개)
        '차','챠','처','쳐','초','쵸','추','츄','츠','치',
        // ㅋ 계열 (10개)
        '카','캬','커','켜','코','쿄','쿠','큐','크','키',
        // ㅌ 계열 (10개)
        '타','탸','터','텨','토','툐','투','튜','트','티',
        // ㅍ 계열 (10개)
        '파','퍄','퍼','펴','포','표','푸','퓨','프','피',
        // ㅎ 계열 (10개)
        '하','햐','허','혀','호','효','후','휴','흐','히',
        // 게임 닉네임 인기 패턴 (30개)
        '검','용','암','흑','백','천','신','왕','불','광',
        '성','독','월','혼','랑','풍','설','빛','별','달',
        '해','밤','꽃','눈','얼','칼','창','활','봉','령',
        // 숫자 (10개)
        '0','1','2','3','4','5','6','7','8','9',
        // 영문 소문자 (26개)
        'a','b','c','d','e','f','g','h','i','j','k','l','m',
        'n','o','p','q','r','s','t','u','v','w','x','y','z',
        // 영문 대문자 (26개)
        'A','B','C','D','E','F','G','H','I','J','K','L','M',
        'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
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
