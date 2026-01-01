'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import CharacterHeader from '../../../components/CharacterHeader'
import PowerDisplay from '../../../components/PowerDisplay'
import EquipmentGrid from '../../../components/EquipmentGrid'
import StatCard from '../../../components/StatCard'
import TitleSystem from '../../../components/TitleSystem'
import DevanionBoard from '../../../components/DevanionBoard'


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const dummyDevanionData = {
  boards: {
    '네자칸': {
      progress: '완료',
      activeNodes: 45,
      totalNodes: 45,
      effects: ['물리 공격력 +5%', '치명타 +120']
    },
    '지켈': {
      progress: '진행중',
      activeNodes: 32,
      totalNodes: 45,
      effects: ['마법 공격력 +4%']
    },
    '바이젤': {
      progress: '진행중',
      activeNodes: 28,
      totalNodes: 45,
      effects: ['방어력 +3%', 'HP +2000']
    }
  },
  totalInvestment: 125430,
  globalRank: 1523
}

// Dummy data for demonstration
const dummyEquipment = [
  {
    slot: '주무기',
    name: '빛나는 암룡왕의 장검',
    enhancement: '+15',
    tier: 5,
    soulEngraving: { grade: 'S', percentage: 98.5 },
    manastones: [
      { type: '공격력', value: 45 },
      { type: '치명타', value: 32 }
    ]
  }
]

const dummyAccessories = [
  {
    slot: '귀걸이1',
    name: '영원의 귀걸이',
    enhancement: '+10',
    tier: 4
  }
]

const dummyStats = [
  {
    name: '물리 공격력',
    value: 15234,
    percentile: 2.3,
    contribution: 12.5,
    breakdown: {
      equipment: 8500,
      devanion: 3200,
      transcendence: 2500,
      titles: 1034
    }
  },
  {
    name: '치명타',
    value: 4123,
    percentile: 4.8,
    contribution: 8.3,
    breakdown: {
      equipment: 2500,
      devanion: 800,
      transcendence: 600,
      titles: 223
    }
  }
]

const dummyTitleData = {
  totalTitles: 305,
  collectedTitles: 272,
  attackTitles: '94/104',
  defenseTitles: '87/100',
  miscTitles: '91/101',
  activeEffects: [
    'PVE 피해 증폭 +2.3%',
    '추가 회피 +45',
    '전투 속도 +1.2%'
  ]
}


type CharacterData = {
  id: number
  name: string
  server: string
  class: string
  level: number
  power: number
  power_index?: number
  tier_rank?: string
  percentile?: number
  rank?: number
  updated_at: string
  power_change?: number
  level_change?: number
  stats?: Record<string, number>
  warning?: string
  race?: string
  title?: string
  character_image_url?: string
  item_level?: number
}

export default function CharacterDetailPage() {
  const params = useParams()
  const server = params.server as string
  const name = decodeURIComponent(params.name as string)

  const [data, setData] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/characters/search?server=${server}&name=${name}`)
      .then(res => {
        if (!res.ok) throw new Error(`서버 응답 오류 (Status: ${res.status})`)
        return res.json()
      })
      .then(d => {
        setData(d)
        setLoading(false)

        // Optional polling: if power_index is null, retry 2-3 times with 15s interval
        if (!d.power_index && !d.tier_rank) {
          let pollCount = 0
          const maxPolls = 2

          const pollInterval = setInterval(() => {
            pollCount++

            fetch(`${API_BASE_URL}/api/characters/search?server=${server}&name=${name}`)
              .then(res => res.json())
              .then(updated => {
                if (updated.power_index || pollCount >= maxPolls) {
                  setData(updated)
                  clearInterval(pollInterval)
                }
              })
              .catch(() => clearInterval(pollInterval))

          }, 15000) // 15 seconds

          // Cleanup on unmount
          return () => clearInterval(pollInterval)
        }
      })
      .catch(err => {
        setError(err.message || '캐릭터 정보를 불러올 수 없습니다.')
        setLoading(false)
      })
  }, [server, name])

  if (loading) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        textAlign: 'center',
        color: 'var(--text-main)'
      }}>
        <div style={{ fontSize: '1.5rem' }}>로딩 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        textAlign: 'center'
      }}>
        <div style={{
          padding: '2rem',
          background: '#991B1B20',
          border: '1px solid #991B1B',
          borderRadius: '8px',
          color: '#FCA5A5'
        }}>
          ❌ {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const handleRefresh = async () => {
    if (loading) return
    const confirmRefresh = window.confirm('최신 데이터를 강제로 불러오시겠습니까? 시간이 소요될 수 있습니다.')
    if (!confirmRefresh) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/characters/search?server=${server}&name=${name}&refresh_force=true`)
      if (!res.ok) throw new Error(`서버 응답 오류 (Status: ${res.status})`)
      const d = await res.json()
      setData(d)
    } catch (err: any) {
      setError(err.message || '데이터 갱신 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem',
      minHeight: '100vh',
      position: 'relative' // relative context for absolute/fixed items if needed, though button is fixed to viewport
    }}>
      {/* Manual Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="데이터 강제 갱신"
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
      </button>

      {/* Status Badges */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {(!data.power_index || !data.tier_rank) && (
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#1E40AF20',
            border: '1px solid #3B82F6',
            borderRadius: '6px',
            color: '#93C5FD',
            fontSize: '0.875rem'
          }}>
            ⚡ 전투력 계산 중...
          </div>
        )}
        {data.warning && (
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#92400E20',
            border: '1px solid #F59E0B',
            borderRadius: '6px',
            color: '#FCD34D',
            fontSize: '0.875rem'
          }}>
            ⚠️ {data.warning}
          </div>
        )}
      </div>

      {/* Character Header */}
      <CharacterHeader data={data} />

      {/* Power Display */}
      {data.power_index && (
        <div style={{ marginTop: '2rem' }}>
          <PowerDisplay
            combatScore={data.power_index}
            itemLevel={data.item_level}
            tier={data.tier_rank}
            percentile={data.percentile}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.5rem'
        }}>
          {['basic', 'devanion', 'growth'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text-main)' : 'var(--text-sub)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {tab === 'basic' && '기본 정보'}
              {tab === 'devanion' && '데바니온'}
              {tab === 'growth' && '성장 도표'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'basic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Equipment Grid */}
              <EquipmentGrid
                equipment={dummyEquipment}
                accessories={dummyAccessories}
              />

              {/* Stats Grid */}
              <div>
                <h3 style={{
                  color: '#E5E7EB',
                  fontSize: '1.5rem',
                  marginBottom: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  상세 스탯
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {dummyStats.map(stat => (
                    <StatCard
                      key={stat.name}
                      statName={stat.name}
                      value={stat.value}
                      percentile={stat.percentile}
                      contribution={stat.contribution}
                      breakdown={stat.breakdown}
                    />
                  ))}
                </div>
              </div>

              {/* Title System */}
              <TitleSystem data={dummyTitleData} />
            </div>
          )}
          {activeTab === 'devanion' && (
            <DevanionBoard data={dummyDevanionData} />
          )}
          {activeTab === 'growth' && (
            <div style={{
              padding: '2rem',
              background: 'var(--bg-card)',
              borderRadius: '8px',
              color: 'var(--text-main)'
            }}>
              성장 도표 준비 중...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
