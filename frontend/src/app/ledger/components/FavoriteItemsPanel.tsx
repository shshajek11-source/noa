'use client'

import styles from './FavoriteItemsPanel.module.css'

export interface FavoriteItem {
  id: string
  item_id: string
  item_name: string
  item_grade: string
  item_category: string
  display_order: number
}

interface FavoriteItemsPanelProps {
  favorites: FavoriteItem[]
  onSelectFavorite: (favorite: FavoriteItem) => void
  onRemoveFavorite: (id: string) => Promise<void>
}

export default function FavoriteItemsPanel({ favorites, onSelectFavorite, onRemoveFavorite }: FavoriteItemsPanelProps) {
  const getGradeClass = (grade: string) => {
    const gradeMap: Record<string, string> = {
      'common': styles.gradeCommon,
      'rare': styles.gradeRare,
      'heroic': styles.gradeHeroic,
      'legendary': styles.gradeLegendary,
      'ultimate': styles.gradeUltimate
    }
    return gradeMap[grade.toLowerCase()] || styles.gradeCommon
  }

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await onRemoveFavorite(id)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>⭐</span>
          <span>즐겨찾기</span>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⭐</div>
          <div className={styles.emptyText}>
            자주 사용하는 아이템을<br />
            즐겨찾기에 추가하세요
          </div>
          <div className={styles.hint}>
            💡 아이템 카드의 별 아이콘을 클릭하여 즐겨찾기에 추가할 수 있습니다
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {favorites.map((favorite) => (
            <div
              key={favorite.id}
              className={styles.favoriteCard}
              onClick={() => onSelectFavorite(favorite)}
              title={`${favorite.item_name} 추가`}
            >
              <div className={styles.favoriteIcon}>💎</div>
              <div className={styles.favoriteName}>{favorite.item_name}</div>
              <div className={`${styles.favoriteGrade} ${getGradeClass(favorite.item_grade)}`}>
                {favorite.item_grade}
              </div>
              <button
                className={styles.removeBtn}
                onClick={(e) => handleRemove(e, favorite.id)}
                title="즐겨찾기 해제"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
