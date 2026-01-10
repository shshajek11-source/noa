'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Clock, Coins, Gem, Sparkles, Sword } from 'lucide-react'

import styles from './LedgerPage.module.css'

type IncomeRecord = {
    id: string
    label: string
    amount: number
    timeAgo: string
}

type IncomeSection = {
    id: string
    title: string
    total: number
    icon: JSX.Element
    records: IncomeRecord[]
}

type CharacterSummary = {
    id: string
    name: string
    job: string
    income: number
}

type ItemSale = {
    id: string
    name: string
    price: number
    timeAgo: string
    icon: JSX.Element
}

const DAILY_TOTAL = 8450000
const WEEKLY_TOTAL = 56200000

const CHARACTERS: CharacterSummary[] = [
    { id: 'elyon', name: '엘리온', job: '수호성', income: 1500000 },
    { id: 'serin', name: '세린', job: '살성', income: 0 },
    { id: 'kairo', name: '카이로', job: '마도성', income: 970000 },
    { id: 'hena', name: '헤나', job: '치유성', income: 2200000 },
]

const INCOME_SECTIONS: IncomeSection[] = [
    {
        id: 'expedition',
        title: '원정대 수입',
        total: 1500000,
        icon: <Sparkles size={18} />,
        records: [
            { id: 'exp-1', label: '1회차', amount: 500000, timeAgo: '10분 전' },
            { id: 'exp-2', label: '2회차', amount: 350000, timeAgo: '32분 전' },
            { id: 'exp-3', label: '3회차', amount: 650000, timeAgo: '1시간 전' },
        ]
    },
    {
        id: 'transcend',
        title: '초월 콘텐츠',
        total: 920000,
        icon: <Sword size={18} />,
        records: [
            { id: 'tr-1', label: '균열 수호', amount: 420000, timeAgo: '25분 전' },
            { id: 'tr-2', label: '보스 보상', amount: 500000, timeAgo: '2시간 전' },
        ]
    },
    {
        id: 'etc',
        title: '기타 수입',
        total: 310000,
        icon: <Coins size={18} />,
        records: [
            { id: 'etc-1', label: '길드 정산', amount: 180000, timeAgo: '3시간 전' },
            { id: 'etc-2', label: '일일 미션', amount: 130000, timeAgo: '4시간 전' },
        ]
    },
]

const ITEM_SALES: ItemSale[] = [
    { id: 'item-1', name: '전설의 수정검', price: 1200000, timeAgo: '5분 전', icon: <Gem size={30} /> },
    { id: 'item-2', name: '폭풍의 목걸이', price: 840000, timeAgo: '12분 전', icon: <Gem size={30} /> },
    { id: 'item-3', name: '심연의 반지', price: 650000, timeAgo: '18분 전', icon: <Gem size={30} /> },
    { id: 'item-4', name: '수호자의 방패', price: 1100000, timeAgo: '26분 전', icon: <Gem size={30} /> },
    { id: 'item-5', name: '현자의 망토', price: 720000, timeAgo: '41분 전', icon: <Gem size={30} /> },
    { id: 'item-6', name: '루미엘의 귀걸이', price: 930000, timeAgo: '1시간 전', icon: <Gem size={30} /> },
    { id: 'item-7', name: '재앙의 단검', price: 1500000, timeAgo: '1시간 전', icon: <Gem size={30} /> },
    { id: 'item-8', name: '황혼의 투구', price: 560000, timeAgo: '2시간 전', icon: <Gem size={30} /> },
    { id: 'item-9', name: '태고의 장갑', price: 470000, timeAgo: '2시간 전', icon: <Gem size={30} /> },
    { id: 'item-10', name: '용언의 팔찌', price: 990000, timeAgo: '3시간 전', icon: <Gem size={30} /> },
]

const formatKina = (value: number) => value.toLocaleString('ko-KR')

const formatMan = (value: number) => `${Math.floor(value / 10000).toLocaleString('ko-KR')}만`

function SmartAmountInput({
    value,
    onChange,
    placeholder
}: {
    value: string
    onChange: (value: string) => void
    placeholder: string
}) {
    const hasValue = value.trim().length > 0

    return (
        <div className={styles.smartInput}>
            <input
                className={styles.smartInputField}
                value={value}
                onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
                aria-label={placeholder}
                inputMode="numeric"
            />
            <div className={styles.smartInputOverlay} aria-hidden="true">
                <span className={hasValue ? styles.smartInputValue : styles.smartInputPlaceholder}>
                    {hasValue ? value : placeholder}
                </span>
                <span className={styles.smartInputSuffix}>0000</span>
            </div>
        </div>
    )
}

export default function LedgerPage() {
    const [activeCharacterId, setActiveCharacterId] = useState(CHARACTERS[0].id)
    const [expandedSectionId, setExpandedSectionId] = useState(INCOME_SECTIONS[0].id)
    const [amountInputs, setAmountInputs] = useState<Record<string, string>>({
        expedition: '',
        transcend: '',
        etc: '',
    })
    const [displayedTotal, setDisplayedTotal] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const previousTotalRef = useRef(0)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 550)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const startValue = previousTotalRef.current
        const endValue = DAILY_TOTAL
        previousTotalRef.current = endValue
        const duration = 900
        const startTime = performance.now()
        let frameId = 0

        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            const currentValue = Math.floor(startValue + (endValue - startValue) * eased)
            setDisplayedTotal(currentValue)
            if (progress < 1) {
                frameId = requestAnimationFrame(animate)
            }
        }

        frameId = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(frameId)
    }, [])

    return (
        <div className={styles.page}>
            <div className={styles.pageInner}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <span className={styles.headerLabel}>일일 총 수입</span>
                        <div className={styles.headerTotal}>
                            <span className={styles.headerCurrency}>키나</span>
                            <span className={styles.headerValue}>{formatKina(displayedTotal)}</span>
                        </div>
                        <div className={styles.headerHint}>
                            오늘의 정산이 반영되었습니다
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.weeklyCard}>
                            <span className={styles.weeklyLabel}>주간 총 수입</span>
                            <span className={styles.weeklyValue}>{formatKina(WEEKLY_TOTAL)}</span>
                            <div className={styles.sparkline} />
                        </div>
                        <div className={styles.headerStatus}>
                            <Clock size={16} />
                            {isLoading ? '실시간 동기화 중...' : '동기화 완료'}
                        </div>
                    </div>
                </header>

                <div className={styles.contentGrid}>
                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarTitle}>내 캐릭터 수입</div>
                        <div className={styles.sidebarList}>
                            {CHARACTERS.map((character) => {
                                const isActive = activeCharacterId === character.id
                                return (
                                    <button
                                        key={character.id}
                                        className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}
                                        onClick={() => setActiveCharacterId(character.id)}
                                        type="button"
                                    >
                                        <div className={styles.avatar}>
                                            <span>{character.name.slice(0, 1)}</span>
                                        </div>
                                        <div className={styles.sidebarInfo}>
                                            <div className={styles.sidebarName}>{character.name}</div>
                                            <div className={styles.sidebarJob}>{character.job}</div>
                                        </div>
                                        <div className={character.income > 0 ? styles.sidebarIncome : styles.sidebarIncomeMuted}>
                                            +{formatMan(character.income)}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </aside>

                    <main className={styles.mainContent}>
                        <section className={styles.incomeSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h2>콘텐츠 수입</h2>
                                    <p>카테고리별로 오늘 수입을 바로 입력하세요.</p>
                                </div>
                                <div className={styles.sectionBadge}>
                                    <Sparkles size={16} />
                                    하이라이트
                                </div>
                            </div>

                            <div className={styles.incomeCards}>
                                {INCOME_SECTIONS.map((section) => {
                                    const isExpanded = expandedSectionId === section.id
                                    return (
                                        <div key={section.id} className={styles.incomeCard}>
                                            <div className={styles.incomeCardHeader}>
                                                <div className={styles.incomeSummary}>
                                                    <div className={styles.incomeIcon}>{section.icon}</div>
                                                    <div>
                                                        <div className={styles.incomeTitle}>{section.title}</div>
                                                        <div className={styles.incomeTotal}>키나 {formatKina(section.total)}</div>
                                                    </div>
                                                </div>
                                                <div className={styles.incomeInput}>
                                                    <SmartAmountInput
                                                        value={amountInputs[section.id]}
                                                        onChange={(value) => setAmountInputs(prev => ({ ...prev, [section.id]: value }))}
                                                        placeholder="+ 금액"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`${styles.expandButton} ${isExpanded ? styles.expandButtonActive : ''}`}
                                                    onClick={() => setExpandedSectionId(isExpanded ? '' : section.id)}
                                                    aria-label="수입 기록 펼치기"
                                                >
                                                    <ChevronDown size={18} />
                                                </button>
                                            </div>
                                            <div className={`${styles.incomeRecords} ${isExpanded ? styles.incomeRecordsOpen : ''}`}>
                                                <div className={styles.recordList}>
                                                    {section.records.map((record) => (
                                                        <div key={record.id} className={styles.recordRow}>
                                                            <div className={styles.recordLabel}>{record.label}</div>
                                                            <div className={styles.recordAmount}>+{formatMan(record.amount)}</div>
                                                            <div className={styles.recordTime}>{record.timeAgo}</div>
                                                            <button type="button" className={styles.recordDelete}>x</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        <section className={styles.salesSection}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <h2>아이템 판매</h2>
                                    <p>고정 크기 카드로 판매 내역을 빠르게 확인하세요.</p>
                                </div>
                                <div className={styles.sectionBadgeAlt}>
                                    <Gem size={16} />
                                    인벤토리 뷰
                                </div>
                            </div>

                            <div className={styles.salesGrid}>
                                {ITEM_SALES.map((item) => (
                                    <div key={item.id} className={styles.saleCard}>
                                        <div className={styles.saleIcon}>{item.icon}</div>
                                        <div className={styles.saleInfo}>
                                            <div className={styles.saleName}>{item.name}</div>
                                            <div className={styles.salePrice}>키나 {formatKina(item.price)}</div>
                                            <div className={styles.saleTime}>{item.timeAgo}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    )
}
