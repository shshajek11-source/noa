'use client'

import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import styles from './ItemSearch.module.css'

interface ItemSearchBarProps {
    initialValue?: string
    onSearch: (keyword: string) => void
    placeholder?: string
}

export default function ItemSearchBar({
    initialValue = '',
    onSearch,
    placeholder = '아이템 이름으로 검색...'
}: ItemSearchBarProps) {
    const [keyword, setKeyword] = useState(initialValue)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch(keyword)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeyword(e.target.value)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch(keyword)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={styles.searchInputWrapper}>
                <Search size={20} className={styles.searchIcon} />
                <input
                    type="text"
                    value={keyword}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={styles.searchInput}
                />
            </div>
            <button type="submit" className={styles.searchButton}>
                검색
            </button>
        </form>
    )
}
