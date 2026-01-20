'use client'

import React from 'react'
import styles from '../ledger.module.css'
import { Settings } from 'lucide-react'
import { LedgerCharacter } from '@/types/ledger'

interface CharacterDetailHeaderProps {
    character: LedgerCharacter
    onBack: () => void
    onSettingsClick?: () => void
}

const CharacterDetailHeader: React.FC<CharacterDetailHeaderProps> = ({
    character,
    onBack,
    onSettingsClick
}) => {
    // 포맷팅 함수 (Kina)
    const formatKina = (value: number = 0) => {
        if (value >= 100000000) {
            return `${(value / 100000000).toFixed(1)}억`
        }
        if (value >= 10000) {
            return `${(value / 10000).toLocaleString()}만`
        }
        return value.toLocaleString()
    }

    return (
        <div className={styles.detailHeaderContainer}>
            <div className={styles.backBtn} onClick={onBack}>&lt;</div>

            <div className={styles.detailMainHeader}>
                <div className={styles.profileArea}>
                    <div className={styles.profileImgLarge}>
                        {character.profile_image ? (
                            <img
                                src={character.profile_image}
                                alt={character.name}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: '1.5rem' }}>👤</div>
                        )}
                    </div>
                    <div className={styles.settingsIcon} onClick={onSettingsClick}>
                        <Settings size={14} />
                    </div>
                </div>

                <div className={styles.charInfoArea}>
                    <div className={styles.detailCharName}>{character.name}</div>
                    <div className={styles.detailCharInfo}>
                        {character.server_name} | {character.class_name}
                    </div>
                </div>

                <div className={styles.incomeStatsArea}>
                    <div className={styles.incomeStat}>
                        <span className={styles.incomeStatLabel}>일일수입</span>
                        <span className={styles.incomeStatValue}>{formatKina(character.todayIncome)}</span>
                    </div>
                    <div className={styles.incomeStat}>
                        <span className={styles.incomeStatLabel}>주간수입</span>
                        <span className={styles.incomeStatValue}>{formatKina(character.weeklyIncome)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CharacterDetailHeader
