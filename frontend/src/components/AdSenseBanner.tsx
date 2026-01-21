'use client'

import { useEffect, useRef } from 'react'

interface AdSenseBannerProps {
  adSlot?: string
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical'
  fullWidthResponsive?: boolean
  style?: React.CSSProperties
  className?: string
}

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

export default function AdSenseBanner({
  adSlot = '',
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
  className
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const isAdLoaded = useRef(false)

  useEffect(() => {
    if (isAdLoaded.current) return

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
        isAdLoaded.current = true
      }
    } catch (err) {
      console.error('[AdSense] Error loading ad:', err)
    }
  }, [])

  return (
    <div className={className} style={{ minHeight: '100px', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          minHeight: '100px'
        }}
        data-ad-client="ca-pub-2302283411324365"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  )
}
