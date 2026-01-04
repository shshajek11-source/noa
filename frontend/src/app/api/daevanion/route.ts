import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('characterId')
    const serverId = searchParams.get('serverId')
    const boardId = searchParams.get('boardId')

    if (!characterId || !serverId || !boardId) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    try {
        const url = `https://aion2.plaync.com/api/character/daevanion/detail?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&boardId=${boardId}`
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'API request failed' }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Daevanion API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
