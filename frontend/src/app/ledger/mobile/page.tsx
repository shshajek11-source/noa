'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './MobileLedger.module.css';

// 모바일 전용 가계부 뷰 - 조건부 렌더링용 컴포넌트
export default function MobileLedgerPage() {
    const router = useRouter()
    const pathname = usePathname()

    // Google 인증 (부모에서 이미 체크되지만, 여기서도 사용자 정보 접근용)
    const { user, nickname, mainCharacter } = useAuth()

    // /ledger/mobile 경로로 직접 접근 시 /ledger로 리다이렉트
    useEffect(() => {
        if (pathname === '/ledger/mobile') {
            router.replace('/ledger')
        }
    }, [pathname, router])

    const [currentView, setCurrentView] = useState<'main' | 'detail'>('main');
    const [selectedCharacter, setSelectedCharacter] = useState({
        name: '포식자',
        server: '지켈',
        job: '검성'
    });
    const [selectedSubTab, setSelectedSubTab] = useState<'homework' | 'items' | 'stats'>('homework');

    const openCharacterDetail = (name: string, server: string, job: string) => {
        setSelectedCharacter({ name, server, job });
        setCurrentView('detail');
        setSelectedSubTab('homework');
        window.scrollTo(0, 0);
    };

    const closeCharacterDetail = () => {
        setCurrentView('main');
        window.scrollTo(0, 0);
    };

    return (
        <div className={styles.container}>
            {currentView === 'main' && (
                <div className={styles.viewMain}>
                    <div className={styles.statsHeader}>
                        <div className={styles.dateNav}>
                            <span className={styles.navArrow}>&lt;</span>
                            <div className={styles.dateDisplay}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>2024.01.19 (금)</span>
                            </div>
                            <span className={styles.navArrow}>&gt;</span>
                        </div>

                        {/* Income Stats Row */}
                        <div className={styles.incomeStatsRow}>
                            <div className={styles.incomeStat}>
                                <div className={styles.incomeLabel}>일일</div>
                                <div className={styles.incomeValue}>1,200만</div>
                            </div>
                            <div className={styles.incomeStat}>
                                <div className={styles.incomeLabel}>주간</div>
                                <div className={styles.incomeValuePrimary}>4,500만</div>
                            </div>
                            <div className={`${styles.incomeStat} ${styles.noBorder}`}>
                                <div className={styles.incomeLabel}>월별</div>
                                <div className={styles.incomeValue}>1.2억</div>
                            </div>
                        </div>
                    </div>


                    {/* Item Filter & List */}
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitle}>
                            아이템 현황 <span className={styles.collapseIcon}>▼</span>
                        </div>
                        <div className={styles.filterButtons}>
                            <button className={styles.filterActive}>미판매</button>
                            <button className={styles.filterInactive}>판매완료</button>
                        </div>
                    </div>

                    <div className={styles.summaryScroll}>
                        <div className={styles.itemCard}>
                            <div className={styles.itemImgBox}>
                                <div className={styles.itemBadge}>x5</div>
                            </div>
                            <div className={styles.itemName}>키나 꾸러미</div>
                        </div>
                        <div className={styles.itemCard}>
                            <div className={`${styles.itemImgBox} ${styles.itemLegendary}`}>
                                <div className={styles.itemBadge}>x1</div>
                            </div>
                            <div className={styles.itemName}>전설 무기</div>
                        </div>
                        <div className={styles.itemCard}>
                            <div className={styles.itemImgBox}>
                                <div className={styles.itemBadge}>x12</div>
                            </div>
                            <div className={styles.itemName}>강화석</div>
                        </div>
                        <div className={styles.itemCard}>
                            <div className={styles.itemImgBox}>
                                <div className={styles.itemBadge}>x2</div>
                            </div>
                            <div className={styles.itemName}>마석</div>
                        </div>
                        <div className={styles.itemCard}>
                            <div className={styles.itemImgBox}>
                                <div className={styles.itemBadge}>x1</div>
                            </div>
                            <div className={styles.itemName}>스티그마</div>
                        </div>
                    </div>

                    {/* Story Style Character List */}
                    <div className={styles.storyContainer}>
                        <div className={styles.storyItem} onClick={() => openCharacterDetail('포식자', '지켈', '검성')}>
                            <div className={styles.storyAvatarWrapper}>
                                <div className={styles.storyAvatar}></div>
                            </div>
                            <div className={styles.storyName}>포식자</div>
                            <div className={styles.storyJob}>검성</div>
                        </div>
                        <div className={styles.storyItem} onClick={() => openCharacterDetail('이스', '이스', '살성')}>
                            <div className={`${styles.storyAvatarWrapper} ${styles.storyAvatarInactive}`}>
                                <div className={styles.storyAvatar}></div>
                            </div>
                            <div className={styles.storyName}>이스</div>
                            <div className={styles.storyJob}>살성</div>
                        </div>
                        <div className={styles.storyItem}>
                            <div className={`${styles.storyAvatarWrapper} ${styles.storyAvatarInactive}`}>
                                <div className={styles.storyAvatar}></div>
                            </div>
                            <div className={styles.storyName}>부캐1</div>
                            <div className={styles.storyJob}>치유성</div>
                        </div>
                        <div className={styles.storyItem}>
                            <div className={`${styles.storyAvatarWrapper} ${styles.storyAvatarInactive}`}>
                                <div className={styles.storyAvatar}></div>
                            </div>
                            <div className={styles.storyName}>부캐2</div>
                            <div className={styles.storyJob}>마도성</div>
                        </div>
                        <div className={styles.storyItem}>
                            <div className={`${styles.storyAvatarWrapper} ${styles.storyAvatarInactive}`}>
                                <div className={styles.storyAvatar}></div>
                            </div>
                            <div className={styles.storyName}>부캐3</div>
                            <div className={styles.storyJob}>정령성</div>
                        </div>
                    </div>

                    <div className={styles.divider}></div>

                    {/* Character Cards */}
                    <div className={styles.charCard} onClick={() => openCharacterDetail('포식자', '지켈', '검성')}>
                        <div className={styles.charHeader}>
                            <div className={styles.profileImg}></div>
                            <div className={styles.charInfo}>
                                <div className={styles.charName}>[지켈] 포식자</div>
                                <div className={styles.charLv}>Lv.58 / 검성</div>
                            </div>
                            <div className={styles.charIncomeArea}>
                                <div className={styles.incomeArrow}>▲</div>
                                <div className={styles.charIncome}>1,200만</div>
                            </div>
                        </div>

                        <div className={styles.progressLabel}>진행 현황</div>

                        <div className={styles.chipContainer}>
                            <div className={`${styles.statusChip} ${styles.chipRed}`}>
                                <span className={`${styles.chipDot} ${styles.dotRed}`}>●</span>
                                <span className={styles.chipTxt}>성역</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>1/4
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipPurple}`}>
                                <span className={`${styles.chipDot} ${styles.dotPurple}`}>●</span>
                                <span className={styles.chipTxt}>초월</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>2/2
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipBlue}`}>
                                <span className={`${styles.chipDot} ${styles.dotBlue}`}>●</span>
                                <span className={styles.chipTxt}>원정</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>0/2
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipOrange}`}>
                                <span className={styles.chipTxt}>파에</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>2/7
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipOrange}`}>
                                <span className={styles.chipTxt}>아라</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>1/7
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipOrange}`}>
                                <span className={styles.chipTxt}>우다</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>0/7
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipOrange}`}>
                                <span className={styles.chipTxt}>악몽</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>1/1
                                </span>
                            </div>
                            <div className={`${styles.statusChip} ${styles.chipOrange}`}>
                                <span className={styles.chipTxt}>심연</span>
                                <span className={styles.chipVal}>
                                    <span className={styles.chipTimer}>00:00:00</span>
                                    <span className={styles.chipRemaining}>잔여량</span>0/2
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Char 2 - Collapsed */}
                    <div className={`${styles.charCard} ${styles.charCardCollapsed}`} onClick={() => openCharacterDetail('이스', '이스', '살성')}>
                        <div className={styles.charHeader}>
                            <div className={`${styles.profileImg} ${styles.profileInactive}`}></div>
                            <div className={styles.charInfo}>
                                <div className={styles.charName}>[이스] 살성</div>
                                <div className={styles.charLv}>Lv.50</div>
                            </div>
                            <div className={styles.incomeArrow}>▼</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 캐릭터 상세 뷰 */}
            {currentView === 'detail' && (
                <div className={styles.viewDetail}>
                    {/* Detail Header */}
                    <div className={styles.detailHeaderContainer}>
                        <div className={styles.backBtn} onClick={closeCharacterDetail}>&lt;</div>
                        <div className={styles.detailMainHeader}>
                            <div className={styles.profileArea}>
                                <div className={styles.profileImgLarge}></div>
                                <div className={styles.settingsIcon}>⚙️</div>
                            </div>
                            <div className={styles.charInfoArea}>
                                <div className={styles.detailCharName}>{selectedCharacter.name}</div>
                                <div className={styles.detailCharInfo}>{selectedCharacter.server} | {selectedCharacter.job}</div>
                            </div>
                            <div className={styles.incomeStatsArea}>
                                <div className={styles.incomeStatDetail}>
                                    <span className={styles.label}>일일수입</span>
                                    <span className={styles.value}>4,500만</span>
                                </div>
                                <div className={styles.incomeStatDetail}>
                                    <span className={styles.label}>템판매수입</span>
                                    <span className={styles.value}>1.2억</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sub Tab Navigation */}
                    <div className={styles.charSubTabs}>
                        <div
                            className={`${styles.charSubTab} ${selectedSubTab === 'homework' ? styles.active : ''}`}
                            onClick={() => setSelectedSubTab('homework')}
                        >
                            컨텐츠
                        </div>
                        <div
                            className={`${styles.charSubTab} ${selectedSubTab === 'items' ? styles.active : ''}`}
                            onClick={() => setSelectedSubTab('items')}
                        >
                            아이템
                        </div>
                        <div
                            className={`${styles.charSubTab} ${selectedSubTab === 'stats' ? styles.active : ''}`}
                            onClick={() => setSelectedSubTab('stats')}
                        >
                            통계
                        </div>
                    </div>

                    {/* Sub View: Homework */}
                    {selectedSubTab === 'homework' && (
                        <div className={styles.charSubview}>
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>일일 컨텐츠</span>
                                <span className={styles.contentRemaining}>잔여: 4건</span>
                            </div>

                            {/* Mission Cards */}
                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>사명</span>
                                        <span className={styles.wmTimer}>08:44:40</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <button className={styles.btnCompleteAll}>전체 완료 하기</button>
                                        <span className={styles.wmCount}>0/5</span>
                                        <button className={styles.btnStep}>+</button>
                                        <button className={styles.btnStep}>-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                </div>
                            </div>

                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>주간 지령서</span>
                                        <span className={styles.wmTimer}>1일 08:44:40</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <button className={styles.btnCompleteAll}>전체 완료 하기</button>
                                        <span className={styles.wmCount}>2/12</span>
                                        <button className={styles.btnStep}>+</button>
                                        <button className={styles.btnStep}>-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    <div className={`${styles.wmBlock} ${styles.filled}`}></div>
                                    <div className={`${styles.wmBlock} ${styles.filled}`}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                    <div className={styles.wmBlock}></div>
                                </div>
                            </div>

                            {/* Abyss Weekly Order Card */}
                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>어비스 주간 지령서</span>
                                        <span className={styles.wmTimer}>1일 08:44:40</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <button className={styles.btnCompleteAll}>전체 완료 하기</button>
                                        <span className={styles.wmCount}>0/20</span>
                                        <button className={styles.btnStep}>+</button>
                                        <button className={styles.btnStep}>-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(10)].map((_, i) => (
                                        <div key={i} className={styles.wmBlock}></div>
                                    ))}
                                </div>
                            </div>

                            {/* Shugo & Abyss Grid */}
                            <div className={styles.dualCardGrid}>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardTimer}>02:59:00</div>
                                    <div className={styles.miniCardLabel}>슈고 페스타</div>
                                    <div className={styles.miniCardValue}>
                                        14 <span className={styles.miniCardMax}>/ 14</span>
                                        <span className={styles.miniCardBonus}>(+1)</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button className={styles.btnStepMini}>-</button>
                                        <button className={styles.btnStepMini}>+</button>
                                    </div>
                                </div>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardTimer}>00:00:00</div>
                                    <div className={styles.miniCardLabel}>어비스 회랑</div>
                                    <div className={styles.miniCardValue}>
                                        3 <span className={styles.miniCardMax}>/ 3</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button className={styles.btnStepMini}>-</button>
                                        <button className={styles.btnStepMini}>+</button>
                                    </div>
                                </div>
                            </div>

                            {/* Od Energy Status */}
                            <div className={styles.odEnergyBox}>
                                <span className={styles.odValue}>840</span>
                                <span className={styles.odLabel}>
                                    주기충전: <span className={styles.odTimer}>1:59:08</span>
                                </span>
                            </div>

                            {/* Weekly Content Header */}
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>주간 컨텐츠</span>
                                <span className={styles.contentRemaining}>잔여: 3건</span>
                            </div>

                            {/* Complex Cards */}
                            <div className={styles.complexCard}>
                                <div className={styles.cardHead}>
                                    <span className={styles.cardTitle}>초월</span>
                                    <div className={styles.cardHeadRight}>
                                        <span className={styles.cardCount}>0/14회 <span className={styles.bonusCount}>(+1)</span></span>
                                        <span className={styles.collapseIcon}>▼</span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.controlsWrapper}>
                                        <div className={styles.settingsGrid}>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>보스</div>
                                                <div className={styles.settingValue}>데우스의 연구기지 ▼</div>
                                            </div>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>단계</div>
                                                <div className={styles.settingValue}>5단계 ▼</div>
                                            </div>
                                        </div>
                                        <div className={styles.actionRow}>
                                            <div className={styles.btn2x}>
                                                오드에너지 2배사용
                                            </div>
                                            <button className={styles.btnRecord}>진행완료</button>
                                        </div>
                                    </div>
                                    <div className={styles.logList}>
                                        <div className={styles.logItem}>
                                            <div className={styles.logLeft}>
                                                <span>데우스</span>
                                                <span className={styles.logBadge}>5단계</span>
                                            </div>
                                            <div className={styles.logRight}>
                                                <span className={styles.logCount}>1회</span>
                                                <span className={styles.logValue}>1,000,000</span>
                                                <button className={styles.btnLogDelete}>×</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expedition Card */}
                            <div className={styles.complexCard}>
                                <div className={styles.cardHead}>
                                    <span className={styles.cardTitle}>원정</span>
                                    <div className={styles.cardHeadRight}>
                                        <span className={styles.cardCount}>0/21회 <span className={styles.bonusCount}>(+1)</span></span>
                                        <span className={styles.collapseIcon}>▼</span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.controlsWrapper}>
                                        <div className={`${styles.settingsGrid} ${styles.settingsGrid3}`}>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>보스</div>
                                                <div className={styles.settingValue}>크라오 동굴 ▼</div>
                                            </div>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>구분</div>
                                                <div className={styles.settingValue}>탐험/정복 ▼</div>
                                            </div>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>단계</div>
                                                <div className={styles.settingValue}>1단계 ▼</div>
                                            </div>
                                        </div>
                                        <div className={styles.actionRow}>
                                            <div className={`${styles.btn2x} ${styles.active}`}>
                                                오드에너지 2배사용
                                            </div>
                                            <button className={styles.btnRecord}>진행완료</button>
                                        </div>
                                    </div>
                                    <div className={styles.logList}>
                                        <div className={styles.logItem}>
                                            <div className={styles.logLeft}>
                                                <span>크라오</span>
                                                <span className={styles.logBadge}>1단계</span>
                                            </div>
                                            <div className={styles.logRight}>
                                                <span className={styles.logCount}>1회</span>
                                                <span className={styles.logValue}>1,500,000</span>
                                                <button className={styles.btnLogDelete}>×</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sanctuary Card */}
                            <div className={styles.complexCard}>
                                <div className={styles.cardHead}>
                                    <span className={styles.cardTitle}>성역</span>
                                    <div className={styles.cardHeadRight}>
                                        <span className={styles.cardCountSub}>0/4회 <span className={styles.bonusCount}>(+1)</span></span>
                                        <span className={styles.collapseIcon}>▼</span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.controlsWrapper}>
                                        <div className={styles.settingsGrid}>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>보스</div>
                                                <div className={styles.settingValue}>심연의 재련 : 루드라 ▼</div>
                                            </div>
                                            <div className={styles.settingItem}>
                                                <div className={styles.settingLabel}>단계</div>
                                                <div className={styles.settingValue}>1단계 ▼</div>
                                            </div>
                                        </div>
                                        <div className={styles.actionRow}>
                                            <div className={styles.btn2x}>
                                                오드에너지 2배사용
                                            </div>
                                            <button className={styles.btnRecord}>진행완료</button>
                                        </div>
                                    </div>
                                    <div className={styles.logList}>
                                        <div className={styles.logItem}>
                                            <div className={styles.logLeft}>
                                                <span>루드라</span>
                                                <span className={styles.logBadge}>1단계</span>
                                            </div>
                                            <div className={styles.logRight}>
                                                <span className={styles.logCount}>1회</span>
                                                <span className={styles.logValue}>10,000,000</span>
                                                <button className={styles.btnLogDelete}>×</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Simple Cards */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>일일던전 (3/3)</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardTimer}>00:00:00</span>
                                    <span className={styles.simpleCardDivider}>|</span>
                                    <span className={styles.simpleCardCount}>3/3</span>
                                </div>
                            </div>

                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>각성전 (1/1)</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardTimer}>00:00:00</span>
                                    <span className={styles.simpleCardDivider}>|</span>
                                    <span className={styles.simpleCardCount}>1/1</span>
                                </div>
                            </div>

                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>악몽 (1/1)</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardTimer}>00:00:00</span>
                                    <span className={styles.simpleCardDivider}>|</span>
                                    <span className={styles.simpleCardCount}>1/1</span>
                                </div>
                            </div>

                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>차원침공 (1/1)</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardTimer}>00:00:00</span>
                                    <span className={styles.simpleCardDivider}>|</span>
                                    <span className={styles.simpleCardCount}>1/1</span>
                                </div>
                            </div>

                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>토벌전 (1/1)</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardTimer}>00:00:00</span>
                                    <span className={styles.simpleCardDivider}>|</span>
                                    <span className={styles.simpleCardCount}>1/1</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sub View: Items */}
                    {selectedSubTab === 'items' && (
                        <div className={styles.charSubview}>
                            <div className={styles.itemSummaryBox}>
                                <div className={styles.itemSummaryStat}>
                                    <div className={styles.itemSummaryLabel}>아이템 판매</div>
                                    <div className={styles.itemSummaryValue}>520만</div>
                                </div>
                                <div className={`${styles.itemSummaryStat} ${styles.noBorder}`}>
                                    <div className={styles.itemSummaryLabel}>판매 완료</div>
                                    <div className={styles.itemSummaryValueWhite}>12건</div>
                                </div>
                            </div>

                            <div className={styles.favoritesSection}>
                                <div className={styles.favoritesTitle}>★ 이 캐릭터의 즐겨찾기</div>
                                <div className={styles.summaryScroll}>
                                    <div className={styles.itemCard}>
                                        <div className={`${styles.itemImgBox} ${styles.itemFavorite}`}>
                                            <div className={`${styles.favoriteStar} ${styles.active}`}>★</div>
                                            <div className={styles.itemBadge}>x5</div>
                                        </div>
                                        <div className={styles.itemName}>키나 꾸러미</div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.divider}></div>

                            <div className={styles.itemSearchSection}>
                                <div className={styles.searchInputWrapper}>
                                    <span className={styles.searchIcon}>🔍</span>
                                    <input type="text" placeholder="아이템 검색..." className={styles.searchInput} />
                                </div>
                                <div className={styles.itemFilterButtons}>
                                    <button className={styles.filterActive}>전체</button>
                                    <button className={styles.filterInactive}>판매중</button>
                                    <button className={styles.filterInactive}>판매완료</button>
                                </div>
                            </div>

                            <div className={styles.summaryScroll}>
                                <div className={styles.itemCard}>
                                    <div className={styles.itemImgBox}>
                                        <div className={styles.favoriteStar}>★</div>
                                        <div className={styles.itemBadge}>x1</div>
                                    </div>
                                    <div className={styles.itemName}>전설 무기</div>
                                </div>
                                <div className={styles.itemCard}>
                                    <div className={styles.itemImgBox}>
                                        <div className={styles.favoriteStar}>★</div>
                                        <div className={styles.itemBadge}>x2</div>
                                    </div>
                                    <div className={styles.itemName}>마석</div>
                                </div>
                            </div>

                            <div className={styles.salesLogSection}>
                                <div className={styles.salesLogTitle}>최근 판매 내역</div>
                                <div className={styles.logList}>
                                    <div className={styles.logItem}>
                                        <div className={styles.logLeft}>
                                            <span className={`${styles.logBadge} ${styles.logBadgeSale}`}>판매</span>
                                            <div className={styles.logItemInfo}>
                                                <span className={styles.logItemName}>강화석 x10</span>
                                                <span className={styles.logTime}>14:20:12</span>
                                            </div>
                                        </div>
                                        <div className={styles.logValue}>+ 5,000,000</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sub View: Stats */}
                    {selectedSubTab === 'stats' && (
                        <div className={styles.charSubview}>
                            <div className={styles.statsPlaceholder}>
                                통계 고도화 준비 중입니다.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
