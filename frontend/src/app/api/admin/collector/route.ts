import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/adminAuth'
import {
    CollectorState,
    CollectorConfig,
    CollectorLog,
    INITIAL_COLLECTOR_STATE,
    DEFAULT_COLLECTOR_CONFIG
} from '@/types/collector'
import { SERVERS } from '@/app/constants/servers'

// In-memory state (서버 재시작 시 초기화됨)
// 프로덕션에서는 Redis나 DB에 저장 권장
let collectorState: CollectorState = { ...INITIAL_COLLECTOR_STATE }
let collectorConfig: CollectorConfig = { ...DEFAULT_COLLECTOR_CONFIG }
let collectorLogs: CollectorLog[] = []
let isCollecting = false
let shouldStop = false
let shouldPause = false

// Supabase 클라이언트
const getSupabase = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createClient(url, key)
}

// 로그 추가
const addLog = (type: CollectorLog['type'], message: string, details?: any) => {
    const log: CollectorLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type,
        message,
        details
    }
    collectorLogs.unshift(log)
    // 최대 100개 로그 유지
    if (collectorLogs.length > 100) {
        collectorLogs = collectorLogs.slice(0, 100)
    }
}

// 캐릭터 검색 API 호출
const searchCharacters = async (keyword: string, serverId: string, page: number) => {
    const url = new URL('https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character')
    url.searchParams.append('keyword', keyword)
    url.searchParams.append('page', page.toString())
    url.searchParams.append('size', collectorConfig.pageSize.toString())
    url.searchParams.append('serverId', serverId)

    const response = await fetch(url.toString(), {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://aion2.plaync.com/',
            'Accept': 'application/json'
        }
    })

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
    }

    return await response.json()
}

// pcId -> 직업명 매핑 (supabaseApi.ts와 동일)
const PC_ID_TO_CLASS: Record<number, string> = {
    // 전사 계열 (Warrior)
    6: '검성', 7: '검성', 8: '검성', 9: '검성',
    10: '수호성', 11: '수호성', 12: '수호성', 13: '수호성',
    // 정찰 계열 (Scout)
    14: '궁성', 15: '궁성', 16: '궁성', 17: '궁성',
    18: '살성', 19: '살성', 20: '살성', 21: '살성',
    // 법사 계열 (Mage)
    22: '정령성', 23: '정령성', 24: '정령성', 25: '정령성',
    26: '마도성', 27: '마도성', 28: '마도성', 29: '마도성',
    // 성직자 계열 (Priest)
    30: '치유성', 31: '치유성', 32: '치유성', 33: '치유성',
    34: '호법성', 35: '호법성', 36: '호법성', 37: '호법성',
    // 기공사 계열
    38: '기공사', 39: '기공사', 40: '기공사', 41: '기공사',
    // 기본 직업 (전직 전)
    1: '전사', 2: '정찰병', 3: '법사', 4: '사제', 5: '기공사'
}

// 캐릭터 데이터 저장
const saveCharacters = async (characters: any[], serverId: string) => {
    if (characters.length === 0) return 0

    const supabase = getSupabase()

    const mappedChars = characters.map((char: any) => ({
        character_id: decodeURIComponent(char.characterId),
        server_id: parseInt(serverId),
        name: char.name?.replace(/<[^>]*>/g, '') || 'Unknown',
        level: char.level || 1,
        class_name: PC_ID_TO_CLASS[char.pcId] || char.className || 'Unknown',
        race_name: char.race === 1 ? 'Elyos' : 'Asmodian',
        profile_image: char.profileImageUrl ?
            (char.profileImageUrl.startsWith('http') ? char.profileImageUrl : `https://profileimg.plaync.com${char.profileImageUrl}`)
            : null,
        updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
        .from('characters')
        .upsert(mappedChars, {
            onConflict: 'character_id',
            ignoreDuplicates: false
        })

    if (error) {
        console.error('Save error:', error)
        throw error
    }

    return mappedChars.length
}

// 수집 실행 (비동기)
const runCollection = async () => {
    if (isCollecting) return

    isCollecting = true
    shouldStop = false
    shouldPause = false

    const servers = collectorConfig.enabledServers.length > 0
        ? SERVERS.filter(s => collectorConfig.enabledServers.includes(s.id))
        : SERVERS

    const keywords = collectorConfig.keywords
    const totalTasks = servers.length * keywords.length
    let completedTasks = 0

    collectorState = {
        ...collectorState,
        status: 'running',
        startedAt: new Date().toISOString(),
        totalCollected: 0,
        totalErrors: 0,
        progress: 0
    }

    addLog('info', `수집 시작: ${servers.length}개 서버, ${keywords.length}개 키워드`)

    try {
        for (const server of servers) {
            if (shouldStop) break

            for (const keyword of keywords) {
                if (shouldStop) break

                // 일시정지 처리
                while (shouldPause && !shouldStop) {
                    collectorState.status = 'paused'
                    await new Promise(r => setTimeout(r, 1000))
                }
                if (shouldStop) break

                collectorState.status = 'running'
                collectorState.currentKeyword = keyword
                collectorState.currentServer = server.id
                collectorState.currentServerName = server.name

                let page = 1
                let hasMore = true

                while (hasMore && !shouldStop && !shouldPause) {
                    try {
                        collectorState.currentPage = page
                        collectorState.lastUpdatedAt = new Date().toISOString()

                        const result = await searchCharacters(keyword, server.id, page)

                        if (result.list && result.list.length > 0) {
                            const saved = await saveCharacters(result.list, server.id)
                            collectorState.totalCollected += saved

                            // 다음 페이지 확인
                            const pagination = result.pagination
                            hasMore = page < pagination.endPage && result.list.length === collectorConfig.pageSize
                            page++
                        } else {
                            hasMore = false
                        }

                        // 속도 제한 대기
                        await new Promise(r => setTimeout(r, collectorConfig.delayMs))

                    } catch (err: any) {
                        collectorState.totalErrors++
                        addLog('error', `오류: ${keyword} (${server.name}) p${page}`, err.message)

                        // 재시도 로직
                        await new Promise(r => setTimeout(r, collectorConfig.delayMs * 2))
                        hasMore = false // 다음 키워드로 이동
                    }
                }

                completedTasks++
                collectorState.progress = Math.round((completedTasks / totalTasks) * 100)

                // 예상 남은 시간 계산
                const elapsed = Date.now() - new Date(collectorState.startedAt!).getTime()
                const remaining = (elapsed / completedTasks) * (totalTasks - completedTasks)
                collectorState.estimatedRemaining = formatDuration(remaining)

                addLog('success', `완료: "${keyword}" (${server.name}) - ${collectorState.totalCollected}명 수집`)
            }
        }

        collectorState.status = shouldStop ? 'stopped' : 'idle'
        collectorState.progress = shouldStop ? collectorState.progress : 100
        addLog('info', `수집 ${shouldStop ? '중지됨' : '완료'}: 총 ${collectorState.totalCollected}명`)

    } catch (err: any) {
        collectorState.status = 'error'
        collectorState.errorMessage = err.message
        addLog('error', `치명적 오류: ${err.message}`)
    } finally {
        isCollecting = false
    }
}

// 시간 포맷
const formatDuration = (ms: number): string => {
    if (ms < 0) return '-'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `약 ${hours}시간 ${minutes % 60}분`
    if (minutes > 0) return `약 ${minutes}분`
    return `약 ${seconds}초`
}

// GET: 상태 조회
export async function GET(request: NextRequest) {
    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }

    const type = request.nextUrl.searchParams.get('type') || 'status'

    switch (type) {
        case 'status':
            return NextResponse.json({
                state: collectorState,
                isRunning: isCollecting
            })
        case 'config':
            return NextResponse.json(collectorConfig)
        case 'logs':
            return NextResponse.json(collectorLogs.slice(0, 50))
        default:
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }
}

// POST: 제어 명령
export async function POST(request: NextRequest) {
    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }

    const body = await request.json()
    const { action, config } = body

    switch (action) {
        case 'start':
            if (isCollecting) {
                return NextResponse.json({ error: '이미 수집 중입니다' }, { status: 400 })
            }
            // 비동기로 수집 시작
            runCollection()
            addLog('info', '수집 시작 요청됨')
            return NextResponse.json({ success: true, message: '수집을 시작합니다' })

        case 'pause':
            shouldPause = true
            addLog('info', '일시정지 요청됨')
            return NextResponse.json({ success: true, message: '일시정지합니다' })

        case 'resume':
            shouldPause = false
            addLog('info', '재개 요청됨')
            return NextResponse.json({ success: true, message: '재개합니다' })

        case 'stop':
            shouldStop = true
            shouldPause = false
            addLog('info', '중지 요청됨')
            return NextResponse.json({ success: true, message: '중지합니다' })

        case 'updateConfig':
            if (config) {
                collectorConfig = { ...collectorConfig, ...config }
                addLog('info', '설정 변경됨', config)
                return NextResponse.json({ success: true, config: collectorConfig })
            }
            return NextResponse.json({ error: 'Config required' }, { status: 400 })

        case 'reset':
            collectorState = { ...INITIAL_COLLECTOR_STATE }
            collectorLogs = []
            addLog('info', '상태 초기화됨')
            return NextResponse.json({ success: true, message: '초기화되었습니다' })

        default:
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
}
