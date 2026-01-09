export interface ChzzkLiveInfo {
    liveId: number
    liveTitle: string
    status: 'OPEN' | 'CLOSE'
    liveImageUrl: string
    defaultThumbnailImageUrl: string
    concurrentUserCount: number
    openDate: string
    channel: {
        channelId: string
        channelName: string
        channelImageUrl: string
        verifiedMark: boolean
    }
}

export class ChzzkService {
    /**
     * Get AION2 live streams from Chzzk category page
     * Sorted by viewer count (popularity)
     */
    static async searchLives(): Promise<ChzzkLiveInfo[]> {
        try {
            // Fetch AION2 category lives directly - sorted by popularity
            const response = await fetch(
                `https://api.chzzk.naver.com/service/v2/categories/GAME/AION2/lives?size=50&sortType=POPULAR`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                }
            )

            if (!response.ok) {
                console.error(`Chzzk Category API Error: ${response.status}`)
                return []
            }

            const data = await response.json()

            if (!data?.content?.data?.length) {
                console.warn('No AION2 streams found')
                return []
            }

            // Map to ChzzkLiveInfo structure - return all AION2 streams sorted by popularity
            return data.content.data.map((item: any) => ({
                liveId: item.liveId,
                liveTitle: item.liveTitle || '',
                status: 'OPEN' as const,
                liveImageUrl: item.liveImageUrl || item.defaultThumbnailImageUrl || '',
                defaultThumbnailImageUrl: item.defaultThumbnailImageUrl || '',
                concurrentUserCount: item.concurrentUserCount || 0,
                openDate: item.openDate || '',
                channel: {
                    channelId: item.channel?.channelId || '',
                    channelName: item.channel?.channelName || '',
                    channelImageUrl: item.channel?.channelImageUrl || '',
                    verifiedMark: item.channel?.verifiedMark || false
                }
            }))
        } catch (error) {
            console.error('Chzzk API Request Failed:', error)
            return []
        }
    }
}
