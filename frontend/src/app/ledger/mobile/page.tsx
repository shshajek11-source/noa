'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    useDeviceId,
    useLedgerCharacters,
    useContentRecords,
    useLedgerItems,
    useWeeklyStats
} from '../hooks';
import { getGameDate, isEditable } from '../utils/dateUtils';
import { LedgerCharacter } from '@/types/ledger';
import styles from './MobileLedger.module.css';

// 던전 데이터 타입 정의
interface Boss {
    id: string;
    name: string;
    imageUrl: string;
    kina?: number;
    tiers?: Tier[];
}

interface Tier {
    tier: number;
    kina: number;
}

interface Category {
    id: string;
    name: string;
    bosses: Boss[];
}

interface DungeonData {
    transcend: {
        maxTickets: number;
        bosses: Boss[];
    };
    expedition: {
        maxTickets: number;
        categories: Category[];
    };
    sanctuary: {
        maxTickets: number;
        categories: Category[];
    };
}

interface DungeonRecord {
    id: string;
    bossName: string;
    tier?: number;
    category?: string;
    count: number;
    kina: number;
    usedFromBonus?: number;
}

// 모바일 전용 가계부 뷰 - 조건부 렌더링용 컴포넌트
export default function MobileLedgerPage() {
    const router = useRouter()
    const pathname = usePathname()

    // Google 인증
    const { isLoading: isGoogleLoading } = useAuth()

    // Device ID 인증
    const { getAuthHeader, isLoading: isAuthLoading, isAuthenticated, deviceId } = useDeviceId()
    const isReady = !isAuthLoading && (isAuthenticated || !!deviceId)

    // 캐릭터 관리
    const {
        characters,
        isLoading: isCharactersLoading,
        addCharacter,
        removeCharacter,
        refetch: refetchCharacters,
        error: characterError
    } = useLedgerCharacters({ getAuthHeader, isReady })

    // /ledger/mobile 경로로 직접 접근 시 /ledger로 리다이렉트
    useEffect(() => {
        if (pathname === '/ledger/mobile') {
            router.replace('/ledger')
        }
    }, [pathname, router])

    // 상태
    const [currentView, setCurrentView] = useState<'main' | 'detail'>('main');
    const [selectedCharacter, setSelectedCharacter] = useState<LedgerCharacter | null>(null);
    const [selectedSubTab, setSelectedSubTab] = useState<'homework' | 'items' | 'stats'>('homework');
    const [selectedDate, setSelectedDate] = useState<string>(getGameDate(new Date()));

    // 캐릭터 추가 모달 상태
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedServer, setSelectedServer] = useState<string>('전체');
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);

    // 캐릭터 삭제 확인 모달 상태
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [characterToDelete, setCharacterToDelete] = useState<LedgerCharacter | null>(null);
    const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);

    // 던전 데이터 상태
    const [dungeonData, setDungeonData] = useState<DungeonData | null>(null);
    const [showDungeonModal, setShowDungeonModal] = useState<'transcend' | 'expedition' | 'sanctuary' | null>(null);

    // 던전 선택 상태
    const [transcendBoss, setTranscendBoss] = useState('');
    const [transcendTier, setTranscendTier] = useState(1);
    const [expeditionCategory, setExpeditionCategory] = useState('');
    const [expeditionBoss, setExpeditionBoss] = useState('');
    const [sanctuaryBoss, setSanctuaryBoss] = useState('');

    // 던전 기록 상태
    const [transcendRecords, setTranscendRecords] = useState<DungeonRecord[]>([]);
    const [expeditionRecords, setExpeditionRecords] = useState<DungeonRecord[]>([]);
    const [sanctuaryRecords, setSanctuaryRecords] = useState<DungeonRecord[]>([]);

    // 2배 보상 상태
    const [transcendDouble, setTranscendDouble] = useState(false);
    const [expeditionDouble, setExpeditionDouble] = useState(false);
    const [sanctuaryDouble, setSanctuaryDouble] = useState(false);

    // 로딩 상태
    const isLoadingRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 서버 목록
    const servers = ['전체', '지펠', '이스라펠', '아트레이아'];

    // 수정 가능 여부
    const canEdit = isEditable(selectedDate);

    // 날짜 표시 포맷
    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
        const weekday = weekdays[date.getDay()];
        return `${year}.${month}.${day} (${weekday})`;
    };

    // 날짜 이동
    const changeDate = (direction: 'prev' | 'next') => {
        const current = new Date(selectedDate + 'T00:00:00');
        if (direction === 'prev') {
            current.setDate(current.getDate() - 1);
        } else {
            current.setDate(current.getDate() + 1);
        }
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
    };

    // 선택된 캐릭터 ID
    const selectedCharacterId = selectedCharacter?.id || characters[0]?.id || null;

    // 캐릭터 상태 (티켓, 오드 에너지)
    const [characterState, setCharacterState] = useState<{
        baseTickets: Record<string, number>;
        bonusTickets: Record<string, number>;
        odEnergy: { timeEnergy: number; ticketEnergy: number };
    }>({
        baseTickets: {
            transcend: 14, expedition: 21, sanctuary: 4,
            daily_dungeon: 7, awakening: 3, nightmare: 14, dimension: 14, subjugation: 3
        },
        bonusTickets: {
            transcend: 0, expedition: 0, sanctuary: 0,
            daily_dungeon: 0, awakening: 0, nightmare: 0, dimension: 0, subjugation: 0
        },
        odEnergy: { timeEnergy: 840, ticketEnergy: 0 }
    });

    // 캐릭터 상태 로드
    useEffect(() => {
        if (!selectedCharacterId || !isReady) return;

        const loadCharacterState = async () => {
            try {
                const authHeaders = getAuthHeader();
                const res = await fetch(
                    `/api/ledger/character-state?characterId=${selectedCharacterId}`,
                    { headers: authHeaders }
                );

                if (res.ok) {
                    const data = await res.json();
                    setCharacterState({
                        baseTickets: data.baseTickets || characterState.baseTickets,
                        bonusTickets: data.bonusTickets || characterState.bonusTickets,
                        odEnergy: {
                            timeEnergy: data.odEnergy?.timeEnergy || 840,
                            ticketEnergy: data.odEnergy?.ticketEnergy || 0
                        }
                    });
                }
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load character state:', error);
            }
        };

        loadCharacterState();
    }, [selectedCharacterId, isReady, getAuthHeader]);

    // 컨텐츠 기록
    const {
        records,
        incrementCompletion,
        decrementCompletion
    } = useContentRecords({
        characterId: selectedCharacterId,
        date: selectedDate,
        getAuthHeader,
        isReady
    });

    // 아이템 관리
    const {
        unsoldItems,
        soldItems
    } = useLedgerItems({
        characterId: selectedCharacterId,
        getAuthHeader,
        isReady,
        selectedDate
    });

    // 주간 통계
    const { stats } = useWeeklyStats({
        characterId: selectedCharacterId,
        date: selectedDate
    });

    // 던전 데이터 로드
    useEffect(() => {
        const fetchDungeonData = async () => {
            try {
                const res = await fetch('/api/ledger/dungeon-data');
                const data = await res.json();
                setDungeonData(data);

                // 기본값 설정
                if (data.transcend.bosses.length > 0 && !transcendBoss) {
                    setTranscendBoss(data.transcend.bosses[0].id);
                }
                if (data.expedition.categories.length > 0 && !expeditionCategory) {
                    setExpeditionCategory(data.expedition.categories[0].id);
                    if (data.expedition.categories[0].bosses.length > 0 && !expeditionBoss) {
                        setExpeditionBoss(data.expedition.categories[0].bosses[0].id);
                    }
                }
                if (data.sanctuary.categories.length > 0 && data.sanctuary.categories[0].bosses.length > 0 && !sanctuaryBoss) {
                    setSanctuaryBoss(data.sanctuary.categories[0].bosses[0].id);
                }
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load dungeon data:', error);
            }
        };

        fetchDungeonData();
    }, []);

    // DB에서 던전 기록 로드
    const loadDungeonRecords = useCallback(async () => {
        if (!selectedCharacterId || !isReady) return;

        isLoadingRef.current = true;
        try {
            const res = await fetch(
                `/api/ledger/dungeon-records?characterId=${selectedCharacterId}&date=${selectedDate}`,
                { headers: getAuthHeader() }
            );

            if (res.ok) {
                const data = await res.json();
                if (data?.records) {
                    if (data.records.transcend) setTranscendRecords(data.records.transcend);
                    if (data.records.expedition) setExpeditionRecords(data.records.expedition);
                    if (data.records.sanctuary) setSanctuaryRecords(data.records.sanctuary);
                    if (data.records.transcendDouble !== undefined) setTranscendDouble(data.records.transcendDouble);
                    if (data.records.expeditionDouble !== undefined) setExpeditionDouble(data.records.expeditionDouble);
                    if (data.records.sanctuaryDouble !== undefined) setSanctuaryDouble(data.records.sanctuaryDouble);
                }
                if (data?.selections) {
                    if (data.selections.transcendBoss) setTranscendBoss(data.selections.transcendBoss);
                    if (data.selections.transcendTier) setTranscendTier(data.selections.transcendTier);
                    if (data.selections.expeditionCategory) setExpeditionCategory(data.selections.expeditionCategory);
                    if (data.selections.expeditionBoss) setExpeditionBoss(data.selections.expeditionBoss);
                    if (data.selections.sanctuaryBoss) setSanctuaryBoss(data.selections.sanctuaryBoss);
                }
            }
        } catch (error) {
            console.error('[Mobile Ledger] Failed to load dungeon records:', error);
        } finally {
            setTimeout(() => {
                isLoadingRef.current = false;
            }, 100);
        }
    }, [selectedCharacterId, selectedDate, isReady, getAuthHeader]);

    // 던전 기록 로드 (캐릭터/날짜 변경 시)
    useEffect(() => {
        if (!selectedCharacterId) {
            setTranscendRecords([]);
            setExpeditionRecords([]);
            setSanctuaryRecords([]);
            setTranscendDouble(false);
            setExpeditionDouble(false);
            setSanctuaryDouble(false);
            return;
        }

        loadDungeonRecords();
    }, [selectedCharacterId, selectedDate, loadDungeonRecords]);

    // DB에 던전 기록 저장
    const saveDungeonRecords = useCallback(async () => {
        if (!selectedCharacterId || !canEdit || isLoadingRef.current) return;

        try {
            await fetch('/api/ledger/dungeon-records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({
                    characterId: selectedCharacterId,
                    date: selectedDate,
                    transcendRecords,
                    expeditionRecords,
                    sanctuaryRecords,
                    transcendDouble,
                    expeditionDouble,
                    sanctuaryDouble
                })
            });
        } catch (error) {
            console.error('[Mobile Ledger] Failed to save dungeon records:', error);
        }
    }, [selectedCharacterId, selectedDate, canEdit, getAuthHeader, transcendRecords, expeditionRecords, sanctuaryRecords, transcendDouble, expeditionDouble, sanctuaryDouble]);

    // 디바운스된 저장
    const debouncedSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveDungeonRecords();
        }, 100);
    }, [saveDungeonRecords]);

    // 기록 변경 시 저장
    useEffect(() => {
        if (!selectedCharacterId || isLoadingRef.current || !canEdit) return;
        debouncedSave();
    }, [transcendRecords, expeditionRecords, sanctuaryRecords, transcendDouble, expeditionDouble, sanctuaryDouble, debouncedSave, selectedCharacterId, canEdit]);

    // 컴포넌트 언마운트 시 타임아웃 정리
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // 초월 기록 추가
    const handleAddTranscendRecord = () => {
        if (!dungeonData || !canEdit) return;

        const boss = dungeonData.transcend.bosses.find(b => b.id === transcendBoss);
        if (!boss) return;

        const tierData = boss.tiers?.find(t => t.tier === transcendTier);
        const kina = tierData?.kina || 0;
        const multiplier = transcendDouble ? 2 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            tier: transcendTier,
            count: 1,
            kina: kina * multiplier
        };

        setTranscendRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName && r.tier === newRecord.tier);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        setShowDungeonModal(null);
    };

    // 초월 기록 삭제
    const handleDeleteTranscendRecord = (recordId: string) => {
        if (!canEdit) return;
        setTranscendRecords(prev => prev.filter(r => r.id !== recordId));
    };

    // 원정 기록 추가
    const handleAddExpeditionRecord = () => {
        if (!dungeonData || !canEdit) return;

        const category = dungeonData.expedition.categories.find(c => c.id === expeditionCategory);
        const boss = category?.bosses.find(b => b.id === expeditionBoss);
        if (!boss) return;

        const multiplier = expeditionDouble ? 2 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            category: category?.name,
            count: 1,
            kina: (boss.kina || 0) * multiplier
        };

        setExpeditionRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName && r.category === newRecord.category);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        setShowDungeonModal(null);
    };

    // 원정 기록 삭제
    const handleDeleteExpeditionRecord = (recordId: string) => {
        if (!canEdit) return;
        setExpeditionRecords(prev => prev.filter(r => r.id !== recordId));
    };

    // 성역 기록 추가
    const handleAddSanctuaryRecord = () => {
        if (!dungeonData || !canEdit) return;

        const category = dungeonData.sanctuary.categories[0];
        const boss = category?.bosses.find(b => b.id === sanctuaryBoss);
        if (!boss) return;

        const multiplier = sanctuaryDouble ? 2 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            count: 1,
            kina: (boss.kina || 0) * multiplier
        };

        setSanctuaryRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        setShowDungeonModal(null);
    };

    // 성역 기록 삭제
    const handleDeleteSanctuaryRecord = (recordId: string) => {
        if (!canEdit) return;
        setSanctuaryRecords(prev => prev.filter(r => r.id !== recordId));
    };

    // 원정 카테고리 변경 시 보스 초기화
    const handleExpeditionCategoryChange = (categoryId: string) => {
        setExpeditionCategory(categoryId);
        const category = dungeonData?.expedition.categories.find(c => c.id === categoryId);
        if (category && category.bosses.length > 0) {
            setExpeditionBoss(category.bosses[0].id);
        }
    };

    // 현재 선택된 원정 카테고리의 보스 목록
    const currentExpeditionBosses = dungeonData?.expedition.categories.find(
        c => c.id === expeditionCategory
    )?.bosses || [];

    // 캐릭터 상세 뷰 열기
    const openCharacterDetail = (character: LedgerCharacter) => {
        setSelectedCharacter(character);
        setCurrentView('detail');
        setSelectedSubTab('homework');
        window.scrollTo(0, 0);
    };

    // 캐릭터 상세 뷰 닫기
    const closeCharacterDetail = () => {
        setSelectedCharacter(null);
        setCurrentView('main');
        window.scrollTo(0, 0);
    };

    // 금액 포맷
    const formatMoney = (amount: number): string => {
        if (amount >= 100000000) {
            return `${(amount / 100000000).toFixed(1)}억`;
        } else if (amount >= 10000) {
            return `${Math.floor(amount / 10000)}만`;
        }
        return amount.toLocaleString();
    };

    // 캐릭터 검색
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const serverParam = selectedServer !== '전체' ? `&server=${encodeURIComponent(selectedServer)}` : '';
            const res = await fetch(`/api/search/live?keyword=${encodeURIComponent(searchQuery)}${serverParam}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.results || []);
            }
        } catch (error) {
            console.error('캐릭터 검색 실패:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 캐릭터 추가
    const handleAddCharacter = async (character: any) => {
        setIsAddingCharacter(true);
        try {
            const result = await addCharacter({
                name: character.name,
                server_name: character.serverName || character.server_name,
                class_name: character.className || character.class_name,
                profile_image: character.profileImageUrl || character.profile_image,
                item_level: character.itemLevel || character.item_level
            });

            if (result) {
                setShowAddModal(false);
                setSearchQuery('');
                setSearchResults([]);
                refetchCharacters();
            }
        } catch (error) {
            console.error('캐릭터 추가 실패:', error);
        } finally {
            setIsAddingCharacter(false);
        }
    };

    // 캐릭터 삭제 확인
    const handleDeleteConfirm = async () => {
        if (!characterToDelete) return;

        setIsDeletingCharacter(true);
        try {
            const success = await removeCharacter(characterToDelete.id);
            if (success) {
                setShowDeleteModal(false);
                setCharacterToDelete(null);
                if (selectedCharacter?.id === characterToDelete.id) {
                    closeCharacterDetail();
                }
            }
        } catch (error) {
            console.error('캐릭터 삭제 실패:', error);
        } finally {
            setIsDeletingCharacter(false);
        }
    };

    // 일일/주간 수입 계산
    const calculateIncome = () => {
        const dailyIncome = characters.reduce((sum, c) => sum + (c.todayIncome || 0), 0);
        const weeklyIncome = stats?.totalIncome || 0;
        return { dailyIncome, weeklyIncome };
    };

    const { dailyIncome, weeklyIncome } = calculateIncome();

    // 로딩 상태
    if (isAuthLoading || isCharactersLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <div className={styles.loadingText}>가계부를 불러오는 중...</div>
                </div>
            </div>
        );
    }

    // 캐릭터 없음 안내
    const renderNoCharacters = () => (
        <div className={styles.noCharactersBox}>
            <div className={styles.noCharactersIcon}>📝</div>
            <div className={styles.noCharactersText}>등록된 캐릭터가 없습니다</div>
            <div className={styles.noCharactersSubtext}>
                PC 버전에서 캐릭터를 추가해주세요
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            {currentView === 'main' && (
                <div className={styles.viewMain}>
                    {/* 날짜 네비게이션 */}
                    <div className={styles.statsHeader}>
                        <div className={styles.dateNav}>
                            <span className={styles.navArrow} onClick={() => changeDate('prev')}>&lt;</span>
                            <div className={styles.dateDisplay}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>{formatDisplayDate(selectedDate)}</span>
                            </div>
                            <span className={styles.navArrow} onClick={() => changeDate('next')}>&gt;</span>
                        </div>

                        {/* 수입 통계 */}
                        <div className={styles.incomeStatsRow}>
                            <div className={styles.incomeStat}>
                                <div className={styles.incomeLabel}>일일</div>
                                <div className={styles.incomeValue}>{formatMoney(dailyIncome)}</div>
                            </div>
                            <div className={styles.incomeStat}>
                                <div className={styles.incomeLabel}>주간</div>
                                <div className={styles.incomeValuePrimary}>{formatMoney(weeklyIncome)}</div>
                            </div>
                            <div className={`${styles.incomeStat} ${styles.noBorder}`}>
                                <div className={styles.incomeLabel}>미판매</div>
                                <div className={styles.incomeValue}>{unsoldItems.length}건</div>
                            </div>
                        </div>
                    </div>

                    {/* 아이템 현황 */}
                    {unsoldItems.length > 0 && (
                        <>
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
                                {unsoldItems.slice(0, 10).map((item) => (
                                    <div key={item.id} className={styles.itemCard}>
                                        <div className={`${styles.itemImgBox} ${item.item_grade === 'legendary' ? styles.itemLegendary : ''}`}>
                                            <div className={styles.itemBadge}>x{item.quantity || 1}</div>
                                        </div>
                                        <div className={styles.itemName}>{item.item_name}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* 캐릭터 목록 없음 */}
                    {characters.length === 0 ? renderNoCharacters() : (
                        <>
                            {/* 스토리 스타일 캐릭터 목록 */}
                            <div className={styles.storyContainer}>
                                {characters.map((character, index) => (
                                    <div
                                        key={character.id}
                                        className={styles.storyItem}
                                        onClick={() => openCharacterDetail(character)}
                                    >
                                        <div className={`${styles.storyAvatarWrapper} ${index > 0 ? styles.storyAvatarInactive : ''}`}>
                                            <div className={styles.storyAvatar}>
                                                {character.profile_image && (
                                                    <img
                                                        src={character.profile_image}
                                                        alt={character.name}
                                                        className={styles.storyAvatarImg}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.storyName}>{character.name}</div>
                                        <div className={styles.storyJob}>{character.class_name || '알수없음'}</div>
                                    </div>
                                ))}
                                {/* 캐릭터 추가 버튼 */}
                                <div
                                    className={styles.storyItem}
                                    onClick={() => setShowAddModal(true)}
                                >
                                    <div className={styles.storyAvatarWrapper}>
                                        <div className={`${styles.storyAvatar} ${styles.storyAvatarAdd}`}>
                                            <span className={styles.addIcon}>+</span>
                                        </div>
                                    </div>
                                    <div className={styles.storyName}>추가</div>
                                </div>
                            </div>

                            <div className={styles.divider}></div>

                            {/* 캐릭터 카드 목록 */}
                            {characters.map((character, index) => (
                                <div
                                    key={character.id}
                                    className={`${styles.charCard} ${index > 0 ? styles.charCardCollapsed : ''}`}
                                    onClick={() => openCharacterDetail(character)}
                                >
                                    <div className={styles.charHeader}>
                                        <div className={`${styles.profileImg} ${index > 0 ? styles.profileInactive : ''}`}>
                                            {character.profile_image && (
                                                <img
                                                    src={character.profile_image}
                                                    alt={character.name}
                                                    className={styles.profileImgActual}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.charInfo}>
                                            <div className={styles.charName}>[{character.server_name}] {character.name}</div>
                                            <div className={styles.charLv}>
                                                {character.item_level ? `IL ${character.item_level}` : ''} / {character.class_name || '알수없음'}
                                            </div>
                                        </div>
                                        <div className={styles.charIncomeArea}>
                                            <div className={styles.incomeArrow}>▲</div>
                                            <div className={styles.charIncome}>{formatMoney(character.todayIncome || 0)}</div>
                                        </div>
                                    </div>

                                    {/* 첫 번째 캐릭터만 진행 현황 표시 */}
                                    {index === 0 && (
                                        <>
                                            <div className={styles.progressLabel}>진행 현황</div>
                                            <div className={styles.chipContainer}>
                                                {/* 성역 */}
                                                <div className={`${styles.statusChip} ${styles.chipRed}`}>
                                                    <span className={`${styles.chipDot} ${styles.dotRed}`}>●</span>
                                                    <span className={styles.chipTxt}>성역</span>
                                                    <span className={styles.chipVal}>
                                                        {records.find(r => r.content_type === 'sanctuary')?.completion_count || 0}/
                                                        {characterState.baseTickets.sanctuary + characterState.bonusTickets.sanctuary}
                                                    </span>
                                                </div>
                                                {/* 초월 */}
                                                <div className={`${styles.statusChip} ${styles.chipPurple}`}>
                                                    <span className={`${styles.chipDot} ${styles.dotPurple}`}>●</span>
                                                    <span className={styles.chipTxt}>초월</span>
                                                    <span className={styles.chipVal}>
                                                        {records.find(r => r.content_type === 'transcend')?.completion_count || 0}/
                                                        {characterState.baseTickets.transcend + characterState.bonusTickets.transcend}
                                                    </span>
                                                </div>
                                                {/* 원정 */}
                                                <div className={`${styles.statusChip} ${styles.chipBlue}`}>
                                                    <span className={`${styles.chipDot} ${styles.dotBlue}`}>●</span>
                                                    <span className={styles.chipTxt}>원정</span>
                                                    <span className={styles.chipVal}>
                                                        {records.find(r => r.content_type === 'expedition')?.completion_count || 0}/
                                                        {characterState.baseTickets.expedition + characterState.bonusTickets.expedition}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* 캐릭터 상세 뷰 */}
            {currentView === 'detail' && selectedCharacter && (
                <div className={styles.viewDetail}>
                    {/* Detail Header */}
                    <div className={styles.detailHeaderContainer}>
                        <div className={styles.backBtn} onClick={closeCharacterDetail}>&lt;</div>
                        <div className={styles.detailMainHeader}>
                            <div className={styles.profileArea}>
                                <div className={styles.profileImgLarge}>
                                    {selectedCharacter.profile_image && (
                                        <img
                                            src={selectedCharacter.profile_image}
                                            alt={selectedCharacter.name}
                                            className={styles.profileImgLargeActual}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className={styles.charInfoArea}>
                                <div className={styles.detailCharName}>{selectedCharacter.name}</div>
                                <div className={styles.detailCharInfo}>
                                    {selectedCharacter.server_name} | {selectedCharacter.class_name || '알수없음'}
                                </div>
                            </div>
                            <div className={styles.incomeStatsArea}>
                                <div className={styles.incomeStatDetail}>
                                    <span className={styles.label}>일일수입</span>
                                    <span className={styles.value}>{formatMoney(selectedCharacter.todayIncome || 0)}</span>
                                </div>
                                <div className={styles.incomeStatDetail}>
                                    <span className={styles.label}>오드에너지</span>
                                    <span className={styles.value}>{characterState.odEnergy.timeEnergy + characterState.odEnergy.ticketEnergy}</span>
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

                    {/* Sub View: Homework (컨텐츠) */}
                    {selectedSubTab === 'homework' && (
                        <div className={styles.charSubview}>
                            {/* 오드 에너지 */}
                            <div className={styles.odEnergyBox}>
                                <span className={styles.odValue}>
                                    {characterState.odEnergy.timeEnergy + characterState.odEnergy.ticketEnergy}
                                </span>
                                <span className={styles.odLabel}>
                                    시간충전: {characterState.odEnergy.timeEnergy} / 충전권: {characterState.odEnergy.ticketEnergy}
                                </span>
                            </div>

                            {/* 주간 컨텐츠 */}
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>주간 컨텐츠</span>
                            </div>

                            {/* 사명 */}
                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>사명</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <span className={styles.wmCount}>
                                            {records.find(r => r.content_type === 'mission')?.completion_count || 0}/5
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementCompletion('mission');
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementCompletion('mission');
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < (records.find(r => r.content_type === 'mission')?.completion_count || 0) ? styles.filled : ''}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            {/* 주간 지령서 */}
                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>주간 지령서</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <span className={styles.wmCount}>
                                            {records.find(r => r.content_type === 'weekly_order')?.completion_count || 0}/12
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementCompletion('weekly_order');
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementCompletion('weekly_order');
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < (records.find(r => r.content_type === 'weekly_order')?.completion_count || 0) ? styles.filled : ''}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            {/* 어비스 주간 지령서 */}
                            <div className={styles.wmCard}>
                                <div className={styles.wmHeader}>
                                    <div className={styles.wmTitleGroup}>
                                        <span className={styles.wmTitle}>어비스 주간 지령서</span>
                                    </div>
                                    <div className={styles.wmControls}>
                                        <span className={styles.wmCount}>
                                            {records.find(r => r.content_type === 'abyss_order')?.completion_count || 0}/20
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementCompletion('abyss_order');
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementCompletion('abyss_order');
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(10)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < Math.min(10, records.find(r => r.content_type === 'abyss_order')?.completion_count || 0) ? styles.filled : ''}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            {/* 슈고페스타 & 어비스 회랑 */}
                            <div className={styles.dualCardGrid}>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardLabel}>슈고 페스타</div>
                                    <div className={styles.miniCardValue}>
                                        {records.find(r => r.content_type === 'shugo')?.completion_count || 0}
                                        <span className={styles.miniCardMax}>/ 14</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => decrementCompletion('shugo')}
                                        >-</button>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => incrementCompletion('shugo')}
                                        >+</button>
                                    </div>
                                </div>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardLabel}>어비스 회랑</div>
                                    <div className={styles.miniCardValue}>
                                        {records.find(r => r.content_type === 'abyss_corridor')?.completion_count || 0}
                                        <span className={styles.miniCardMax}>/ 3</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => decrementCompletion('abyss_corridor')}
                                        >-</button>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => incrementCompletion('abyss_corridor')}
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                            {/* 던전 컨텐츠 */}
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>던전 컨텐츠</span>
                            </div>

                            {/* 초월 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>초월</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {transcendRecords.reduce((sum, r) => sum + r.count, 0)}/
                                        {characterState.baseTickets.transcend}
                                        {characterState.bonusTickets.transcend > 0 && `(+${characterState.bonusTickets.transcend})`}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => setShowDungeonModal('transcend')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => {
                                        if (transcendRecords.length > 0) {
                                            const lastRecord = transcendRecords[transcendRecords.length - 1];
                                            if (lastRecord.count > 1) {
                                                setTranscendRecords(prev => prev.map(r =>
                                                    r.id === lastRecord.id
                                                        ? { ...r, count: r.count - 1, kina: Math.round(r.kina / r.count * (r.count - 1)) }
                                                        : r
                                                ));
                                            } else {
                                                handleDeleteTranscendRecord(lastRecord.id);
                                            }
                                        }
                                    }}>-</button>
                                </div>
                            </div>

                            {/* 원정 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>원정</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {expeditionRecords.reduce((sum, r) => sum + r.count, 0)}/
                                        {characterState.baseTickets.expedition}
                                        {characterState.bonusTickets.expedition > 0 && `(+${characterState.bonusTickets.expedition})`}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => setShowDungeonModal('expedition')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => {
                                        if (expeditionRecords.length > 0) {
                                            const lastRecord = expeditionRecords[expeditionRecords.length - 1];
                                            if (lastRecord.count > 1) {
                                                setExpeditionRecords(prev => prev.map(r =>
                                                    r.id === lastRecord.id
                                                        ? { ...r, count: r.count - 1, kina: Math.round(r.kina / r.count * (r.count - 1)) }
                                                        : r
                                                ));
                                            } else {
                                                handleDeleteExpeditionRecord(lastRecord.id);
                                            }
                                        }
                                    }}>-</button>
                                </div>
                            </div>

                            {/* 성역 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>성역</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {sanctuaryRecords.reduce((sum, r) => sum + r.count, 0)}/
                                        {characterState.baseTickets.sanctuary}
                                        {characterState.bonusTickets.sanctuary > 0 && `(+${characterState.bonusTickets.sanctuary})`}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => setShowDungeonModal('sanctuary')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => {
                                        if (sanctuaryRecords.length > 0) {
                                            const lastRecord = sanctuaryRecords[sanctuaryRecords.length - 1];
                                            if (lastRecord.count > 1) {
                                                setSanctuaryRecords(prev => prev.map(r =>
                                                    r.id === lastRecord.id
                                                        ? { ...r, count: r.count - 1, kina: Math.round(r.kina / r.count * (r.count - 1)) }
                                                        : r
                                                ));
                                            } else {
                                                handleDeleteSanctuaryRecord(lastRecord.id);
                                            }
                                        }
                                    }}>-</button>
                                </div>
                            </div>

                            {/* 일일 컨텐츠 */}
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>일일 컨텐츠</span>
                            </div>

                            {/* 일일던전 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>일일던전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {records.find(r => r.content_type === 'daily_dungeon')?.completion_count || 0}/
                                        {characterState.baseTickets.daily_dungeon}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('daily_dungeon')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('daily_dungeon')}>-</button>
                                </div>
                            </div>

                            {/* 각성전 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>각성전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {records.find(r => r.content_type === 'awakening')?.completion_count || 0}/
                                        {characterState.baseTickets.awakening}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('awakening')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('awakening')}>-</button>
                                </div>
                            </div>

                            {/* 악몽 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>악몽</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {records.find(r => r.content_type === 'nightmare')?.completion_count || 0}/
                                        {characterState.baseTickets.nightmare}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('nightmare')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('nightmare')}>-</button>
                                </div>
                            </div>

                            {/* 차원침공 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>차원침공</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {records.find(r => r.content_type === 'dimension')?.completion_count || 0}/
                                        {characterState.baseTickets.dimension}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('dimension')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('dimension')}>-</button>
                                </div>
                            </div>

                            {/* 토벌전 */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>토벌전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {records.find(r => r.content_type === 'subjugation')?.completion_count || 0}/
                                        {characterState.baseTickets.subjugation}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('subjugation')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('subjugation')}>-</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sub View: Items */}
                    {selectedSubTab === 'items' && (
                        <div className={styles.charSubview}>
                            <div className={styles.itemSummaryBox}>
                                <div className={styles.itemSummaryStat}>
                                    <div className={styles.itemSummaryLabel}>보유 아이템</div>
                                    <div className={styles.itemSummaryValue}>{unsoldItems.length}건</div>
                                </div>
                                <div className={`${styles.itemSummaryStat} ${styles.noBorder}`}>
                                    <div className={styles.itemSummaryLabel}>판매 완료</div>
                                    <div className={styles.itemSummaryValueWhite}>
                                        {soldItems.length}건
                                    </div>
                                </div>
                            </div>

                            {unsoldItems.length === 0 ? (
                                <div className={styles.noItemsBox}>
                                    <div className={styles.noItemsText}>보유 중인 아이템이 없습니다</div>
                                </div>
                            ) : (
                                <div className={styles.summaryScroll}>
                                    {unsoldItems.map((item) => (
                                        <div key={item.id} className={styles.itemCard}>
                                            <div className={`${styles.itemImgBox} ${item.item_grade === 'legendary' ? styles.itemLegendary : ''}`}>
                                                <div className={styles.itemBadge}>x{item.quantity || 1}</div>
                                            </div>
                                            <div className={styles.itemName}>{item.item_name}</div>
                                            {item.total_price && (
                                                <div className={styles.itemPrice}>{formatMoney(item.total_price)}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sub View: Stats */}
                    {selectedSubTab === 'stats' && (
                        <div className={styles.charSubview}>
                            <div className={styles.statsPlaceholder}>
                                통계 기능 준비 중입니다.
                            </div>
                        </div>
                    )}

                    {/* 캐릭터 삭제 버튼 */}
                    <div className={styles.deleteCharacterArea}>
                        <button
                            className={styles.deleteCharacterBtn}
                            onClick={() => {
                                setCharacterToDelete(selectedCharacter);
                                setShowDeleteModal(true);
                            }}
                        >
                            캐릭터 삭제
                        </button>
                    </div>
                </div>
            )}

            {/* 캐릭터 추가 모달 */}
            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>캐릭터 추가</h3>
                            <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        <div className={styles.searchSection}>
                            <div className={styles.serverSelect}>
                                {servers.map((server) => (
                                    <button
                                        key={server}
                                        className={`${styles.serverBtn} ${selectedServer === server ? styles.serverBtnActive : ''}`}
                                        onClick={() => setSelectedServer(server)}
                                    >
                                        {server}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.searchInputWrapper}>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="캐릭터명 검색"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    className={styles.searchBtn}
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                >
                                    {isSearching ? '...' : '검색'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.searchResults}>
                            {searchResults.length === 0 ? (
                                <div className={styles.noResults}>
                                    {searchQuery ? '검색 결과가 없습니다' : '캐릭터명을 검색하세요'}
                                </div>
                            ) : (
                                searchResults.map((result) => (
                                    <div
                                        key={result.characterId || result.id}
                                        className={styles.searchResultItem}
                                        onClick={() => handleAddCharacter(result)}
                                    >
                                        <div className={styles.resultAvatar}>
                                            {(result.profileImageUrl || result.profile_image) && (
                                                <img
                                                    src={result.profileImageUrl || result.profile_image}
                                                    alt={result.name}
                                                    className={styles.resultAvatarImg}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.resultInfo}>
                                            <div className={styles.resultName}>
                                                [{result.serverName || result.server_name}] {result.name}
                                            </div>
                                            <div className={styles.resultClass}>
                                                {result.className || result.class_name || '알수없음'}
                                                {(result.itemLevel || result.item_level) && ` / IL ${result.itemLevel || result.item_level}`}
                                            </div>
                                        </div>
                                        <button
                                            className={styles.addBtn}
                                            disabled={isAddingCharacter}
                                        >
                                            {isAddingCharacter ? '...' : '추가'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 캐릭터 삭제 확인 모달 */}
            {showDeleteModal && characterToDelete && (
                <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
                    <div className={styles.modalContentSmall} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>캐릭터 삭제</h3>
                        </div>
                        <div className={styles.deleteConfirmText}>
                            <strong>{characterToDelete.name}</strong> 캐릭터를 삭제하시겠습니까?
                            <br />
                            <span className={styles.deleteWarning}>모든 기록이 삭제됩니다.</span>
                        </div>
                        <div className={styles.modalButtons}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setCharacterToDelete(null);
                                }}
                            >
                                취소
                            </button>
                            <button
                                className={styles.confirmDeleteBtn}
                                onClick={handleDeleteConfirm}
                                disabled={isDeletingCharacter}
                            >
                                {isDeletingCharacter ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 던전 기록 추가 모달 - 초월 */}
            {showDungeonModal === 'transcend' && dungeonData && (
                <div className={styles.modalOverlay} onClick={() => setShowDungeonModal(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>초월 기록</h3>
                            <button className={styles.modalClose} onClick={() => setShowDungeonModal(null)}>×</button>
                        </div>

                        <div className={styles.dungeonModalBody}>
                            {/* 보스 선택 */}
                            <div className={styles.dungeonSelectGroup}>
                                <label className={styles.dungeonSelectLabel}>보스</label>
                                <div className={styles.dungeonSelectButtons}>
                                    {dungeonData.transcend.bosses.map((boss) => (
                                        <button
                                            key={boss.id}
                                            className={`${styles.dungeonSelectBtn} ${transcendBoss === boss.id ? styles.dungeonSelectBtnActive : ''}`}
                                            onClick={() => setTranscendBoss(boss.id)}
                                        >
                                            {boss.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 티어 선택 */}
                            <div className={styles.dungeonSelectGroup}>
                                <label className={styles.dungeonSelectLabel}>티어</label>
                                <div className={styles.dungeonTierGrid}>
                                    {dungeonData.transcend.bosses[0]?.tiers?.map((tier) => (
                                        <button
                                            key={tier.tier}
                                            className={`${styles.dungeonTierBtn} ${transcendTier === tier.tier ? styles.dungeonTierBtnActive : ''}`}
                                            onClick={() => setTranscendTier(tier.tier)}
                                        >
                                            <span className={styles.tierNumber}>T{tier.tier}</span>
                                            <span className={styles.tierKina}>{formatMoney(tier.kina)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2배 보상 토글 */}
                            <div className={styles.dungeonDoubleRow}>
                                <button
                                    className={`${styles.btn2x} ${transcendDouble ? styles.active : ''}`}
                                    onClick={() => setTranscendDouble(!transcendDouble)}
                                >
                                    2배속
                                </button>
                            </div>

                            {/* 기록 버튼 */}
                            <button
                                className={styles.btnRecord}
                                onClick={handleAddTranscendRecord}
                                disabled={!canEdit}
                            >
                                기록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 던전 기록 추가 모달 - 원정 */}
            {showDungeonModal === 'expedition' && dungeonData && (
                <div className={styles.modalOverlay} onClick={() => setShowDungeonModal(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>원정 기록</h3>
                            <button className={styles.modalClose} onClick={() => setShowDungeonModal(null)}>×</button>
                        </div>

                        <div className={styles.dungeonModalBody}>
                            {/* 카테고리 선택 */}
                            <div className={styles.dungeonSelectGroup}>
                                <label className={styles.dungeonSelectLabel}>카테고리</label>
                                <div className={styles.dungeonSelectButtons}>
                                    {dungeonData.expedition.categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            className={`${styles.dungeonSelectBtn} ${expeditionCategory === cat.id ? styles.dungeonSelectBtnActive : ''}`}
                                            onClick={() => handleExpeditionCategoryChange(cat.id)}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 보스 선택 */}
                            <div className={styles.dungeonSelectGroup}>
                                <label className={styles.dungeonSelectLabel}>던전</label>
                                <div className={styles.dungeonBossGrid}>
                                    {currentExpeditionBosses.map((boss) => (
                                        <button
                                            key={boss.id}
                                            className={`${styles.dungeonBossBtn} ${expeditionBoss === boss.id ? styles.dungeonBossBtnActive : ''}`}
                                            onClick={() => setExpeditionBoss(boss.id)}
                                        >
                                            <span className={styles.bossName}>{boss.name}</span>
                                            <span className={styles.bossKina}>{formatMoney(boss.kina || 0)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2배 보상 토글 */}
                            <div className={styles.dungeonDoubleRow}>
                                <button
                                    className={`${styles.btn2x} ${expeditionDouble ? styles.active : ''}`}
                                    onClick={() => setExpeditionDouble(!expeditionDouble)}
                                >
                                    2배속
                                </button>
                            </div>

                            {/* 기록 버튼 */}
                            <button
                                className={styles.btnRecord}
                                onClick={handleAddExpeditionRecord}
                                disabled={!canEdit}
                            >
                                기록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 던전 기록 추가 모달 - 성역 */}
            {showDungeonModal === 'sanctuary' && dungeonData && (
                <div className={styles.modalOverlay} onClick={() => setShowDungeonModal(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>성역 기록</h3>
                            <button className={styles.modalClose} onClick={() => setShowDungeonModal(null)}>×</button>
                        </div>

                        <div className={styles.dungeonModalBody}>
                            {/* 보스 선택 */}
                            <div className={styles.dungeonSelectGroup}>
                                <label className={styles.dungeonSelectLabel}>보스</label>
                                <div className={styles.dungeonSelectButtons}>
                                    {dungeonData.sanctuary.categories[0]?.bosses.map((boss) => (
                                        <button
                                            key={boss.id}
                                            className={`${styles.dungeonSelectBtn} ${sanctuaryBoss === boss.id ? styles.dungeonSelectBtnActive : ''}`}
                                            onClick={() => setSanctuaryBoss(boss.id)}
                                        >
                                            <span>{boss.name}</span>
                                            <span className={styles.bossKinaSmall}>{formatMoney(boss.kina || 0)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2배 보상 토글 */}
                            <div className={styles.dungeonDoubleRow}>
                                <button
                                    className={`${styles.btn2x} ${sanctuaryDouble ? styles.active : ''}`}
                                    onClick={() => setSanctuaryDouble(!sanctuaryDouble)}
                                >
                                    2배속
                                </button>
                            </div>

                            {/* 기록 버튼 */}
                            <button
                                className={styles.btnRecord}
                                onClick={handleAddSanctuaryRecord}
                                disabled={!canEdit}
                            >
                                기록
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 에러 메시지 표시 */}
            {characterError && (
                <div className={styles.errorToast}>
                    {characterError}
                </div>
            )}
        </div>
    );
}
