import '../../globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: '가계부 - AION 2 | HitOn',
    description: 'AION 2 게임 내 수입과 컨텐츠 진행을 관리하세요.',
}

export default function MobileLedgerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
