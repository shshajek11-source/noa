'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ItemSearchBar from '../../components/item/ItemSearchBar'
import ItemSearchResults from '../../components/item/ItemSearchResults'
import ItemDetailModal from '../../components/item/ItemDetailModal'
import { ItemSearchResult, SLOT_GROUPS, SLOT_POS_MAP, GRADE_COLORS } from '@/types/item'
import styles from '../../components/item/ItemSearch.module.css'

const GRADES = ['Mythic', 'Legendary', 'Unique', 'Epic', 'Fabled', 'Rare', 'Common']

function ItemSearchContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [keyword, setKeyword] = useState(searchParams.get('q') || '')
    const [slotFilter, setSlotFilter] = useState(searchParams.get('slot') || '')
    const [gradeFilter, setGradeFilter] = useState(searchParams.get('grade') || '')
    const [results, setResults] = useState<ItemSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null)

    // URL 파라미터가 있으면 초기 검색
    useEffect(() => {
        const q = searchParams.get('q')
        if (q) {
            handleSearch(q)
        }
    }, [])

    const handleSearch = async (searchKeyword: string) => {
        setKeyword(searchKeyword)
        setSearched(true)
        setLoading(true)

        // URL 업데이트
        const params = new URLSearchParams()
        if (searchKeyword) params.set('q', searchKeyword)
        if (slotFilter) params.set('slot', slotFilter)
        if (gradeFilter) params.set('grade', gradeFilter)
        router.push(`?${params.toString()}`, { scroll: false })

        try {
            const apiParams = new URLSearchParams()
            if (searchKeyword) apiParams.set('keyword', searchKeyword)
            if (slotFilter) apiParams.set('slot', slotFilter)
            if (gradeFilter) apiParams.set('grade', gradeFilter)

            const res = await fetch(`/api/item/search?${apiParams.toString()}`)
            const json = await res.json()

            setResults(json.data || [])
        } catch (err) {
            console.error('Search failed:', err)
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (type: 'slot' | 'grade', value: string) => {
        if (type === 'slot') {
            setSlotFilter(value)
        } else {
            setGradeFilter(value)
        }

        // 키워드가 있으면 즉시 재검색
        if (keyword || searched) {
            setTimeout(() => handleSearch(keyword), 0)
        }
    }

    const handleItemClick = (item: ItemSearchResult) => {
        setSelectedItem(item)
    }

    return (
        <div>
            {/* 검색 바 */}
            <ItemSearchBar
                initialValue={keyword}
                onSearch={handleSearch}
            />

            {/* 필터 */}
            <div className={styles.filtersRow}>
                <select
                    value={slotFilter}
                    onChange={(e) => handleFilterChange('slot', e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">전체 슬롯</option>
                    {SLOT_GROUPS.map(group => (
                        <optgroup key={group.name} label={group.name}>
                            {group.slots.map(slot => (
                                <option key={slot} value={slot}>
                                    {SLOT_POS_MAP[slot]}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>

                <select
                    value={gradeFilter}
                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">전체 등급</option>
                    {GRADES.map(grade => (
                        <option key={grade} value={grade} style={{ color: GRADE_COLORS[grade] }}>
                            {grade}
                        </option>
                    ))}
                </select>
            </div>

            {/* 검색 결과 */}
            {searched ? (
                <ItemSearchResults
                    items={results}
                    loading={loading}
                    keyword={keyword}
                    onItemClick={handleItemClick}
                />
            ) : (
                <div className={styles.noResults}>
                    <h3>아이템 검색</h3>
                    <p>아이템 이름을 입력하거나 필터를 선택하여 검색하세요.</p>
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6B7280' }}>
                        수집된 캐릭터들의 장비 데이터를 기반으로 검색됩니다.
                    </p>
                </div>
            )}

            {/* 아이템 상세 모달 */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    )
}

export default function ItemSearchPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>로딩 중...</div>}>
            <ItemSearchContent />
        </Suspense>
    )
}
