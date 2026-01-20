'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from './CharacterDetailMobile.module.css'

// CharacterData와 동일한 타입
interface CharacterData {
  id: number
  characterId?: string
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
  skills?: any
  title_name?: string
  title_grade?: string
  title_id?: number
  pvp_score?: number
  pve_score?: number
}

interface CharacterDetailMobileProps {
  data: CharacterData | null
  mappedEquipment: {
    equipment: any[]
    accessories: any[]
    arcana: any[]
    pets: any[]
    wings: any[]
    appearance: any[]
    debugInfo: any
  }
  mappedStats: any
  mappedSkills: any
  mainCharacterData: any
  onItemClick: (item: any) => void
  onRegisterMainCharacter: (char: {
    characterId: string
    name: string
    server: string
    server_id?: number
    race?: string
    className: string
    level: number
    pve_score?: number
    pvp_score?: number
    item_level?: number
    imageUrl?: string
  }) => void
}

export default function CharacterDetailMobile({
  data,
  mappedEquipment,
  mappedStats,
  mappedSkills,
  mainCharacterData,
  onItemClick,
  onRegisterMainCharacter
}: CharacterDetailMobileProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'equipment' | 'stats' | 'skills'>('equipment')

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleRegister = useCallback(() => {
    if (!data) return
    onRegisterMainCharacter({
      characterId: data.characterId || '',
      name: data.name,
      server: data.server,
      race: data.race,
      className: data.class,
      level: data.level,
      pve_score: data.pve_score,
      pvp_score: data.pvp_score,
      item_level: data.item_level,
      imageUrl: data.character_image_url
    })
  }, [data, onRegisterMainCharacter])

  if (!data) return null

  // 종족에 따른 배경 그라데이션
  const isElyos = data.race === '천족' || data.race === 'Elyos'
  const raceGradient = isElyos
    ? 'linear-gradient(135deg, rgba(45, 212, 191, 0.15), rgba(20, 184, 166, 0.05))'
    : 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(139, 92, 246, 0.05))'
  const raceColor = isElyos ? '#2DD4BF' : '#A78BFA'

  // 등급에 따른 색상
  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'Mythic': return '#FF6B6B'
      case 'Epic': return '#A78BFA'
      case 'Unique': return '#FACC15'
      case 'Legend': return '#F97316'
      case 'Rare': return '#60A5FA'
      default: return '#9CA3AF'
    }
  }

  return (
    <div className={styles.container}>
      {/* Header - 일반 배치 */}
      <header className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={styles.headerTitle}>
          <span className={styles.headerName}>{data.name}</span>
          <span className={styles.headerServer}>{data.server}</span>
        </div>
        <button onClick={handleRegister} className={styles.starButton} title="대표 캐릭터로 등록">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </header>

      {/* 메뉴 탭 - 일반 배치 */}
      <nav className={styles.menuTabs}>
        <Link href="/" className={styles.menuTab}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <span>홈</span>
        </Link>
        <Link href="/ranking" className={styles.menuTab}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          <span>랭킹</span>
        </Link>
        <Link href="/party" className={styles.menuTab}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>파티</span>
        </Link>
        <Link href="/ledger/mobile" className={styles.menuTab}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>가계부</span>
        </Link>
      </nav>

      {/* Profile Section */}
      <section className={styles.profileSection} style={{ background: raceGradient }}>
        <div className={styles.profileImageWrapper}>
          {data.character_image_url ? (
            <Image
              src={data.character_image_url}
              alt={data.name}
              width={100}
              height={100}
              className={styles.profileImage}
              unoptimized
            />
          ) : (
            <div className={styles.profilePlaceholder}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <span className={styles.levelBadge}>Lv.{data.level}</span>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.charName}>{data.name}</div>
          <div className={styles.charMeta}>
            <span style={{ color: raceColor }}>{data.race}</span>
            <span className={styles.separator}>•</span>
            <span>{data.class}</span>
          </div>
          {data.title_name && (
            <div className={styles.titleBadge} style={{ borderColor: getGradeColor(data.title_grade) }}>
              <span style={{ color: getGradeColor(data.title_grade) }}>{data.title_name}</span>
            </div>
          )}
        </div>

        {/* Score Cards */}
        <div className={styles.scoreCards}>
          <div className={styles.scoreCard}>
            <div className={styles.scoreLabel}>PVE</div>
            <div className={styles.scoreValue}>{data.pve_score?.toLocaleString() || '-'}</div>
          </div>
          <div className={styles.scoreCard}>
            <div className={styles.scoreLabel}>PVP</div>
            <div className={styles.scoreValue}>{data.pvp_score?.toLocaleString() || '-'}</div>
          </div>
          <div className={styles.scoreCard}>
            <div className={styles.scoreLabel}>아이템</div>
            <div className={styles.scoreValue}>{data.item_level?.toLocaleString() || '-'}</div>
          </div>
        </div>
      </section>

      {/* Tab Navigation - 장비/능력치/스킬 */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tab} ${activeTab === 'equipment' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          장비
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          능력치
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'skills' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          스킬
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'equipment' && (
          <div className={styles.equipmentTab}>
            {/* Equipment Section */}
            {mappedEquipment.equipment.length > 0 && (
              <div className={styles.equipSection}>
                <h3 className={styles.sectionTitle}>장비</h3>
                <div className={styles.equipGrid}>
                  {mappedEquipment.equipment.map((item, idx) => (
                    <div
                      key={`eq-${idx}`}
                      className={styles.equipItem}
                      onClick={() => onItemClick(item)}
                    >
                      <div className={styles.equipIconWrapper} style={{ borderColor: getGradeColor(item.grade) }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || item.slot}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.equipPlaceholder}>{item.slot?.charAt(0) || '?'}</div>
                        )}
                        {item.enhancement && (
                          <span className={styles.enhancement}>{item.enhancement}</span>
                        )}
                      </div>
                      <div className={styles.equipSlot}>{item.slot}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accessories Section */}
            {mappedEquipment.accessories.length > 0 && (
              <div className={styles.equipSection}>
                <h3 className={styles.sectionTitle}>악세서리</h3>
                <div className={styles.equipGrid}>
                  {mappedEquipment.accessories.map((item, idx) => (
                    <div
                      key={`acc-${idx}`}
                      className={styles.equipItem}
                      onClick={() => onItemClick(item)}
                    >
                      <div className={styles.equipIconWrapper} style={{ borderColor: getGradeColor(item.grade) }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || item.slot}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.equipPlaceholder}>{item.slot?.charAt(0) || '?'}</div>
                        )}
                        {item.enhancement && (
                          <span className={styles.enhancement}>{item.enhancement}</span>
                        )}
                      </div>
                      <div className={styles.equipSlot}>{item.slot}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pet & Wings Section */}
            {(mappedEquipment.pets.length > 0 || mappedEquipment.wings.length > 0) && (
              <div className={styles.equipSection}>
                <h3 className={styles.sectionTitle}>펫 & 날개</h3>
                <div className={styles.equipGrid}>
                  {[...mappedEquipment.pets, ...mappedEquipment.wings].map((item, idx) => (
                    <div
                      key={`pw-${idx}`}
                      className={styles.equipItem}
                      onClick={() => onItemClick(item)}
                    >
                      <div className={styles.equipIconWrapper} style={{ borderColor: getGradeColor(item.grade) }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || item.slot}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.equipPlaceholder}>{item.slot?.charAt(0) || '?'}</div>
                        )}
                      </div>
                      <div className={styles.equipSlot}>{item.slot}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arcana Section */}
            {mappedEquipment.arcana.length > 0 && (
              <div className={styles.equipSection}>
                <h3 className={styles.sectionTitle}>아르카나</h3>
                <div className={styles.equipGrid}>
                  {mappedEquipment.arcana.map((item, idx) => (
                    <div
                      key={`arc-${idx}`}
                      className={styles.equipItem}
                      onClick={() => onItemClick(item)}
                    >
                      <div className={styles.equipIconWrapper} style={{ borderColor: getGradeColor(item.grade) }}>
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name || 'Arcana'}
                            width={44}
                            height={44}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.equipPlaceholder}>A</div>
                        )}
                      </div>
                      <div className={styles.equipSlot}>{item.name?.substring(0, 4) || '아르카나'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {mappedEquipment.equipment.length === 0 && mappedEquipment.accessories.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🛡️</div>
                <div>장비 정보가 없습니다</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className={styles.statsTab}>
            {mappedStats?.statList && mappedStats.statList.length > 0 ? (
              <div className={styles.statsList}>
                {mappedStats.statList.map((stat: any, idx: number) => (
                  <div key={idx} className={styles.statRow}>
                    <span className={styles.statName}>{stat.name}</span>
                    <span className={styles.statValue}>
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      {stat.isOcrOverride && <span className={styles.ocrBadge}>OCR</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <div>능력치 정보가 없습니다</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className={styles.skillsTab}>
            {mappedSkills?.skillList && mappedSkills.skillList.length > 0 ? (
              <>
                {/* Active Skills */}
                <div className={styles.skillSection}>
                  <h3 className={styles.sectionTitle}>액티브 스킬</h3>
                  <div className={styles.skillGrid}>
                    {mappedSkills.skillList
                      .filter((s: any) => s.skillCategory === 'active')
                      .map((skill: any, idx: number) => (
                        <div key={idx} className={styles.skillItem}>
                          <div className={styles.skillIconWrapper}>
                            {skill.icon ? (
                              <Image
                                src={skill.icon}
                                alt={skill.name || 'Skill'}
                                width={40}
                                height={40}
                                unoptimized
                              />
                            ) : (
                              <div className={styles.skillPlaceholder}>⚔️</div>
                            )}
                            {skill.level && skill.level > 1 && (
                              <span className={styles.skillLevel}>{skill.level}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Passive Skills */}
                <div className={styles.skillSection}>
                  <h3 className={styles.sectionTitle}>패시브 스킬</h3>
                  <div className={styles.skillGrid}>
                    {mappedSkills.skillList
                      .filter((s: any) => s.skillCategory === 'passive')
                      .map((skill: any, idx: number) => (
                        <div key={idx} className={styles.skillItem}>
                          <div className={styles.skillIconWrapper} style={{ borderColor: '#10B981' }}>
                            {skill.icon ? (
                              <Image
                                src={skill.icon}
                                alt={skill.name || 'Skill'}
                                width={40}
                                height={40}
                                unoptimized
                              />
                            ) : (
                              <div className={styles.skillPlaceholder}>🛡️</div>
                            )}
                            {skill.level && skill.level > 1 && (
                              <span className={styles.skillLevel}>{skill.level}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Stigma Skills */}
                <div className={styles.skillSection}>
                  <h3 className={styles.sectionTitle}>스티그마 스킬</h3>
                  <div className={styles.skillGrid}>
                    {mappedSkills.skillList
                      .filter((s: any) => s.skillCategory === 'stigma')
                      .map((skill: any, idx: number) => (
                        <div key={idx} className={styles.skillItem}>
                          <div className={styles.skillIconWrapper} style={{ borderColor: '#F59E0B' }}>
                            {skill.icon ? (
                              <Image
                                src={skill.icon}
                                alt={skill.name || 'Skill'}
                                width={40}
                                height={40}
                                unoptimized
                              />
                            ) : (
                              <div className={styles.skillPlaceholder}>✨</div>
                            )}
                            {skill.level && skill.level > 1 && (
                              <span className={styles.skillLevel}>{skill.level}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <div>스킬 정보가 없습니다</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison with Main Character */}
      {mainCharacterData && mainCharacterData.characterId !== data.characterId && (
        <section className={styles.comparisonSection}>
          <h3 className={styles.sectionTitle}>대표 캐릭터와 비교</h3>
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonItem}>
              <div className={styles.comparisonLabel}>내 캐릭터</div>
              <div className={styles.comparisonName}>{mainCharacterData.name}</div>
              <div className={styles.comparisonValue}>{mainCharacterData.pve_score?.toLocaleString() || '-'}</div>
            </div>
            <div className={styles.comparisonVs}>VS</div>
            <div className={styles.comparisonItem}>
              <div className={styles.comparisonLabel}>조회 캐릭터</div>
              <div className={styles.comparisonName}>{data.name}</div>
              <div className={styles.comparisonValue}>{data.pve_score?.toLocaleString() || '-'}</div>
            </div>
          </div>
        </section>
      )}

      {/* 하단 여백 (광고 영역용) */}
      <div className={styles.bottomSpacer} />
    </div>
  )
}
