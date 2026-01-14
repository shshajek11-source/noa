'use client'

import { useState } from 'react'
import ProgressBar from './ProgressBar'
import ShugoFestaCard from './ShugoFestaCard'
import AbyssHallwayCard from './AbyssHallwayCard'
import styles from './WeeklyContentSection.module.css'

interface WeeklyContentSectionProps {
  characterId: string | null
}

export default function WeeklyContentSection({ characterId }: WeeklyContentSectionProps) {
  // 왼쪽 진행도 바 상태
  const [missionCount, setMissionCount] = useState(0)
  const [weeklyOrderCount, setWeeklyOrderCount] = useState(0)
  const [abyssOrderCount, setAbyssOrderCount] = useState(0)

  // 슈고 페스타 상태
  const [shugoTickets, setShugoTickets] = useState({ base: 14, bonus: 0 })

  // 어비스 회랑 상태
  const [abyssRegions, setAbyssRegions] = useState([
    { id: 'ereshrantas_root', name: '에렌슈란타의 뿌리', enabled: false },
    { id: 'siels_wing', name: '시엘의 날개군도', enabled: false },
    { id: 'sulfur_tree', name: '유황나무섬', enabled: false }
  ])

  if (!characterId) {
    return (
      <section className={styles.section}>
        <div className={styles.placeholder}>
          캐릭터를 선택하면 주간 컨텐츠가 표시됩니다.
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>주간 지령서&슈고/회랑</h2>
      </div>

      <div className={styles.content}>
        {/* 왼쪽 65%: 진행도 바 3개 */}
        <div className={styles.leftColumn}>
          <ProgressBar
            id="mission"
            name="사명"
            icon="📜"
            currentCount={missionCount}
            maxCount={5}
            onIncrement={() => setMissionCount(prev => Math.min(5, prev + 1))}
            onDecrement={() => setMissionCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setMissionCount(5)}
          />

          <ProgressBar
            id="weekly_order"
            name="주간 지령서"
            icon="📋"
            currentCount={weeklyOrderCount}
            maxCount={12}
            onIncrement={() => setWeeklyOrderCount(prev => Math.min(12, prev + 1))}
            onDecrement={() => setWeeklyOrderCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setWeeklyOrderCount(12)}
          />

          <ProgressBar
            id="abyss_order"
            name="어비스 주간 지령서"
            icon="🔥"
            currentCount={abyssOrderCount}
            maxCount={20}
            onIncrement={() => setAbyssOrderCount(prev => Math.min(20, prev + 1))}
            onDecrement={() => setAbyssOrderCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setAbyssOrderCount(20)}
          />
        </div>

        {/* 오른쪽 35%: 슈고 페스타 & 어비스 회랑 */}
        <div className={styles.rightColumn}>
          <ShugoFestaCard
            currentTickets={shugoTickets.base}
            maxTickets={14}
            bonusTickets={shugoTickets.bonus}
          />

          <AbyssHallwayCard
            regions={abyssRegions}
            onToggleRegion={(regionId) => {
              setAbyssRegions(prev =>
                prev.map(r =>
                  r.id === regionId ? { ...r, enabled: !r.enabled } : r
                )
              )
            }}
          />
        </div>
      </div>
    </section>
  )
}
