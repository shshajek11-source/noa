'use client'

import { useState, useEffect, useCallback } from 'react'

export const MAIN_CHARACTER_KEY = 'aion2_main_character'

export interface MainCharacter {
    characterId: string
    name: string
    server: string
    server_id?: number
    race: string
    className?: string
    level?: number
    hit_score?: number
    item_level?: number
    imageUrl?: string
    setAt: number
}

export interface UseMainCharacterReturn {
    /** 현재 대표 캐릭터 */
    mainCharacter: MainCharacter | null
    /** 대표 캐릭터 설정 */
    setMainCharacter: (character: MainCharacter | null) => void
    /** 대표 캐릭터 삭제 */
    clearMainCharacter: () => void
    /** 로딩 완료 여부 */
    isLoaded: boolean
}

/**
 * 대표 캐릭터 관리 훅
 *
 * localStorage에 저장된 대표 캐릭터를 관리합니다.
 * 여러 컴포넌트에서 동기화된 상태를 유지합니다.
 *
 * @example
 * ```tsx
 * const { mainCharacter, setMainCharacter } = useMainCharacter()
 * ```
 */
export function useMainCharacter(): UseMainCharacterReturn {
    const [mainCharacter, setMainCharacterState] = useState<MainCharacter | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    // 초기 로드
    useEffect(() => {
        try {
            const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
            if (saved) {
                const parsed = JSON.parse(saved)
                setMainCharacterState(parsed)
            }
        } catch (e) {
            console.error('[useMainCharacter] Failed to load:', e)
        }
        setIsLoaded(true)
    }, [])

    // 다른 탭/컴포넌트에서의 변경 감지
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === MAIN_CHARACTER_KEY) {
                try {
                    if (e.newValue) {
                        setMainCharacterState(JSON.parse(e.newValue))
                    } else {
                        setMainCharacterState(null)
                    }
                } catch (err) {
                    console.error('[useMainCharacter] Failed to parse storage event:', err)
                }
            }
        }

        // 커스텀 이벤트로 같은 탭 내 동기화
        const handleCustomEvent = () => {
            try {
                const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
                if (saved) {
                    setMainCharacterState(JSON.parse(saved))
                } else {
                    setMainCharacterState(null)
                }
            } catch (err) {
                console.error('[useMainCharacter] Failed to handle custom event:', err)
            }
        }

        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('mainCharacterChanged', handleCustomEvent)

        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('mainCharacterChanged', handleCustomEvent)
        }
    }, [])

    // 대표 캐릭터 설정
    const setMainCharacter = useCallback((character: MainCharacter | null) => {
        try {
            if (character) {
                // HTML 태그 제거
                const cleanCharacter: MainCharacter = {
                    ...character,
                    name: character.name.replace(/<\/?[^>]+(>|$)/g, ''),
                    setAt: Date.now()
                }
                localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(cleanCharacter))
                setMainCharacterState(cleanCharacter)
            } else {
                localStorage.removeItem(MAIN_CHARACTER_KEY)
                setMainCharacterState(null)
            }

            // 같은 탭 내 다른 컴포넌트에 알림
            window.dispatchEvent(new Event('mainCharacterChanged'))
        } catch (e) {
            console.error('[useMainCharacter] Failed to save:', e)
        }
    }, [])

    // 대표 캐릭터 삭제
    const clearMainCharacter = useCallback(() => {
        setMainCharacter(null)
    }, [setMainCharacter])

    return {
        mainCharacter,
        setMainCharacter,
        clearMainCharacter,
        isLoaded
    }
}

export default useMainCharacter
