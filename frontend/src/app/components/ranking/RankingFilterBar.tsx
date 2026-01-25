'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import styles from './Ranking.module.css'
import { SERVERS } from '../../constants/servers'
import { CLASSES, RACES } from '../../constants/game-data'

interface RankingFilterBarProps {
    type?: 'combat' | 'content'
}

export default function RankingFilterBar({ type = 'combat' }: RankingFilterBarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [server, setServer] = useState(searchParams.get('server') || '')
    const [race, setRace] = useState(searchParams.get('race') || '')
    const [className, setClassName] = useState(searchParams.get('class') || '')
    const [search, setSearch] = useState(searchParams.get('q') || '')
    const [sort, setSort] = useState(searchParams.get('sort') || 'pve')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            handleFilterChange('q', search)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    // URL 변경 시 sort 상태 동기화
    useEffect(() => {
        setSort(searchParams.get('sort') || 'pve')
    }, [searchParams])

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

    const handleSortChange = (newSort: 'pve' | 'pvp') => {
        setSort(newSort)
        handleFilterChange('sort', newSort)
    }

    return (
        <div className={styles.filterBar}>
            {/* PVE/PVP 토글 (전투력 탭에서만) */}
            {type === 'combat' && (
                <div className={styles.sortToggle}>
                    <button
                        className={`${styles.sortBtn} ${sort === 'pve' ? styles.sortBtnActive : ''}`}
                        onClick={() => handleSortChange('pve')}
                    >
                        PVE
                    </button>
                    <button
                        className={`${styles.sortBtn} ${sort === 'pvp' ? styles.sortBtnActive : ''}`}
                        onClick={() => handleSortChange('pvp')}
                    >
                        PVP
                    </button>
                </div>
            )}

            <div className={styles.selectGroup}>
                <select
                    value={server}
                    onChange={(e) => {
                        setServer(e.target.value)
                        handleFilterChange('server', e.target.value)
                    }}
                    className={styles.dsSelect}
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
                    className={styles.dsSelect}
                >
                    <option value="">전체 종족</option>
                    {RACES.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>

                <select
                    value={className}
                    onChange={(e) => {
                        setClassName(e.target.value)
                        handleFilterChange('class', e.target.value)
                    }}
                    className={styles.dsSelect}
                >
                    <option value="">전체 직업</option>
                    {CLASSES.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className={styles.dsSearchWrapper}>
                <div className={styles.dsSearchInner}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="캐릭터 이름 검색..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
            </div>
        </div>
    )
}
