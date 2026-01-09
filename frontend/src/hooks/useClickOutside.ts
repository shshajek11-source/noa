'use client'

import { useEffect, RefObject } from 'react'

/**
 * 요소 외부 클릭 감지 훅
 *
 * @param ref - 감지할 요소의 ref
 * @param handler - 외부 클릭 시 실행할 콜백
 * @param enabled - 활성화 여부 (기본: true)
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null)
 * useClickOutside(modalRef, () => setIsOpen(false), isOpen)
 * ```
 */
export function useClickOutside<T extends HTMLElement>(
    ref: RefObject<T>,
    handler: (event: MouseEvent | TouchEvent) => void,
    enabled: boolean = true
): void {
    useEffect(() => {
        if (!enabled) return

        const listener = (event: MouseEvent | TouchEvent) => {
            const el = ref.current

            // ref 요소 내부 클릭이면 무시
            if (!el || el.contains(event.target as Node)) {
                return
            }

            handler(event)
        }

        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [ref, handler, enabled])
}

export default useClickOutside
