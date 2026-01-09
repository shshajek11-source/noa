'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ItemSearchResult, ItemUsageStat, GRADE_COLORS } from '@/types/item'
import styles from './ItemSearch.module.css'

interface ItemDetailModalProps {
    item: ItemSearchResult | ItemUsageStat | null
    onClose: () => void
}

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    // 배경 클릭으로 닫기
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose()
    }

    if (!item) return null

    // ItemUsageStat과 ItemSearchResult 모두 지원
    const itemId = 'itemId' in item ? item.itemId : ''
    const name = 'name' in item ? item.name : 'itemName' in item ? item.itemName : ''
    const grade = item.grade || 'Common'
    const icon = item.icon || ''
    const slotName = item.slotName || ''
    const itemLevel = 'itemLevel' in item ? item.itemLevel : 0
    const categoryName = 'categoryName' in item ? item.categoryName : ''

    // 사용 통계 (ItemUsageStat인 경우)
    const usageCount = 'usageCount' in item ? item.usageCount : null
    const usagePercent = 'usagePercent' in item ? item.usagePercent : null
    const avgEnhanceLevel = 'avgEnhanceLevel' in item ? item.avgEnhanceLevel : null
    const avgBreakthrough = 'avgBreakthrough' in item ? item.avgBreakthrough : null

    const gradeColor = GRADE_COLORS[grade] || GRADE_COLORS['Common']

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modalContent}>
                {/* 헤더 */}
                <div className={styles.modalHeader}>
                    <div
                        className={styles.modalIcon}
                        style={{ borderColor: gradeColor }}
                    >
                        {icon ? (
                            <img
                                src={`/api/image-proxy?url=${encodeURIComponent(icon)}`}
                                alt={name}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                }}
                            />
                        ) : (
                            <span style={{ color: '#4B5563', fontSize: '1.5rem' }}>?</span>
                        )}
                    </div>

                    <div className={styles.modalTitle}>
                        <h2 style={{ color: gradeColor }}>{name}</h2>
                        <p>
                            {slotName && <span>{slotName}</span>}
                            {categoryName && <span> · {categoryName}</span>}
                            {itemLevel > 0 && <span> · Lv.{itemLevel}</span>}
                        </p>
                    </div>

                    <button className={styles.modalClose} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* 본문 */}
                <div className={styles.modalBody}>
                    {/* 기본 정보 */}
                    <div className={styles.statSection}>
                        <h3>기본 정보</h3>
                        <div className={styles.statRow}>
                            <span className={styles.statName}>등급</span>
                            <span className={styles.statValue} style={{ color: gradeColor }}>
                                {grade}
                            </span>
                        </div>
                        {itemLevel > 0 && (
                            <div className={styles.statRow}>
                                <span className={styles.statName}>아이템 레벨</span>
                                <span className={styles.statValue}>{itemLevel}</span>
                            </div>
                        )}
                        {slotName && (
                            <div className={styles.statRow}>
                                <span className={styles.statName}>장착 부위</span>
                                <span className={styles.statValue}>{slotName}</span>
                            </div>
                        )}
                        {categoryName && (
                            <div className={styles.statRow}>
                                <span className={styles.statName}>카테고리</span>
                                <span className={styles.statValue}>{categoryName}</span>
                            </div>
                        )}
                    </div>

                    {/* 사용 통계 (있는 경우) */}
                    {usageCount !== null && (
                        <div className={styles.statSection}>
                            <h3>사용 통계</h3>
                            <div className={styles.statRow}>
                                <span className={styles.statName}>사용자 수</span>
                                <span className={styles.statValue}>
                                    {usageCount?.toLocaleString()}명
                                </span>
                            </div>
                            {usagePercent !== null && (
                                <div className={styles.statRow}>
                                    <span className={styles.statName}>사용률</span>
                                    <span className={styles.statValue} style={{ color: '#FACC15' }}>
                                        {usagePercent}%
                                    </span>
                                </div>
                            )}
                            {avgEnhanceLevel !== null && (
                                <div className={styles.statRow}>
                                    <span className={styles.statName}>평균 강화</span>
                                    <span className={styles.statValue}>
                                        +{avgEnhanceLevel?.toFixed(1)}
                                    </span>
                                </div>
                            )}
                            {avgBreakthrough !== null && avgBreakthrough > 0 && (
                                <div className={styles.statRow}>
                                    <span className={styles.statName}>평균 돌파</span>
                                    <span className={styles.statValue} style={{ color: '#60A5FA' }}>
                                        {avgBreakthrough?.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 안내 메시지 */}
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: '#0B0D12',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        color: '#6B7280',
                        textAlign: 'center'
                    }}>
                        상세 옵션 및 획득처 정보는<br />
                        캐릭터 상세 페이지에서 확인할 수 있습니다.
                    </div>
                </div>
            </div>
        </div>
    )
}
