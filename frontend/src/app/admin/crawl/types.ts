// Crawl Settings Types

export interface SpeedSettings {
    requestDelay: number        // ms between each API call (500-5000)
    batchSize: number           // servers per batch (1-10)
    contentCooldown: number     // ms between content types (1000-10000)
    maxConcurrent: number       // max concurrent requests (1-5)
}

export interface SmartSettings {
    autoSlowdown: boolean       // auto increase delay on errors
    slowdownMultiplier: number  // multiply delay by this on error (1.5-3)
    retryCount: number          // retry failed requests (0-5)
    retryDelay: number          // ms before retry (1000-5000)
    skipRecentHours: number     // skip if updated within X hours (0-72)
    resumeEnabled: boolean      // enable resume from checkpoint
}

export interface ScheduleSettings {
    autoRunEnabled: boolean     // enable auto run
    autoRunInterval: number     // minutes between auto runs (5-1440)
    scheduledTime: string       // HH:MM format for scheduled run
    scheduledDays: number[]     // 0-6 (Sun-Sat) for weekly schedule
    repeatEnabled: boolean      // enable repeat scheduling
}

export interface SafetySettings {
    maxConsecutiveErrors: number  // stop after X consecutive errors (3-20)
    dailyRequestLimit: number     // max requests per day (0=unlimited)
    emergencyStopEnabled: boolean // show emergency stop button
    pauseOnError: boolean         // pause instead of continue on error
}

export interface CrawlSettings {
    speed: SpeedSettings
    smart: SmartSettings
    schedule: ScheduleSettings
    safety: SafetySettings
}

export interface CrawlProgress {
    current: number
    total: number
    percentage: number
    startTime: number | null
    estimatedEndTime: number | null
}

export interface CrawlStats {
    inserted: number
    updated: number
    skipped: number
    errors: number
    retries: number
    totalRequests: number
    successRate: number
}

export interface CrawlCheckpoint {
    contentIndex: number
    serverIndex: number
    timestamp: number
    selectedContents: number[]
    selectedServers: string[]
}

export interface CrawlHistory {
    id: string
    startTime: number
    endTime: number | null
    status: 'completed' | 'stopped' | 'error'
    stats: CrawlStats
    settings: CrawlSettings
}

// Default Settings
export const DEFAULT_SETTINGS: CrawlSettings = {
    speed: {
        requestDelay: 1000,
        batchSize: 1,
        contentCooldown: 2000,
        maxConcurrent: 1
    },
    smart: {
        autoSlowdown: true,
        slowdownMultiplier: 1.5,
        retryCount: 2,
        retryDelay: 2000,
        skipRecentHours: 24,
        resumeEnabled: true
    },
    schedule: {
        autoRunEnabled: false,
        autoRunInterval: 60,
        scheduledTime: '03:00',
        scheduledDays: [0, 1, 2, 3, 4, 5, 6],
        repeatEnabled: false
    },
    safety: {
        maxConsecutiveErrors: 10,
        dailyRequestLimit: 0,
        emergencyStopEnabled: true,
        pauseOnError: false
    }
}

// Content Types
export const CONTENT_TYPES = [
    { id: 1, name: '어비스 포인트', icon: '⚔️', color: '#EF4444' },
    { id: 2, name: '초월', icon: '🔥', color: '#F59E0B' },
    { id: 3, name: '악몽', icon: '👻', color: '#8B5CF6' },
    { id: 4, name: '고독의 투기장', icon: '🗡️', color: '#3B82F6' },
    { id: 5, name: '협력의 투기장', icon: '🤝', color: '#10B981' },
    { id: 6, name: '토벌전', icon: '🏰', color: '#EC4899' },
    { id: 7, name: '각성전', icon: '✨', color: '#FACC15' },
]
