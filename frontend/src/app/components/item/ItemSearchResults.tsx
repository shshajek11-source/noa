'use client'

import { ItemSearchResult } from '@/types/item'
import ItemCard from './ItemCard'
import styles from './ItemSearch.module.css'

interface ItemSearchResultsProps {
    items: ItemSearchResult[]
    loading: boolean
    keyword?: string
    onItemClick?: (item: ItemSearchResult) => void
}

export default function ItemSearchResults({
    items,
    loading,
    keyword,
    onItemClick
}: ItemSearchResultsProps) {
    if (loading) {
        return (
            <div className={styles.loading}>
                검색 중...
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className={styles.noResults}>
                <h3>검색 결과가 없습니다</h3>
                {keyword ? (
                    <p>&quot;{keyword}&quot;에 해당하는 아이템을 찾지 못했습니다.</p>
                ) : (
                    <p>아이템 이름을 입력하여 검색해보세요.</p>
                )}
            </div>
        )
    }

    return (
        <div className={styles.resultsContainer}>
            <div className={styles.resultsHeader}>
                <span className={styles.resultsCount}>
                    {keyword && `"${keyword}" `}
                    검색 결과 <strong>{items.length}</strong>개
                </span>
            </div>

            <div className={styles.resultsGrid}>
                {items.map(item => (
                    <ItemCard
                        key={item.itemId}
                        item={item}
                        onClick={onItemClick}
                    />
                ))}
            </div>
        </div>
    )
}
