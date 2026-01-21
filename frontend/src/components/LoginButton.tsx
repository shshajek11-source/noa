'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/context/AuthContext'
import { LogIn, LogOut, User, Star } from 'lucide-react'
import { MainCharacter } from '@/app/components/SearchBar'
import styles from '@/app/components/shared/HeaderButtons.module.css'

// 모달 지연 로딩 (클릭 시에만 로드)
const MainCharacterModal = dynamic(() => import('./MainCharacterModal'), { ssr: false })

export default function LoginButton() {
  const { user, isLoading, nickname, mainCharacter, signInWithGoogle, signOut, setMainCharacter } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMainCharacterModal, setShowMainCharacterModal] = useState(false)

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />
    )
  }

  const handleSetMainCharacter = async (character: MainCharacter) => {
    await setMainCharacter({
      ...character,
      className: character.className || '',
      level: character.level || 0
    })
    setShowMainCharacterModal(false)
    setShowDropdown(false)
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className={styles.loginButton}
      >
        <LogIn size={14} />
        <span className="hidden md:inline">로그인</span>
      </button>
    )
  }

  // Logged in - show user avatar with dropdown
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={styles.profileButton}
      >
        {user.user_metadata?.avatar_url ? (
          <div className={styles.avatarWrapper}>
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className={styles.avatar}
            />
          </div>
        ) : (
          <div className={styles.avatarWrapper}>
            <div className="w-full h-full flex items-center justify-center bg-primary text-black">
              <User size={16} />
            </div>
          </div>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={() => setShowDropdown(false)}
          />
          {/* Dropdown */}
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownHeader}>
              <div className={styles.userDisplayName}>
                {nickname || user.user_metadata?.full_name || 'User'}
              </div>
              <div className={styles.userEmail}>
                {user.user_metadata?.full_name || user.email}
              </div>

              {mainCharacter && (
                <div className="text-[11px] text-primary mt-2 p-1.5 bg-primary/10 rounded flex items-center gap-1">
                  <Star size={12} className="text-primary fill-primary" />
                  {mainCharacter.name} ({mainCharacter.server})
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowDropdown(false)
                setShowMainCharacterModal(true)
              }}
              className={styles.dropdownItem}
            >
              <Star size={14} />
              {mainCharacter ? '대표 캐릭터 변경' : '대표 캐릭터 설정'}
            </button>
            <button
              onClick={async () => {
                await signOut()
                setShowDropdown(false)
              }}
              className={`${styles.dropdownItem} ${styles.logout}`}
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        </>
      )}

      {/* 대표 캐릭터 설정 모달 */}
      <MainCharacterModal
        isOpen={showMainCharacterModal}
        onClose={() => setShowMainCharacterModal(false)}
        onSelect={handleSetMainCharacter}
      />
    </div>
  )
}
