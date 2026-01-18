import { useState, useEffect } from 'react'
import styles from '@/app/Home.module.css'

interface StatsData {
    elyosPercent: number
    asmodianPercent: number
    totalCharacters: number
    topClasses: { name: string; percent: number }[]
}

export default function ServerStatsDashboard() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch('/api/stats/overview')
                if (!res.ok) throw new Error('서버 응답 오류')

                const json = await res.json()
                if (json.totalCharacters !== undefined) {
                    setStats(json)
                } else {
                    throw new Error('데이터 형식 오류')
                }
            } catch (e) {
                console.error(e)
                setError('통계를 불러올 수 없습니다')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    // Loading State
    if (loading) {
        return (
            <section className={styles.sectionCard}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner} />
                    <span>통계 로딩중...</span>
                </div>
            </section>
        )
    }

    // Error State
    if (error || !stats) {
        return (
            <section className={`${styles.sectionCard} ${styles.errorCard}`}>
                <div className={styles.errorText}>
                    {error || '통계 데이터를 불러올 수 없습니다'}
                </div>
            </section>
        )
    }

    // Calculate derived stats
    const totalCharacters = stats.totalCharacters
    const elyosCount = Math.round(totalCharacters * (stats.elyosPercent / 100))
    const asmodianCount = Math.round(totalCharacters * (stats.asmodianPercent / 100))

    return (
        <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    서버 현황
                </h2>
                <span className={styles.sectionMeta}>
                    전체 {totalCharacters.toLocaleString()} 캐릭터
                </span>
            </div>

            <div className={styles.dashboardGrid}>
                {/* Elyos Stats */}
                <div className={`${styles.dashboardStat} ${styles.elyosStat}`}>
                    <div className={styles.statLabel}>천족</div>
                    <div className={styles.statValue} style={{ color: 'var(--elyos)' }}>
                        {elyosCount.toLocaleString()}
                    </div>
                    <div className={styles.statSubValue}>{stats.elyosPercent}%</div>
                </div>

                {/* Ratio Bar */}
                <div className={styles.ratioBarContainer}>
                    <div className={styles.ratioBar}>
                        <div
                            className={styles.ratioSegment}
                            style={{
                                width: `${stats.elyosPercent}%`,
                                backgroundColor: 'var(--elyos)'
                            }}
                        />
                        <div
                            className={styles.ratioSegment}
                            style={{
                                width: `${stats.asmodianPercent}%`,
                                backgroundColor: 'var(--asmodian)'
                            }}
                        />
                    </div>
                </div>

                {/* Asmodian Stats */}
                <div className={`${styles.dashboardStat} ${styles.asmodianStat}`}>
                    <div className={styles.statLabel}>마족</div>
                    <div className={styles.statValue} style={{ color: 'var(--asmodian)' }}>
                        {asmodianCount.toLocaleString()}
                    </div>
                    <div className={styles.statSubValue}>{stats.asmodianPercent}%</div>
                </div>
            </div>

            {/* Top Classes */}
            <div className={styles.classDistribution}>
                <h4 className={styles.classDistributionTitle}>인기 직업 TOP 3</h4>
                {stats.topClasses && stats.topClasses.length > 0 ? (
                    <div className={styles.classItemList}>
                        {stats.topClasses.map((cls, idx) => (
                            <div key={idx} className={styles.classItem}>
                                <div className={styles.className}>{cls.name}</div>
                                <div className={styles.classProgressBar}>
                                    <div
                                        className={styles.classProgressBarFill}
                                        style={{
                                            width: `${cls.percent}%`
                                        }}
                                    />
                                </div>
                                <div className={styles.classPercent}>{cls.percent}%</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>데이터 없음</div>
                )}
            </div>
        </section>
    )
}