'use client'

import { useState, useMemo, CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import SimulatorHeader from './components/SimulatorHeader'
import CharacterPanel from './components/CharacterPanel'
import StatsComparison from './components/StatsComparison'

// 모달 지연 로딩 (장비 슬롯 클릭 시에만 로드)
const ItemSelectModal = dynamic(() => import('./components/ItemSelectModal'), { ssr: false })

// 디버그 패널 컴포넌트
function DebugPanel({
  character,
  simulatedEquipment,
  simulatedAccessories,
  selectedSlot,
  hasChanges,
  isLoading,
  apiLogs,
}: {
  character: SimulatorCharacter | null
  simulatedEquipment: SimulatorEquipment[]
  simulatedAccessories: SimulatorEquipment[]
  selectedSlot: { slotPos: number; slotName: string } | null
  hasChanges: boolean
  isLoading: boolean
  apiLogs: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'state' | 'equipment' | 'logs' | 'items'>('state')

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          backgroundColor: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 9999,
        }}
      >
        DEBUG
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '500px',
      backgroundColor: '#1a1a2e',
      border: '2px solid #ef4444',
      borderRadius: '12px',
      zIndex: 9999,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#ef4444',
        color: '#fff',
      }}>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>DEBUG PANEL</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ×
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {(['state', 'equipment', 'items', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              backgroundColor: activeTab === tab ? '#333' : 'transparent',
              color: activeTab === tab ? '#fff' : '#888',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {tab === 'state' ? '상태' : tab === 'equipment' ? '장비' : tab === 'items' ? '필드' : '로그'}
          </button>
        ))}
      </div>

      {/* 내용 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#ccc',
      }}>
        {activeTab === 'state' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#ef4444' }}>캐릭터:</strong>
              <div style={{ marginLeft: '8px', marginTop: '4px' }}>
                {character ? (
                  <>
                    <div>이름: {character.name}</div>
                    <div>서버: {character.server} (ID: {character.serverId})</div>
                    <div>직업: {character.className}</div>
                    <div>레벨: {character.level}</div>
                    <div>템렙: {character.itemLevel?.toLocaleString()}</div>
                    <div>전투력: {character.combatPower?.toLocaleString()}</div>
                  </>
                ) : (
                  <span style={{ color: '#666' }}>없음</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#ef4444' }}>상태값:</strong>
              <div style={{ marginLeft: '8px', marginTop: '4px' }}>
                <div>isLoading: <span style={{ color: isLoading ? '#10b981' : '#666' }}>{String(isLoading)}</span></div>
                <div>hasChanges: <span style={{ color: hasChanges ? '#10b981' : '#666' }}>{String(hasChanges)}</span></div>
                <div>selectedSlot: {selectedSlot ? `${selectedSlot.slotName} (pos: ${selectedSlot.slotPos})` : 'null'}</div>
              </div>
            </div>

            <div>
              <strong style={{ color: '#ef4444' }}>장비 개수:</strong>
              <div style={{ marginLeft: '8px', marginTop: '4px' }}>
                <div>원본 장비: {character?.equipment?.length || 0}개</div>
                <div>원본 장신구: {character?.accessories?.length || 0}개</div>
                <div>시뮬 장비: {simulatedEquipment.length}개</div>
                <div>시뮬 장신구: {simulatedAccessories.length}개</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipment' && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ color: '#f59e0b' }}>시뮬레이션 장비:</strong>
              {simulatedEquipment.length === 0 ? (
                <div style={{ color: '#666', marginTop: '4px' }}>없음</div>
              ) : (
                simulatedEquipment.map((eq, i) => (
                  <div key={i} style={{ marginLeft: '8px', marginTop: '4px', padding: '4px', backgroundColor: '#252530', borderRadius: '4px' }}>
                    <div style={{ color: '#f59e0b' }}>[{eq.slotName}] {eq.name}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      pos: {eq.slotPos} | grade: {eq.grade || '-'} | 템렙: {eq.itemLevel || '-'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <strong style={{ color: '#8b5cf6' }}>시뮬레이션 장신구:</strong>
              {simulatedAccessories.length === 0 ? (
                <div style={{ color: '#666', marginTop: '4px' }}>없음</div>
              ) : (
                simulatedAccessories.map((eq, i) => (
                  <div key={i} style={{ marginLeft: '8px', marginTop: '4px', padding: '4px', backgroundColor: '#252530', borderRadius: '4px' }}>
                    <div style={{ color: '#8b5cf6' }}>[{eq.slotName}] {eq.name}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      pos: {eq.slotPos} | grade: {eq.grade || '-'} | 템렙: {eq.itemLevel || '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <div style={{ marginBottom: '8px', color: '#f59e0b', fontSize: '10px' }}>
              API 원본 필드 + detail (아이템 상세 API)
            </div>
            {!character?.equipment?.length ? (
              <div style={{ color: '#666' }}>장비 데이터 없음</div>
            ) : (
              character.equipment.slice(0, 3).map((eq, i) => (
                <div key={i} style={{
                  marginBottom: '10px',
                  padding: '6px',
                  backgroundColor: '#252530',
                  borderRadius: '4px',
                  borderLeft: '2px solid #10b981',
                }}>
                  <div style={{ color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>
                    [{eq.slotName || eq.slotPos}] {eq.name}
                  </div>

                  {/* 기본 필드 */}
                  <div style={{ fontSize: '9px', color: '#999', lineHeight: 1.4, marginBottom: '6px' }}>
                    <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '2px' }}>기본 필드:</div>
                    {eq._raw ? (
                      Object.entries(eq._raw)
                        .filter(([key]) => !['detail'].includes(key))
                        .map(([key, val]) => (
                          <div key={key} style={{ marginBottom: '1px', paddingLeft: '8px' }}>
                            <span style={{ color: '#f59e0b' }}>{key}:</span>{' '}
                            <span style={{ color: '#ccc' }}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'null')}
                            </span>
                          </div>
                        ))
                    ) : (
                      <div style={{ color: '#666', paddingLeft: '8px' }}>_raw 없음</div>
                    )}
                  </div>

                  {/* detail 필드 */}
                  <div style={{ fontSize: '9px', color: '#999', lineHeight: 1.4 }}>
                    <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '2px' }}>detail (아이템 상세):</div>
                    {eq.detail ? (
                      <div style={{ paddingLeft: '8px' }}>
                        {eq.detail.options && eq.detail.options.length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#3b82f6' }}>options:</span>
                            {eq.detail.options.map((opt, j) => (
                              <div key={j} style={{ paddingLeft: '8px', color: '#ccc' }}>
                                {opt.name}: {opt.value}
                              </div>
                            ))}
                          </div>
                        )}
                        {eq.detail.randomOptions && eq.detail.randomOptions.length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#3b82f6' }}>randomOptions:</span>
                            {eq.detail.randomOptions.map((opt, j) => (
                              <div key={j} style={{ paddingLeft: '8px', color: '#ccc' }}>
                                {opt.name}: {opt.value}
                              </div>
                            ))}
                          </div>
                        )}
                        {eq.detail.manastones && eq.detail.manastones.length > 0 && (
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#3b82f6' }}>manastones:</span>
                            {eq.detail.manastones.map((m, j) => (
                              <div key={j} style={{ paddingLeft: '8px', color: '#ccc' }}>
                                {m.type}: {m.value} ({m.grade})
                              </div>
                            ))}
                          </div>
                        )}
                        {/* _raw 전체 표시 (디버그용) */}
                        {(eq.detail as any)._raw && (
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ color: '#ef4444' }}>_raw 전체:</span>
                            <pre style={{
                              fontSize: '8px',
                              color: '#888',
                              margin: '2px 0 0 8px',
                              maxHeight: '100px',
                              overflow: 'auto',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all'
                            }}>
                              {JSON.stringify((eq.detail as any)._raw, null, 1)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#666', paddingLeft: '8px' }}>detail 없음</div>
                    )}
                  </div>
                </div>
              ))
            )}
            {(character?.equipment?.length || 0) > 3 && (
              <div style={{ color: '#666', fontSize: '10px', textAlign: 'center' }}>
                ... 외 {(character?.equipment?.length || 0) - 3}개 아이템
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            {apiLogs.length === 0 ? (
              <div style={{ color: '#666' }}>로그 없음</div>
            ) : (
              apiLogs.map((log, i) => (
                <div key={i} style={{
                  padding: '4px 8px',
                  marginBottom: '4px',
                  backgroundColor: '#252530',
                  borderRadius: '4px',
                  borderLeft: '2px solid #3b82f6',
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

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
  const [apiLogs, setApiLogs] = useState<string[]>([])

  // 디버그 로그 추가 함수
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR')
    setApiLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)])
  }

  // 캐릭터 선택 핸들러
  const handleCharacterSelect = (char: SimulatorCharacter) => {
    addLog(`캐릭터 선택: ${char.name} (${char.server})`)
    addLog(`장비 ${char.equipment.length}개, 장신구 ${char.accessories.length}개, 아르카나 ${char.arcana.length}개 로드됨`)
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
      addLog('장비 초기화됨')
      setSimulatedEquipment([...character.equipment])
      setSimulatedAccessories([...character.accessories])
      const runes = character.accessories.filter(a => a.slotPos === 23 || a.slotPos === 24)
      setSimulatedRunes([...runes])
      setSimulatedArcana([...character.arcana])
    }
  }

  // 장비 슬롯 클릭 핸들러
  const handleSlotClick = (slotPos: number, slotName: string) => {
    addLog(`슬롯 선택: ${slotName} (pos: ${slotPos})`)
    setSelectedSlot({ slotPos, slotName })
  }

  // 아이템 선택 핸들러
  const handleItemSelect = (item: SimulatorEquipment) => {
    if (!selectedSlot) return

    addLog(`아이템 변경: ${selectedSlot.slotName} → ${item.name}`)

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

      {/* 디버그 패널 */}
      <DebugPanel
        character={character}
        simulatedEquipment={simulatedEquipment}
        simulatedAccessories={simulatedAccessories}
        selectedSlot={selectedSlot}
        hasChanges={hasChanges}
        isLoading={isLoading}
        apiLogs={apiLogs}
      />
    </div>
  )
}
