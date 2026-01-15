'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ItemSearchBar from '../../components/item/ItemSearchBar'
import ItemDetailModal from '../../components/item/ItemDetailModal'
import {
    ItemSearchResult,
    OfficialItem,
    OfficialCategory,
    OfficialGrade,
    OfficialSearchResponse,
    convertOfficialToSearchResult,
    GRADE_COLORS
} from '@/types/item'
import styles from '../../components/item/ItemSearch.module.css'

// 공식 API 등급 -> 표시 색상 매핑
const OFFICIAL_GRADE_COLORS: Record<string, string> = {
    'Epic': '#7E3DCF',
    'Unique': '#FFB84D',
    'Legend': '#FB9800',
    'Rare': '#3B82F6',
    'Common': '#9CA3AF'
}

function ItemSearchContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [keyword, setKeyword] = useState(searchParams.get('q') || '')
    const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '')
    const [gradeFilter, setGradeFilter] = useState(searchParams.get('grade') || '')
    const [results, setResults] = useState<ItemSearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null)

    // 카테고리 및 등급 목록
    const [categories, setCategories] = useState<OfficialCategory[]>([])
    const [grades, setGrades] = useState<OfficialGrade[]>([])
    const [loadingMeta, setLoadingMeta] = useState(true)

    // 페이지네이션
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const pageSize = 30

    // 카테고리/등급 목록 로드
    useEffect(() => {
        const loadMeta = async () => {
            try {
                const [catRes, gradeRes] = await Promise.all([
                    fetch('/api/item/official?action=categories'),
                    fetch('/api/item/official?action=grades')
                ])

                if (catRes.ok) {
                    const catData = await catRes.json()
                    setCategories(catData)
                }

                if (gradeRes.ok) {
                    const gradeData = await gradeRes.json()
                    setGrades(gradeData)
                }
            } catch (err) {
                console.error('Failed to load metadata:', err)
            } finally {
                setLoadingMeta(false)
            }
        }

        loadMeta()
    }, [])

    // 초기 로드 - 모든 아이템 표시
    useEffect(() => {
        const q = searchParams.get('q')
        const cat = searchParams.get('category')
        const grade = searchParams.get('grade')

        if (q || cat || grade) {
            handleSearch(q || '', cat || '', grade || '', 1)
        } else {
            // 초기 로드: 전체 아이템 목록
            handleSearch('', '', '', 1)
        }
    }, [])

    const handleSearch = useCallback(async (
        searchKeyword: string,
        category: string = categoryFilter,
        grade: string = gradeFilter,
        pageNum: number = 1
    ) => {
        setKeyword(searchKeyword)
        setSearched(true)
        setLoading(true)

        // URL 업데이트
        const params = new URLSearchParams()
        if (searchKeyword) params.set('q', searchKeyword)
        if (category) params.set('category', category)
        if (grade) params.set('grade', grade)
        if (pageNum > 1) params.set('page', String(pageNum))
        router.push(`?${params.toString()}`, { scroll: false })

        try {
            const apiParams = new URLSearchParams()
            apiParams.set('action', 'search')
            if (searchKeyword) apiParams.set('keyword', searchKeyword)
            if (category) apiParams.set('category', category)
            if (grade) apiParams.set('grade', grade)
            apiParams.set('page', String(pageNum))
            apiParams.set('size', String(pageSize))

            const res = await fetch(`/api/item/official?${apiParams.toString()}`)
            const json: OfficialSearchResponse = await res.json()

            if (json.contents) {
                const converted = json.contents.map(convertOfficialToSearchResult)
                setResults(converted)
                setTotalPages(json.pagination.lastPage)
                setTotalCount(json.pagination.total)
                setPage(pageNum)
            } else {
                setResults([])
                setTotalPages(1)
                setTotalCount(0)
            }
        } catch (err) {
            console.error('Search failed:', err)
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [categoryFilter, gradeFilter, router])

    const handleFilterChange = (type: 'category' | 'grade', value: string) => {
        if (type === 'category') {
            setCategoryFilter(value)
            handleSearch(keyword, value, gradeFilter, 1)
        } else {
            setGradeFilter(value)
            handleSearch(keyword, categoryFilter, value, 1)
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            handleSearch(keyword, categoryFilter, gradeFilter, newPage)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handleItemClick = (item: ItemSearchResult) => {
        setSelectedItem(item)
    }

    // 카테고리 평탄화 (하위 카테고리 포함)
    const flattenCategories = (cats: OfficialCategory[]): { id: string; name: string; parentName?: string }[] => {
        const result: { id: string; name: string; parentName?: string }[] = []
        cats.forEach(cat => {
            if (cat.child && cat.child.length > 0) {
                cat.child.forEach(child => {
                    result.push({ id: child.id, name: child.name, parentName: cat.name })
                })
            } else {
                result.push({ id: cat.id, name: cat.name })
            }
        })
        return result
    }

    const flatCategories = flattenCategories(categories)

    return (
        <div>
            {/* 검색 바 */}
            <ItemSearchBar
                initialValue={keyword}
                onSearch={(k) => handleSearch(k, categoryFilter, gradeFilter, 1)}
            />

            {/* 필터 */}
            <div className={styles.filtersRow}>
                <select
                    value={categoryFilter}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className={styles.filterSelect}
                    disabled={loadingMeta}
                >
                    <option value="">전체 카테고리</option>
                    {categories.map(cat => (
                        cat.child && cat.child.length > 0 ? (
                            <optgroup key={cat.id} label={cat.name}>
                                {cat.child.map(child => (
                                    <option key={child.id} value={child.id}>
                                        {child.name}
                                    </option>
                                ))}
                            </optgroup>
                        ) : (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        )
                    ))}
                </select>

                <select
                    value={gradeFilter}
                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                    className={styles.filterSelect}
                    disabled={loadingMeta}
                >
                    <option value="">전체 등급</option>
                    {grades.map(grade => (
                        <option
                            key={grade.id}
                            value={grade.id}
                            style={{ color: OFFICIAL_GRADE_COLORS[grade.id] || '#E5E7EB' }}
                        >
                            {grade.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 검색 결과 */}
            {loading ? (
                <div className={styles.loading}>검색 중...</div>
            ) : results.length === 0 ? (
                <div className={styles.noResults}>
                    <h3>검색 결과가 없습니다</h3>
                    {keyword ? (
                        <p>&quot;{keyword}&quot;에 해당하는 아이템을 찾지 못했습니다.</p>
                    ) : (
                        <p>아이템 이름을 입력하거나 필터를 선택하여 검색하세요.</p>
                    )}
                </div>
            ) : (
                <div className={styles.resultsContainer}>
                    <div className={styles.resultsHeader}>
                        <span className={styles.resultsCount}>
                            {keyword && `"${keyword}" `}
                            검색 결과 <strong>{totalCount.toLocaleString()}</strong>개
                        </span>
                    </div>

                    <div className={styles.resultsGrid}>
                        {results.map(item => (
                            <div
                                key={item.itemId}
                                className={styles.itemCard}
                                onClick={() => handleItemClick(item)}
                            >
                                <div className={styles.itemIconWrapper}>
                                    {item.icon ? (
                                        <img
                                            src={item.icon}
                                            alt={item.name}
                                            className={styles.itemIcon}
                                        />
                                    ) : (
                                        <span className={styles.itemNoIcon}>?</span>
                                    )}
                                </div>
                                <div className={styles.itemDetails}>
                                    <div
                                        className={styles.itemName}
                                        style={{ color: OFFICIAL_GRADE_COLORS[item.grade as string] || '#E5E7EB' }}
                                    >
                                        {item.name}
                                    </div>
                                    <div className={styles.itemMeta}>
                                        <span className={styles.itemSlot}>{item.categoryName}</span>
                                        <span style={{ color: OFFICIAL_GRADE_COLORS[item.grade as string] }}>
                                            {grades.find(g => g.id === item.grade)?.name || item.grade}
                                        </span>
                                        {item.tradable === false && (
                                            <span style={{ color: '#EF4444' }}>거래불가</span>
                                        )}
                                    </div>
                                    {item.options && item.options.length > 0 && (
                                        <div className={styles.itemOptions}>
                                            {item.options.slice(0, 2).map((opt, i) => (
                                                <span key={i} className={styles.itemOption}>
                                                    {typeof opt === 'string' ? opt : `${opt.name}: ${opt.value}`}
                                                </span>
                                            ))}
                                            {item.options.length > 2 && (
                                                <span className={styles.itemOption}>+{item.options.length - 2}개</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={page === 1}
                                className={styles.pageBtn}
                            >
                                ««
                            </button>
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className={styles.pageBtn}
                            >
                                «
                            </button>

                            <span className={styles.pageInfo}>
                                {page} / {totalPages}
                            </span>

                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className={styles.pageBtn}
                            >
                                »
                            </button>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={page === totalPages}
                                className={styles.pageBtn}
                            >
                                »»
                            </button>
                        </div>
                    )}
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
