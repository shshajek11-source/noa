import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { name, serverId, race, page } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const url = new URL('https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character')
        url.searchParams.append('keyword', name)
        url.searchParams.append('page', (page || 1).toString())
        url.searchParams.append('size', '30')
        if (serverId) url.searchParams.append('serverId', serverId.toString())
        if (race) url.searchParams.append('race', race.toString())

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://aion2.plaync.com/',
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`AION API returned ${response.status}`)
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Proxy Search Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
