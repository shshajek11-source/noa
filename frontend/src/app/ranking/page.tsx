import RankingTable from '../components/ranking/RankingTable'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default function RankingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RankingTable type="combat" />
        </Suspense>
    )
}
