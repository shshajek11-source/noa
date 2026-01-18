'use client'

import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import styles from '@/app/components/shared/HeaderButtons.module.css'

export default function CharacterUpdateButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/tools/stat-update')}
      className={styles.updateButton}
      title="캐릭터 스탯을 OCR로 업데이트"
    >
      <Upload size={16} />
      <span className="hidden md:inline">캐릭 업데이트</span>
    </button>
  )
}
