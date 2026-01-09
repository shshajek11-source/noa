export interface LiveCardData {
    platform: 'chzzk' | 'soop'
    liveId: string
    channelId: string
    channelName: string
    title: string
    thumb: string
    viewers: number
    category: string | null
    startedAt: string | null
    link: string
}

export interface LivePreviewResponse {
    updatedAt: number
    stale: boolean
    platform: 'chzzk' | 'soop' | 'all'
    cards: LiveCardData[]
    error: string | null
}
