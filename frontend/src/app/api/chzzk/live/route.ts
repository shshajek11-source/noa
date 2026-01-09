import { NextResponse } from 'next/server'
import { ChzzkService } from '@/lib/chzzk'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Fetch all AION2 streams sorted by popularity
        const lives = await ChzzkService.searchLives()

        return NextResponse.json({
            success: true,
            data: lives
        })
    } catch (error) {
        console.error('Failed to fetch Chzzk lives:', error)
        return NextResponse.json(
            { success: false, error: 'Internal Server Error', data: [] },
            { status: 500 }
        )
    }
}
