'use client'

import { useState } from 'react'
import styles from './NicknameModal.module.css'

interface NicknameModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (nickname: string) => Promise<void>
  currentNickname?: string | null
}

export default function NicknameModal({ isOpen, onClose, onSubmit, currentNickname }: NicknameModalProps) {
  const [nickname, setNickname] = useState(currentNickname || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = nickname.trim()
    if (!trimmed) {
      setError('닉네임을 입력해주세요')
      return
    }

    if (trimmed.length > 20) {
      setError('닉네임은 최대 20자까지 가능합니다')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(trimmed)
      onClose()
    } catch (err: any) {
      setError(err.message || '닉네임 설정에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>닉네임 설정</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <p className={styles.description}>
              가계부에서 사용할 닉네임을 설정해주세요
            </p>

            <div className={styles.inputGroup}>
              <label htmlFor="nickname" className={styles.label}>
                닉네임
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임 입력 (최대 20자)"
                maxLength={20}
                className={styles.input}
                autoFocus
                disabled={isSubmitting}
              />
              <div className={styles.charCount}>
                {nickname.length} / 20
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !nickname.trim()}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
