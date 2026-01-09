import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SOOP_API_BASE = 'https://openapi.sooplive.co.kr'
const CLIENT_ID = process.env.SOOP_CLIENT_ID
const CLIENT_SECRET = process.env.SOOP_CLIENT_SECRET

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const race = (searchParams.get('race') || 'elyos') as 'elyos' | 'asmodian'

    try {
        // SOOP API 호출 (API 키가 없으면 빈 배열 반환)
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.warn('SOOP API credentials not configured')
            return NextResponse.json({
                success: true,
                data: []
            })
        }

        // Search for AION2 streams sorted by popularity
        const response = await fetch(
            `${SOOP_API_BASE}/v1/lives?keyword=${encodeURIComponent('아이온2')}&sort=POPULAR&size=20`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Id': CLIENT_ID,
                    'Client-Secret': CLIENT_SECRET,
                },
            }
        )

        if (!response.ok) {
            console.error(`SOOP API Error: ${response.status}`)
            return NextResponse.json({
                success: true,
                data: []
            })
        }

        const data = await response.json()

        if (!data || !data.content || !data.content.data) {
            return NextResponse.json({
                success: true,
                data: []
            })
        }

        // Filter by race keywords
        const raceKeywords = race === 'elyos'
            ? ['천족', 'elyos', '엘리오스']
            : ['마족', 'asmodian', '아스모디안']

        const allStreams = data.content.data.map((item: any) => ({
            liveId: item.liveId || item.id,
            liveTitle: item.liveTitle || item.title,
            status: 'OPEN',
            liveImageUrl: item.liveImageUrl || item.thumbnail || '',
            concurrentUserCount: item.concurrentUserCount || item.viewerCount || 0,
            channel: {
                channelId: item.channel?.channelId || item.channelId || '',
                channelName: item.channel?.channelName || item.channelName || '',
                channelImageUrl: item.channel?.channelImageUrl || '',
            }
        }))

        const filteredStreams = allStreams.filter((stream: any) => {
            const title = stream.liveTitle.toLowerCase()
            return raceKeywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()))
        })

        return NextResponse.json({
            success: true,
            data: filteredStreams.length > 0 ? filteredStreams : allStreams
        })
    } catch (error) {
        console.error('Failed to fetch SOOP lives:', error)
        return NextResponse.json({
            success: true,
            data: []
        })
    }
}
