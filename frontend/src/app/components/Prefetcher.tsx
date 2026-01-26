'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { preload } from 'swr'
import { useAuth } from '../../context/AuthContext'

// SWR fetcher - 에러 시 조용히 실패 (프리페칭은 실패해도 괜찮음)
const silentFetcher = async (url: string) => {
    try {
        const res = await fetch(url, { credentials: 'include' })
        if (!res.ok) return null // 에러 시 null 반환 (콘솔에 안 찍힘)
        return res.json()
    } catch {
        return null // 네트워크 에러도 조용히 처리
    }
}

/**
 * 백그라운드에서 다른 페이지 데이터를 미리 로드하는 컴포넌트
 * - 사용자가 페이지 이동 시 즉시 표시되도록 캐시에 저장
 * - 로그인 상태에 따라 다른 데이터를 프리페치
 * - 에러가 발생해도 사용자 경험에 영향 없음
 */
export default function Prefetcher() {
    const pathname = usePathname()
    const { user, isLoading: authLoading } = useAuth()

    useEffect(() => {
        // 인증 로딩 중이면 대기
        if (authLoading) return

        // 약간의 딜레이 후 프리페치 (현재 페이지 로딩 우선)
        const timer = setTimeout(() => {
            // 공통: 랭킹 데이터 (비로그인도 가능)
            if (pathname !== '/ranking') {
                preload('/api/ranking?type=combat&page=1&limit=50&sort=pvp', silentFetcher)
            }

            // 로그인 상태일 때만 가계부 데이터 프리페치
            if (user) {
                if (!pathname?.startsWith('/ledger')) {
                    // 가계부 캐릭터 목록 (인증 필요)
                    preload('/api/ledger/characters', silentFetcher)
                    // 가계부 아이템 목록
                    preload('/api/ledger/items', silentFetcher)
                    // 컨텐츠 타입 목록
                    preload('/api/ledger/content-types', silentFetcher)
                }
            }

            // 파티 페이지에 있을 때 → 랭킹 프리페치
            if (pathname === '/party') {
                preload('/api/ranking?type=combat&page=1&limit=50&sort=pvp', silentFetcher)
            }

        }, 1500) // 1.5초 후 프리페치 시작

        return () => clearTimeout(timer)
    }, [pathname, user, authLoading])

    // 렌더링 없음 (백그라운드 작업만)
    return null
}
