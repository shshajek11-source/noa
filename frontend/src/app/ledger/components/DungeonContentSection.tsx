'use client'

import { useState, useEffect } from 'react'
import ContentCard from './ContentCard'
import styles from './DungeonContentSection.module.css'

interface Boss {
  id: string
  name: string
  imageUrl: string
  kina?: number
}

interface Tier {
  tier: number
  kina: number
}

interface Category {
  id: string
  name: string
  bosses: Boss[]
}

interface DungeonData {
  transcend: {
    maxTickets: number
    bosses: Boss[]
    tiers: Tier[]
  }
  expedition: {
    maxTickets: number
    categories: Category[]
  }
}

interface ContentRecord {
  id: string
  bossName: string
  tier?: number
  category?: string
  count: number
  kina: number
}

interface DungeonContentSectionProps {
  characterId: string | null
}

export default function DungeonContentSection({ characterId }: DungeonContentSectionProps) {
  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null)

  // 초월 상태
  const [transcendTickets, setTranscendTickets] = useState({ base: 14, bonus: 0 })
  const [transcendDouble, setTranscendDouble] = useState(false)
  const [transcendBoss, setTranscendBoss] = useState('')
  const [transcendTier, setTranscendTier] = useState(1)
  const [transcendRecords, setTranscendRecords] = useState<ContentRecord[]>([])

  // 원정 상태
  const [expeditionTickets, setExpeditionTickets] = useState({ base: 21, bonus: 0 })
  const [expeditionDouble, setExpeditionDouble] = useState(false)
  const [expeditionCategory, setExpeditionCategory] = useState('')
  const [expeditionBoss, setExpeditionBoss] = useState('')
  const [expeditionRecords, setExpeditionRecords] = useState<ContentRecord[]>([])

  // 던전 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/ledger/dungeon-data')
        const data = await res.json()

        // 초월 데이터 변환
        const transcendData = {
          maxTickets: data.transcend.maxTickets,
          bosses: data.transcend.bosses,
          tiers: data.transcend.bosses[0].tiers
        }

        // 원정 데이터 변환
        const expeditionData = {
          maxTickets: data.expedition.maxTickets,
          categories: data.expedition.categories
        }

        setDungeonData({
          transcend: transcendData,
          expedition: expeditionData
        })

        // 초기 선택값 설정
        if (transcendData.bosses.length > 0) {
          setTranscendBoss(transcendData.bosses[0].id)
        }
        if (expeditionData.categories.length > 0) {
          setExpeditionCategory(expeditionData.categories[0].id)
          if (expeditionData.categories[0].bosses.length > 0) {
            setExpeditionBoss(expeditionData.categories[0].bosses[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load dungeon data:', error)
      }
    }

    fetchData()
  }, [])

  // 초월 기록 추가
  const handleAddTranscendRecord = (record: Omit<ContentRecord, 'id'>) => {
    setTranscendRecords(prev => {
      // 같은 조합 찾기
      const existing = prev.find(
        r => r.bossName === record.bossName && r.tier === record.tier
      )

      if (existing) {
        // 누적
        return prev.map(r =>
          r.id === existing.id
            ? { ...r, count: r.count + record.count, kina: r.kina + record.kina }
            : r
        )
      } else {
        // 새로 추가
        return [...prev, { ...record, id: Date.now().toString() }]
      }
    })
  }

  // 초월 기록 삭제
  const handleDeleteTranscendRecord = (recordId: string, count: number) => {
    setTranscendRecords(prev => prev.filter(r => r.id !== recordId))
  }

  // 원정 기록 추가
  const handleAddExpeditionRecord = (record: Omit<ContentRecord, 'id'>) => {
    setExpeditionRecords(prev => {
      // 같은 조합 찾기
      const existing = prev.find(
        r => r.bossName === record.bossName && r.category === record.category
      )

      if (existing) {
        // 누적
        return prev.map(r =>
          r.id === existing.id
            ? { ...r, count: r.count + record.count, kina: r.kina + record.kina }
            : r
        )
      } else {
        // 새로 추가
        return [...prev, { ...record, id: Date.now().toString() }]
      }
    })
  }

  // 원정 기록 삭제
  const handleDeleteExpeditionRecord = (recordId: string, count: number) => {
    setExpeditionRecords(prev => prev.filter(r => r.id !== recordId))
  }

  // 카테고리 변경 시 보스 초기화
  const handleExpeditionCategoryChange = (categoryId: string) => {
    setExpeditionCategory(categoryId)
    const category = dungeonData?.expedition.categories.find(c => c.id === categoryId)
    if (category && category.bosses.length > 0) {
      setExpeditionBoss(category.bosses[0].id)
    }
  }

  if (!dungeonData) {
    return <div className={styles.loading}>던전 데이터를 불러오는 중...</div>
  }

  // 현재 선택된 카테고리의 보스 목록
  const currentExpeditionBosses = dungeonData.expedition.categories.find(
    c => c.id === expeditionCategory
  )?.bosses || []

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>🎮 던전 컨텐츠</h2>
      </div>

      {/* 초월 카드 */}
      <ContentCard
        contentType="transcend"
        title="초월"
        maxTickets={dungeonData.transcend.maxTickets}
        currentTickets={transcendTickets.base}
        bonusTickets={transcendTickets.bonus}
        onTicketsChange={(base, bonus) => setTranscendTickets({ base, bonus })}
        bossOptions={dungeonData.transcend.bosses}
        tierOptions={dungeonData.transcend.tiers}
        isDoubleReward={transcendDouble}
        onDoubleToggle={() => setTranscendDouble(!transcendDouble)}
        records={transcendRecords}
        onAddRecord={handleAddTranscendRecord}
        onDeleteRecord={handleDeleteTranscendRecord}
        selectedBoss={transcendBoss}
        selectedTier={transcendTier}
        onBossChange={setTranscendBoss}
        onTierChange={setTranscendTier}
      />

      {/* 원정 카드 */}
      <ContentCard
        contentType="expedition"
        title="원정"
        maxTickets={dungeonData.expedition.maxTickets}
        currentTickets={expeditionTickets.base}
        bonusTickets={expeditionTickets.bonus}
        onTicketsChange={(base, bonus) => setExpeditionTickets({ base, bonus })}
        bossOptions={currentExpeditionBosses}
        categoryOptions={dungeonData.expedition.categories}
        isDoubleReward={expeditionDouble}
        onDoubleToggle={() => setExpeditionDouble(!expeditionDouble)}
        records={expeditionRecords}
        onAddRecord={handleAddExpeditionRecord}
        onDeleteRecord={handleDeleteExpeditionRecord}
        selectedBoss={expeditionBoss}
        selectedCategory={expeditionCategory}
        onBossChange={setExpeditionBoss}
        onCategoryChange={handleExpeditionCategoryChange}
      />
    </section>
  )
}
