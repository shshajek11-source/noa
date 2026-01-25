import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// /ranking/noa → /ranking 리다이렉트 (하위 호환)
export default function HitonRankingPage() {
    redirect('/ranking')
}
