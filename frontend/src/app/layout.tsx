import './globals.css'
import Script from 'next/script'
import LayoutClient from './components/LayoutClient'

export const metadata = {
    title: 'SUGO - AION 2 캐릭터 검색 및 랭킹',
    description: 'AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스. 실시간 캐릭터 정보와 서버별 랭킹을 확인하세요.',
    keywords: 'AION 2, 아이온2, 캐릭터 검색, 랭킹, 장비, 스탯, SUGO',
    openGraph: {
        title: 'SUGO - AION 2 캐릭터 검색 및 랭킹',
        description: 'AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스',
        type: 'website',
        url: 'https://hiton.vercel.app',
        siteName: 'SUGO',
    },
    twitter: {
        card: 'summary',
        title: 'SUGO - AION 2 캐릭터 검색 및 랭킹',
        description: 'AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <meta name="google-adsense-account" content="ca-pub-2302283411324365" />
                <link rel="canonical" href="https://hiton.vercel.app" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />

                <Script
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2302283411324365"
                    crossOrigin="anonymous"
                    strategy="beforeInteractive"
                />

                {/* Google Analytics */}
                <Script
                    src="https://www.googletagmanager.com/gtag/js?id=G-6VKDP2DTV3"
                    strategy="afterInteractive"
                />
                <Script id="google-analytics" strategy="afterInteractive">
                    {`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', 'G-6VKDP2DTV3');
                    `}
                </Script>
            </head>
            <body>
                <LayoutClient>
                    {children}
                </LayoutClient>
            </body>
        </html>
    )
}
