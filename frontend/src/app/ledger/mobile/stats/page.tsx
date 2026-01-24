'use client'

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

// 더미 데이터 (나중에 API로 교체)
const DUMMY_DATA = {
    month: '2026-01',
    totalIncome: 12345000,
    dailyIncome: [
        80, 56, 100, 32, 48, 72, 90, 45, 88, 65,
        78, 92, 55, 40, 85, 95, 60, 70, 82, 58,
        75, 68, 88, 52, 0, 0, 0, 0, 0, 0, 0
    ], // 만 키나 단위
    contentStats: {
        transcend: 4500000,
        expedition: 3800000,
        sanctuary: 2000000,
    },
    itemSales: 2540000,
    characterStats: [
        { id: '1', name: '김간호사', faction: 'light', income: 6200000 },
        { id: '2', name: '대학', faction: 'dark', income: 4100000 },
    ]
}

export default function MonthlyStatsPage() {
    const router = useRouter()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // 이번 달 일수
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()

    // 차트 데이터
    const chartData = {
        labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
        datasets: [
            {
                label: '일별 수입 (만)',
                data: DUMMY_DATA.dailyIncome.slice(0, daysInMonth),
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

    // 컨텐츠 소계
    const contentSubtotal =
        DUMMY_DATA.contentStats.transcend +
        DUMMY_DATA.contentStats.expedition +
        DUMMY_DATA.contentStats.sanctuary

    return (
        <div className={styles.container}>
            {/* 헤더 */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()}>
                    ←
                </button>
                <h1 className={styles.title}>{currentYear}년 {currentMonth}월 통계</h1>
            </div>

            {/* 총 수입 카드 */}
            <div className={styles.totalCard}>
                <div className={styles.totalLabel}>이번 달 총 수입</div>
                <div className={styles.totalValue}>
                    {DUMMY_DATA.totalIncome.toLocaleString()} 키나
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
                    <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>초월</span>
                        <span className={styles.statsValue}>{formatKina(DUMMY_DATA.contentStats.transcend)}</span>
                    </div>
                    <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>원정</span>
                        <span className={styles.statsValue}>{formatKina(DUMMY_DATA.contentStats.expedition)}</span>
                    </div>
                    <div className={styles.statsRow}>
                        <span className={styles.statsLabel}>성역</span>
                        <span className={styles.statsValue}>{formatKina(DUMMY_DATA.contentStats.sanctuary)}</span>
                    </div>
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
                        <span className={styles.statsValue}>{formatKina(DUMMY_DATA.itemSales)}</span>
                    </div>
                </div>
            </div>

            {/* 캐릭터별 수입 */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>캐릭터별 수입</div>
                <div className={styles.statsList}>
                    {DUMMY_DATA.characterStats.map(char => (
                        <div key={char.id} className={styles.statsRow}>
                            <span className={styles.statsLabel}>
                                <span
                                    className={styles.factionDot}
                                    style={{
                                        backgroundColor: char.faction === 'light' ? '#2DD4BF' : '#A78BFA'
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
