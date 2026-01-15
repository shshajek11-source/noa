'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ItemSearchResult, ItemUsageStat, GRADE_COLORS } from '@/types/item'
import styles from './ItemSearch.module.css'

// 공식 API 등급 -> 표시 색상 매핑
const OFFICIAL_GRADE_COLORS: Record<string, string> = {
    'Epic': '#7E3DCF',
    'Unique': '#FFB84D',
    'Legend': '#FB9800',
    'Rare': '#3B82F6',
    'Common': '#9CA3AF'
}

// 등급 ID -> 한국어 이름
const GRADE_NAMES: Record<string, string> = {
    'Epic': '영웅',
    'Unique': '유일',
    'Legend': '전승',
    'Rare': '희귀',
    'Common': '일반'
}

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

    // 공식 API 필드
    const options = 'options' in item ? item.options : []
    const tradable = 'tradable' in item ? item.tradable : undefined
    const description = 'description' in item ? item.description : ''

    // 사용 통계 (ItemUsageStat인 경우)
    const usageCount = 'usageCount' in item ? item.usageCount : null
    const usagePercent = 'usagePercent' in item ? item.usagePercent : null
    const avgEnhanceLevel = 'avgEnhanceLevel' in item ? item.avgEnhanceLevel : null
    const avgBreakthrough = 'avgBreakthrough' in item ? item.avgBreakthrough : null

    const gradeColor = OFFICIAL_GRADE_COLORS[grade] || GRADE_COLORS[grade] || GRADE_COLORS['Common']
    const gradeName = GRADE_NAMES[grade] || grade

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
                                src={icon}
                                alt={name}
                                onError={(e) => {
                                    // 프록시 시도
                                    const img = e.target as HTMLImageElement
                                    if (!img.src.includes('image-proxy')) {
                                        img.src = `/api/image-proxy?url=${encodeURIComponent(icon)}`
                                    } else {
                                        img.style.display = 'none'
                                    }
                                }}
                            />
                        ) : (
                            <span style={{ color: '#4B5563', fontSize: '1.5rem' }}>?</span>
                        )}
                    </div>

                    <div className={styles.modalTitle}>
                        <h2 style={{ color: gradeColor }}>{name}</h2>
                        <p>
                            {categoryName && <span>{categoryName}</span>}
                            {slotName && <span> · {slotName}</span>}
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
                                {gradeName}
                            </span>
                        </div>
                        {categoryName && (
                            <div className={styles.statRow}>
                                <span className={styles.statName}>카테고리</span>
                                <span className={styles.statValue}>{categoryName}</span>
                            </div>
                        )}
                        {tradable !== undefined && (
                            <div className={styles.statRow}>
                                <span className={styles.statName}>거래 가능</span>
                                <span className={styles.statValue} style={{ color: tradable ? '#10B981' : '#EF4444' }}>
                                    {tradable ? '가능' : '불가'}
                                </span>
                            </div>
                        )}
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
                    </div>

                    {/* 옵션 (공식 API) */}
                    {options && options.length > 0 && (
                        <div className={styles.statSection}>
                            <h3>아이템 옵션</h3>
                            {options.map((opt, i) => (
                                <div key={i} className={styles.statRow}>
                                    <span className={styles.statValue} style={{ color: '#E5E7EB' }}>
                                        {typeof opt === 'string' ? opt : `${opt.name}: ${opt.value}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

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

                    {/* 설명 (있는 경우) */}
                    {description && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: '#0B0D12',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: '#9CA3AF',
                            lineHeight: 1.5
                        }}>
                            {description}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
