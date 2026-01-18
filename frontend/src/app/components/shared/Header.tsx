'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LoginButton from '@/components/LoginButton'
import CharacterUpdateButton from '@/components/CharacterUpdateButton'
import MainCharacterBadge from '../MainCharacterBadge'
import styles from './Header.module.css'

export default function Header() {
    const pathname = usePathname()

    const navItems = [
        { name: '홈', path: '/' },
        { name: '랭킹', path: '/ranking' },
        { name: '아이템', path: '/item' },
        { name: '스탯 추출기', path: '/tools/stat-capture' },
        { name: '숙제&가계부', path: '/ledger' }
    ]

    return (
        <header className={styles.headerAdaptive}>
            <div className={styles.headerInner}>
                <Link href="/" className={styles.logoLink}>
                    <span className={styles.logoText}>
                        <span className={styles.logoSugo}>SUGO</span>
                        <span className={styles.logoGg}>.gg</span>
                    </span>
                </Link>

                <nav className={styles.nav}>
                    {navItems.map(item => {
                        const isActive = item.path === '/'
                            ? pathname === '/'
                            : pathname?.startsWith(item.path)

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                            >
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right Actions */}
                <div className={styles.actions}>
                    <CharacterUpdateButton />
                    <LoginButton />
                    <MainCharacterBadge />
                </div>
            </div>
        </header>
    )
}
