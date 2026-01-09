'use client'

import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Adaptive breakpoints (fixed widths)
export const ADAPTIVE_BREAKPOINTS = {
    mobile: 768,    // <= 768px
    tablet: 1024,   // 769px - 1024px
    desktop: 1025   // >= 1025px
} as const

export const ADAPTIVE_WIDTHS = {
    mobile: '100%',
    tablet: '768px',
    desktop: '1200px'
} as const

export function useDeviceType(): DeviceType {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

    useEffect(() => {
        const getDeviceType = (): DeviceType => {
            const width = window.innerWidth
            if (width <= ADAPTIVE_BREAKPOINTS.mobile) return 'mobile'
            if (width <= ADAPTIVE_BREAKPOINTS.tablet) return 'tablet'
            return 'desktop'
        }

        // Initial check
        setDeviceType(getDeviceType())

        // Only update on resize crossing breakpoints
        let currentType = getDeviceType()

        const handleResize = () => {
            const newType = getDeviceType()
            if (newType !== currentType) {
                currentType = newType
                setDeviceType(newType)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return deviceType
}

export function useIsMobile(): boolean {
    const deviceType = useDeviceType()
    return deviceType === 'mobile'
}

export function useIsTablet(): boolean {
    const deviceType = useDeviceType()
    return deviceType === 'tablet'
}

export function useIsDesktop(): boolean {
    const deviceType = useDeviceType()
    return deviceType === 'desktop'
}
