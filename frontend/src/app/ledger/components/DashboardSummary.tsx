'use client'

import { TrendingUp, Calendar, Package, Users } from 'lucide-react'
import { LedgerCharacter } from '@/types/ledger'
import styles from '../ledger.module.css'

interface DashboardSummaryProps {
  characters: LedgerCharacter[]
  totalTodayIncome: number
  totalWeeklyIncome: number
  unsoldItemCount: number
  unsoldItemsByGrade: {
    legendary: number
    heroic: number
    rare: number
    common: number
    ultimate: number
  }
  onCharacterClick: (characterId: string) => void
}

export default function DashboardSummary({
  characters,
  totalTodayIncome,
  totalWeeklyIncome,
  unsoldItemCount,
  unsoldItemsByGrade,
  onCharacterClick
}: DashboardSummaryProps) {
  const formatKina = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toLocaleString('ko-KR')
  }

  return (
    <>
      {/* 전체 수입 요약 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={18} />
            전체 수입 현황
          </h2>
        </div>

        <div className={styles.kinaGrid}>
          <div className={styles.kinaCard}>
            <div className={styles.kinaLabel}>
              <Calendar size={14} />
              오늘 총 수입
            </div>
            <div className={styles.kinaValue}>
              {totalTodayIncome.toLocaleString('ko-KR')} 키나
            </div>
          </div>

          <div className={styles.kinaCard}>
            <div className={styles.kinaLabel}>
              <TrendingUp size={14} />
              이번주 총 수입
            </div>
            <div className={styles.kinaValue}>
              {totalWeeklyIncome.toLocaleString('ko-KR')} 키나
            </div>
          </div>
        </div>
      </section>

      {/* 캐릭터별 요약 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Users size={18} />
            캐릭터별 수입
          </h2>
        </div>

        {characters.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👤</div>
            <p className={styles.emptyText}>등록된 캐릭터가 없습니다</p>
          </div>
        ) : (
          <div className={styles.dashboardGrid}>
            {characters.map((char) => (
              <div
                key={char.id}
                className={styles.charCard}
                onClick={() => onCharacterClick(char.id)}
              >
                <div className={styles.charCardHeader}>
                  {char.profile_image ? (
                    <img
                      src={char.profile_image}
                      alt={char.name}
                      className={styles.charCardAvatar}
                    />
                  ) : (
                    <div
                      className={styles.charCardAvatar}
                      style={{
                        background: '#27282e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a5a8b4'
                      }}
                    >
                      {char.name[0]}
                    </div>
                  )}
                  <div>
                    <div className={styles.charCardName}>{char.name}</div>
                    <div className={styles.charCardClass}>
                      {char.class_name} · {char.server_name}
                      {char.item_level && char.item_level > 0 && ` · IL ${char.item_level}`}
                    </div>
                  </div>
                </div>

                <div className={styles.charCardStats}>
                  <div className={styles.charCardStat}>
                    <span className={styles.charCardStatLabel}>오늘</span>
                    <span className={styles.charCardStatValue}>
                      {formatKina(char.todayIncome || 0)}
                    </span>
                  </div>
                  <div className={styles.charCardStat}>
                    <span className={styles.charCardStatLabel}>주간</span>
                    <span className={styles.charCardStatValue}>
                      {formatKina(char.weeklyIncome || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 미판매 아이템 요약 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Package size={18} />
            미판매 아이템
          </h2>
        </div>

        <div className={styles.kinaCard}>
          <div className={styles.kinaLabel}>전체 미판매 아이템</div>
          <div className={styles.kinaValue} style={{ color: '#ffffff' }}>
            {unsoldItemCount}개
          </div>

          {unsoldItemCount > 0 && (
            <div className={styles.kinaDetail}>
              {unsoldItemsByGrade.ultimate > 0 && (
                <div className={styles.kinaDetailRow}>
                  <span className={styles.kinaDetailLabel} style={{ color: '#F472B6' }}>
                    궁극급
                  </span>
                  <span className={styles.kinaDetailValue}>{unsoldItemsByGrade.ultimate}개</span>
                </div>
              )}
              {unsoldItemsByGrade.legendary > 0 && (
                <div className={styles.kinaDetailRow}>
                  <span className={styles.kinaDetailLabel} style={{ color: '#FBBF24' }}>
                    전설급
                  </span>
                  <span className={styles.kinaDetailValue}>{unsoldItemsByGrade.legendary}개</span>
                </div>
              )}
              {unsoldItemsByGrade.heroic > 0 && (
                <div className={styles.kinaDetailRow}>
                  <span className={styles.kinaDetailLabel} style={{ color: '#A78BFA' }}>
                    영웅급
                  </span>
                  <span className={styles.kinaDetailValue}>{unsoldItemsByGrade.heroic}개</span>
                </div>
              )}
              {unsoldItemsByGrade.rare > 0 && (
                <div className={styles.kinaDetailRow}>
                  <span className={styles.kinaDetailLabel} style={{ color: '#60A5FA' }}>
                    희귀급
                  </span>
                  <span className={styles.kinaDetailValue}>{unsoldItemsByGrade.rare}개</span>
                </div>
              )}
              {unsoldItemsByGrade.common > 0 && (
                <div className={styles.kinaDetailRow}>
                  <span className={styles.kinaDetailLabel} style={{ color: '#9CA3AF' }}>
                    일반
                  </span>
                  <span className={styles.kinaDetailValue}>{unsoldItemsByGrade.common}개</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
