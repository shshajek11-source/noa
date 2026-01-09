'use client'

import { useEffect } from 'react'

/**
 * ESC 키 감지 훅
 *
 * @param handler - ESC 키 입력 시 실행할 콜백
 * @param enabled - 활성화 여부 (기본: true)
 *
 * @example
 * ```tsx
 * useEscapeKey(() => setIsOpen(false), isOpen)
 * ```
 */
export function useEscapeKey(
    handler: () => void,
    enabled: boolean = true
): void {
    useEffect(() => {
        if (!enabled) return

        const listener = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handler()
            }
        }

        document.addEventListener('keydown', listener)

        return () => {
            document.removeEventListener('keydown', listener)
        }
    }, [handler, enabled])
}

export default useEscapeKey
