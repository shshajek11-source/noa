'use client'

import { useState, useMemo, CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import SimulatorHeader from './components/SimulatorHeader'
import CharacterPanel from './components/CharacterPanel'
import StatsComparison from './components/StatsComparison'

// 모달 지연 로딩 (장비 슬롯 클릭 시에만 로드)
const ItemSelectModal = dynamic(() => import('./components/ItemSelectModal'), { ssr: false })

// Types
export interface SimulatorEquipmentOption {
  name: string
  value: string | number
}

export interface SimulatorManastone {
  type: string
  value: string | number
  grade?: string
}

export interface SimulatorGodstone {
  name: string
  desc?: string
  grade?: string
  icon?: string
}

export interface SimulatorEquipmentDetail {
  options?: SimulatorEquipmentOption[]      // 기본 옵션
  randomOptions?: SimulatorEquipmentOption[] // 랜덤 옵션
  manastones?: SimulatorManastone[]          // 마석
  godstones?: SimulatorGodstone[]            // 신석
  soulImprints?: SimulatorEquipmentOption[]  // 영혼각인
}

export interface SimulatorEquipment {
  slotPos: number
  slotName: string
  name: string
  grade?: string
  icon?: string
  itemLevel?: number
  requiredLevel?: number  // 착용가능 레벨
  enchantLevel?: number
  exceedLevel?: number
  attack?: number
  defense?: number
  hp?: number
  // 추가 스탯들
  stats?: Record<string, number>
  // 상세 정보 (마석, 신석, 옵션 등)
  detail?: SimulatorEquipmentDetail
  // API 원본 데이터 (디버그용)
  _raw?: Record<string, unknown>
}

export interface SimulatorCharacter {
  id: string
  name: string
  server: string
  serverId: number
  className: string
  level: number
  race: string
  itemLevel?: number
  combatPower?: number
  profileImage?: string
  equipment: SimulatorEquipment[]
  accessories: SimulatorEquipment[]
  arcana: SimulatorEquipment[]
  stats: Record<string, number>  // 실제 능력치 (캐릭터 상세와 동일)
}

// CSS Variables for v4 design
const cssVars = {
  '--sim-bg-base': '#09090b',
  '--sim-bg-card': '#18181b',
  '--sim-bg-elevated': '#27272a',
  '--sim-border': '#27272a',
  '--sim-border-hover': '#3f3f46',
  '--sim-text-primary': '#fafafa',
  '--sim-text-secondary': '#a1a1aa',
  '--sim-text-muted': '#71717a',
  '--sim-accent': '#f59e0b',
  '--sim-accent-glow': 'rgba(245, 158, 11, 0.4)',
  '--sim-success': '#10b981',
  '--sim-danger': '#ef4444',
  '--sim-grade-rare': '#3b82f6',
  '--sim-grade-epic': '#8b5cf6',
  '--sim-grade-legendary': '#f59e0b',
  '--sim-grade-mythic': '#ef4444',
} as CSSProperties

export default function SimulatorPage() {
  // State
  const [character, setCharacter] = useState<SimulatorCharacter | null>(null)
  const [simulatedEquipment, setSimulatedEquipment] = useState<SimulatorEquipment[]>([])
  const [simulatedAccessories, setSimulatedAccessories] = useState<SimulatorEquipment[]>([])
  const [simulatedRunes, setSimulatedRunes] = useState<SimulatorEquipment[]>([])
  const [simulatedArcana, setSimulatedArcana] = useState<SimulatorEquipment[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ slotPos: number; slotName: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 캐릭터 선택 핸들러
  const handleCharacterSelect = (char: SimulatorCharacter) => {
    setCharacter(char)
    // 시뮬레이션용 장비 복사
    setSimulatedEquipment([...char.equipment])
    setSimulatedAccessories([...char.accessories])
    // 룬은 장신구에서 분리 (슬롯 23, 24)
    const runes = char.accessories.filter(a => a.slotPos === 23 || a.slotPos === 24)
    setSimulatedRunes([...runes])
    setSimulatedArcana([...char.arcana])
  }

  // 초기화 핸들러
  const handleReset = () => {
    if (character) {
      setSimulatedEquipment([...character.equipment])
      setSimulatedAccessories([...character.accessories])
      const runes = character.accessories.filter(a => a.slotPos === 23 || a.slotPos === 24)
      setSimulatedRunes([...runes])
      setSimulatedArcana([...character.arcana])
    }
  }

  // 장비 슬롯 클릭 핸들러
  const handleSlotClick = (slotPos: number, slotName: string) => {
    setSelectedSlot({ slotPos, slotName })
  }

  // 아이템 선택 핸들러
  const handleItemSelect = (item: SimulatorEquipment) => {
    if (!selectedSlot) return

    const slotPos = selectedSlot.slotPos
    const newItem = { ...item, slotPos: selectedSlot.slotPos, slotName: selectedSlot.slotName }

    // 슬롯 위치에 따라 분류
    if (slotPos >= 41 && slotPos <= 45) {
      // 아르카나 (41-45)
      setSimulatedArcana(prev =>
        prev.map(eq => eq.slotPos === slotPos ? newItem : eq)
      )
    } else if (slotPos === 23 || slotPos === 24) {
      // 룬 (23-24)
      setSimulatedRunes(prev =>
        prev.map(eq => eq.slotPos === slotPos ? newItem : eq)
      )
    } else if (slotPos >= 10 && slotPos <= 22) {
      // 장신구 (10-22)
      setSimulatedAccessories(prev =>
        prev.map(eq => eq.slotPos === slotPos ? newItem : eq)
      )
    } else {
      // 장비 (1-8)
      setSimulatedEquipment(prev =>
        prev.map(eq => eq.slotPos === slotPos ? newItem : eq)
      )
    }

    setSelectedSlot(null)
  }

  // 변경 여부 체크 (장비 변경 포함 - 이름, 강화, 돌파 비교)
  const hasChanges = useMemo(() => {
    if (!character) return false

    // 장비 비교 (이름 + 강화 + 돌파)
    const equipKey = (e: SimulatorEquipment) => `${e.name}|${e.enchantLevel || 0}|${e.exceedLevel || 0}`
    const origEquipStr = JSON.stringify(character.equipment.map(equipKey).sort())
    const simEquipStr = JSON.stringify(simulatedEquipment.map(equipKey).sort())
    const origAccStr = JSON.stringify(character.accessories.map(e => e.name).sort())
    const simAccStr = JSON.stringify(simulatedAccessories.map(e => e.name).sort())
    const origArcanaStr = JSON.stringify(character.arcana.map(e => e.name).sort())
    const simArcanaStr = JSON.stringify(simulatedArcana.map(e => e.name).sort())

    return origEquipStr !== simEquipStr || origAccStr !== simAccStr || origArcanaStr !== simArcanaStr
  }, [character, simulatedEquipment, simulatedAccessories, simulatedArcana, simulatedRunes])

  return (
    <div style={{ ...cssVars, minHeight: '100vh', backgroundColor: 'var(--sim-bg-base)', color: 'var(--sim-text-primary)' }}>
      {/* 배경 효과 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          filter: 'blur(120px)',
          opacity: 0.15,
          background: 'var(--sim-accent)',
          top: '-200px',
          right: '-100px',
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          filter: 'blur(100px)',
          opacity: 0.1,
          background: 'var(--sim-grade-epic)',
          bottom: '-100px',
          left: '-50px',
        }} />
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ position: 'relative', zIndex: 1, padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* 헤더 */}
        <SimulatorHeader
          onCharacterSelect={handleCharacterSelect}
          onReset={handleReset}
          hasCharacter={!!character}
          hasChanges={hasChanges}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          addLog={addLog}
        />

        {/* 캐릭터 비교 영역 */}
        {character ? (
          <>
            {/* 되돌리기 버튼 */}
            {hasChanges && (
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleReset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  되돌리기
                </button>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              alignItems: 'start',
            }}>
              {/* 캐릭터 카드 (편집 가능) */}
              <CharacterPanel
                character={character}
                equipment={simulatedEquipment}
                accessories={simulatedAccessories}
                runes={simulatedRunes}
                arcana={simulatedArcana}
                isEditable={true}
                isActive={true}
                onSlotClick={handleSlotClick}
              />

              {/* 스탯 비교 */}
              <StatsComparison
                originalStats={character.stats}
                originalEquipment={[...character.equipment, ...character.accessories, ...character.arcana]}
                simulatedEquipment={[...simulatedEquipment, ...simulatedAccessories, ...simulatedRunes, ...simulatedArcana]}
                hasChanges={hasChanges}
              />
            </div>
          </>
        ) : (
          /* 캐릭터 없을 때 안내 */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            background: 'var(--sim-bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--sim-border)',
            padding: '48px',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.3,
            }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--sim-text-primary)' }}>
              캐릭터를 등록하세요
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--sim-text-muted)', textAlign: 'center' }}>
              상단 검색창에서 캐릭터를 검색하고 선택하면<br />
              장비 시뮬레이션을 시작할 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 아이템 선택 모달 */}
      {selectedSlot && (
        <ItemSelectModal
          slotPos={selectedSlot.slotPos}
          slotName={selectedSlot.slotName}
          currentItem={
            [...simulatedEquipment, ...simulatedAccessories].find(e => e.slotPos === selectedSlot.slotPos) || null
          }
          onSelect={handleItemSelect}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  )
}
