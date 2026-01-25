'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bar } from 'react-chartjs-2'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js'
import { useAuth } from '@/context/AuthContext'
import { useDeviceId } from '../../hooks/useDeviceId'
import styles from './MonthlyStats.module.css'

// Chart.js 등록
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
)

interface ContentStats {
    [key: string]: number
}

interface CharacterStat {
    id: string
    name: string
    race: string
    income: number
}

interface MonthlyData {
    month: string
    totalIncome: number
    dailyIncome: number[]
    contentStats: ContentStats
    itemSales: number
    characterStats: CharacterStat[]
}

export default function MonthlyStatsPage() {
    const router = useRouter()
    const { session, signInWithGoogle, isLoading: isAuthLoading } = useAuth()
    const { getAuthHeader } = useDeviceId()

    const [data, setData] = useState<MonthlyData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // 현재 보고 있는 월 (기본: 이번 달)
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    // 이번 달 일수
    const daysInMonth = new Date(year, month, 0).getDate()

    // 데이터 fetch
    useEffect(() => {
        if (isAuthLoading) return
        if (!session?.access_token) return

        const fetchData = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const res = await fetch(`/api/ledger/monthly-stats?year=${year}&month=${month}`, {
                    headers: getAuthHeader()
                })

                if (!res.ok) {
                    const errData = await res.json()
                    throw new Error(errData.error || '데이터를 불러올 수 없습니다')
                }

                const result = await res.json()
                setData(result)
            } catch (e: any) {
                console.error('[MonthlyStats] Fetch error:', e)
                setError(e.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [year, month, session?.access_token, isAuthLoading, getAuthHeader])

    // 이전/다음 월 이동
    const goToPrevMonth = () => {
        if (month === 1) {
            setYear(year - 1)
            setMonth(12)
        } else {
            setMonth(month - 1)
        }
    }

    const goToNextMonth = () => {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        // 이번 달 이후로는 이동 불가
        if (year === currentYear && month >= currentMonth) return

        if (month === 12) {
            setYear(year + 1)
            setMonth(1)
        } else {
            setMonth(month + 1)
        }
    }

    // 이번 달인지 확인 (다음 버튼 비활성화용)
    const isCurrentMonth = () => {
        const now = new Date()
        return year === now.getFullYear() && month === now.getMonth() + 1
    }

    // 차트 데이터
    const chartData = {
        labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
        datasets: [
            {
                label: '일별 수입 (만)',
                data: data?.dailyIncome.slice(0, daysInMonth) || [],
                backgroundColor: '#f59e0b',
                borderRadius: 4,
            }
        ]
    }

    // 차트 옵션
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: '#1a1a1a',
                titleColor: '#fff',
                bodyColor: '#f59e0b',
                borderColor: '#333',
                borderWidth: 1,
                callbacks: {
                    label: (context: any) => `${context.raw}만 키나`
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: '#222'
                },
                ticks: {
                    color: '#9CA3AF',
                    maxRotation: 0,
                    callback: function(value: any, index: number) {
                        // 5일 단위로만 표시
                        const day = index + 1
                        if (day === 1 || day % 5 === 0) return day
                        return ''
                    }
                }
            },
            y: {
                grid: {
                    color: '#222'
                },
                ticks: {
                    color: '#9CA3AF'
                },
                beginAtZero: true
            }
        }
    }

    // 숫자 포맷 (만 키나)
    const formatKina = (value: number) => {
        if (value >= 10000) {
            return `${Math.floor(value / 10000)}만`
        }
        return value.toLocaleString()
    }

    // 컨텐츠 이름 한글 변환
    const contentNameMap: Record<string, string> = {
        transcend: '초월',
        expedition: '원정',
        sanctuary: '성역',
        daily_dungeon: '일던',
        awakening: '각성',
        nightmare: '악몽',
        dimension: '차원',
        subjugation: '토벌'
    }

    // 컨텐츠 소계
    const contentSubtotal = data?.contentStats
        ? Object.values(data.contentStats).reduce((sum, val) => sum + val, 0)
        : 0

    // 로그인 안된 상태
    if (!isAuthLoading && !session?.access_token) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        ←
                    </button>
                    <h1 className={styles.title}>월간 통계</h1>
                </div>
                <div className={styles.loginRequired}>
                    <p>통계를 보려면 로그인이 필요합니다</p>
                    <button className={styles.loginBtn} onClick={signInWithGoogle}>
                        Google 로그인
                    </button>
                </div>
            </div>
        )
    }

    // 로딩 중
    if (isLoading || isAuthLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        ←
                    </button>
                    <h1 className={styles.title}>{year}년 {month}월 통계</h1>
                </div>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>데이터 불러오는 중...</p>
                </div>
            </div>
        )
    }

    // 에러
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        ←
                    </button>
                    <h1 className={styles.title}>{year}년 {month}월 통계</h1>
                </div>
                <div className={styles.error}>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    // 데이터 없음
    if (!data) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()}>
                        ←
                    </button>
                    <h1 className={styles.title}>{year}년 {month}월 통계</h1>
                </div>
                <div className={styles.empty}>
                    <p>이 달의 기록이 없습니다</p>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            {/* 헤더 */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    ←
                </button>
                <h1 className={styles.title}>{year}년 {month}월 통계</h1>
            </div>

            {/* 월 네비게이션 */}
            <div className={styles.monthNav}>
                <button className={styles.navBtn} onClick={goToPrevMonth}>
                    ← 이전
                </button>
                <span className={styles.monthLabel}>{year}.{String(month).padStart(2, '0')}</span>
                <button
                    className={styles.navBtn}
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth()}
                >
                    다음 →
                </button>
            </div>

            {/* 총 수입 카드 */}
            <div className={styles.totalCard}>
                <div className={styles.totalLabel}>이번 달 총 수입</div>
                <div className={styles.totalValue}>
                    {data.totalIncome.toLocaleString()} 키나
                </div>
            </div>

            {/* 일별 수입 그래프 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>일별 수입</div>
                <div className={styles.chartContainer}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* 컨텐츠별 수입 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>컨텐츠별 수입</div>
                <div className={styles.statsList}>
                    {Object.entries(data.contentStats).map(([key, value]) => (
                        <div key={key} className={styles.statsRow}>
                            <span className={styles.statsLabel}>
                                {contentNameMap[key] || key}
                            </span>
                            <span className={styles.statsValue}>{formatKina(value)}</span>
                        </div>
                    ))}
                    <div className={styles.statsRowTotal}>
                        <span className={styles.statsLabel}>소계</span>
                        <span className={styles.statsValue}>{formatKina(contentSubtotal)}</span>
                    </div>
                </div>
            </div>

            {/* 아이템 판매 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>아이템 판매</div>
                <div className={styles.statsList}>
                    <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>총 판매 수입</span>
                        <span className={styles.statsValue}>{formatKina(data.itemSales)}</span>
                    </div>
                </div>
            </div>

            {/* 캐릭터별 수입 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>캐릭터별 수입</div>
                <div className={styles.statsList}>
                    {data.characterStats.map(char => (
                        <div key={char.id} className={styles.statsRow}>
                            <span className={styles.statsLabel}>
                                <span
                                    className={styles.factionDot}
                                    style={{
                                        backgroundColor: char.race === '천족' || char.race?.toLowerCase() === 'elyos' ? '#2DD4BF' : '#A78BFA'
                                    }}
                                />
                                {char.name}
                            </span>
                            <span className={styles.statsValue}>{formatKina(char.income)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
