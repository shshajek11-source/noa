'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import styles from './Ranking.module.css'
import { SERVERS } from '../../constants/servers'

const CLASSES = [
    'Gladiator', 'Templar', 'Ranger', 'Assassin', 'Sorcerer', 'Spiritmaster', 'Cleric', 'Chanter'
]

export default function RankingFilterBar() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [server, setServer] = useState(searchParams.get('server') || '')
    const [race, setRace] = useState(searchParams.get('race') || '')
    const [className, setClassName] = useState(searchParams.get('class') || '')
    const [search, setSearch] = useState(searchParams.get('q') || '')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleFilterChange('q', search)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        // Reset page on filter change
        params.set('page', '1')

        router.push(`?${params.toString()}`)
    }

    // Common select style (could be in module, but simple inline override for specifics is ok or use class)
    const selectStyle = {
        background: '#0f1219',
        color: '#d1d5db',
        border: '1px solid #2d3a54',
        borderRadius: '4px',
        padding: '0.6rem 2rem 0.6rem 1rem',
        cursor: 'pointer'
    }

    return (
        <div className={styles.filterBar}>
            <div className={styles.selectGroup}>
                <select
                    value={server}
                    onChange={(e) => {
                        setServer(e.target.value)
                        handleFilterChange('server', e.target.value)
                    }}
                    style={selectStyle}
                >
                    <option value="">전체 서버</option>
                    {SERVERS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select
                    value={race}
                    onChange={(e) => {
                        setRace(e.target.value)
                        handleFilterChange('race', e.target.value)
                    }}
                    style={selectStyle}
                >
                    <option value="">전체 종족</option>
                    <option value="ELYOS">천족</option>
                    <option value="ASMODIANS">마족</option>
                </select>

                <select
                    value={className}
                    onChange={(e) => {
                        setClassName(e.target.value)
                        handleFilterChange('class', e.target.value)
                    }}
                    style={selectStyle}
                >
                    <option value="">전체 직업</option>
                    <option value="Gladiator">검성</option>
                    <option value="Templar">수호성</option>
                    <option value="Ranger">궁성</option>
                    <option value="Assassin">살성</option>
                    <option value="Sorcerer">마도성</option>
                    <option value="Spiritmaster">정령성</option>
                    <option value="Cleric">치유성</option>
                    <option value="Chanter">호법성</option>
                </select>
            </div>

            <div className={styles.searchInputWrapper}>
                <input
                    type="text"
                    placeholder="캐릭터 이름 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={styles.searchInput}
                />
                <Search className={styles.searchIcon} />
            </div>
        </div>
    )
}
