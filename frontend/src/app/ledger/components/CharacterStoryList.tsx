'use client'

import React from 'react'
import styles from '../ledger.module.css'
import { LedgerCharacter } from '@/types/ledger'

interface CharacterStoryListProps {
    characters: LedgerCharacter[]
    activeCharacterId?: string
    onCharacterClick: (id: string | 'dashboard') => void
}

const CharacterStoryList: React.FC<CharacterStoryListProps> = ({
    characters,
    activeCharacterId,
    onCharacterClick
}) => {
    return (
        <div className={styles.storyContainer}>
            {/* Dashboard Item (Always first) */}
            <div
                className={styles.storyItem}
                onClick={() => onCharacterClick('dashboard')}
            >
                <div
                    className={styles.storyAvatarWrapper}
                    style={{
                        background: activeCharacterId === 'dashboard'
                            ? 'linear-gradient(45deg, var(--primary), var(--brand-red-main))'
                            : '#444'
                    }}
                >
                    <div className={styles.storyAvatar}>
                        <div style={{ fontSize: '1.2rem' }}>📊</div>
                    </div>
                </div>
                <div className={styles.storyName}>전체현황</div>
                <div className={styles.storyJob}>대시보드</div>
            </div>

            {/* Character Items */}
            {characters.map((char) => (
                <div
                    key={char.id}
                    className={styles.storyItem}
                    onClick={() => onCharacterClick(char.id)}
                >
                    <div
                        className={styles.storyAvatarWrapper}
                        style={{
                            background: activeCharacterId === char.id
                                ? 'linear-gradient(45deg, var(--primary), var(--brand-red-main))'
                                : '#444'
                        }}
                    >
                        <div className={styles.storyAvatar}>
                            {char.profile_image ? (
                                <img
                                    src={char.profile_image}
                                    alt={char.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ color: '#666', fontSize: '1.2rem' }}>👤</div>
                            )}
                        </div>
                    </div>
                    <div className={styles.storyName}>{char.name}</div>
                    <div className={styles.storyJob}>{char.class_name}</div>
                </div>
            ))}
        </div>
    )
}

export default CharacterStoryList
