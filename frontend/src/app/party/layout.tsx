import { Metadata } from 'next'
import SWRProvider from './SWRProvider'

export const metadata: Metadata = {
    title: '파티 찾기 - AION 2 | HitOn',
    description: 'AION 2 파티를 찾고 모집하세요.',
}

export default function PartyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <SWRProvider>{children}</SWRProvider>
}
