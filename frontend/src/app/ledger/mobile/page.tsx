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
    const { isLoading: isGoogleLoading, isAuthenticated: isGoogleAuth, user, signInWithGoogle } = useAuth()

    // Device ID 인증
    const { getAuthHeader, isLoading: isAuthLoading, isAuthenticated, isLinked, deviceId } = useDeviceId()
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

    // 던전 카드 펼침/접힘 상태
    const [expandedDungeons, setExpandedDungeons] = useState<Record<string, boolean>>({
        transcend: false,
        expedition: false,
        sanctuary: false
    });

    // 던전 카드 토글 함수
    const toggleDungeonExpand = (dungeonType: string) => {
        setExpandedDungeons(prev => ({
            ...prev,
            [dungeonType]: !prev[dungeonType]
        }));
    };

    // 로딩 상태
    const isLoadingRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 서버 목록
    const servers = ['전체', '지펠', '이스라펠', '아트레이아'];

    // 수정 가능 여부
    const canEdit = isEditable(selectedDate);

    // 충전 타입별 다음 충전까지 남은 시간 계산 (초 단위)
    const getNextChargeSeconds = useCallback((chargeType: '8h' | 'daily' | 'weekly' | 'charge3h') => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();

        if (chargeType === '8h') {
            // 8시간마다 충전 (21시, 05시, 13시)
            const chargeHours = [5, 13, 21];
            let nextChargeHour = chargeHours.find(h => h > currentHour);
            let daysToAdd = 0;

            if (nextChargeHour === undefined) {
                nextChargeHour = chargeHours[0]; // 다음날 05시
                daysToAdd = 1;
            }

            const hoursUntil = nextChargeHour - currentHour + (daysToAdd * 24);
            return Math.max(0, (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond));
        }

        if (chargeType === 'charge3h') {
            // 3시간마다 충전 (02, 05, 08, 11, 14, 17, 20, 23)
            const chargeHours = [2, 5, 8, 11, 14, 17, 20, 23];
            let nextChargeHour = chargeHours.find(h => h > currentHour);
            let daysToAdd = 0;

            if (nextChargeHour === undefined) {
                nextChargeHour = chargeHours[0]; // 다음날 02시
                daysToAdd = 1;
            }

            const hoursUntil = nextChargeHour - currentHour + (daysToAdd * 24);
            return Math.max(0, (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond));
        }

        if (chargeType === 'daily') {
            // 매일 05시 충전
            let hoursUntil = 5 - currentHour;
            if (hoursUntil <= 0) hoursUntil += 24;
            return Math.max(0, (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond));
        }

        if (chargeType === 'weekly') {
            // 수요일 05시 리셋
            const currentDay = now.getDay(); // 0=일, 3=수
            let daysUntilWed = (3 - currentDay + 7) % 7;
            if (daysUntilWed === 0 && (currentHour > 5 || (currentHour === 5 && currentMinute > 0))) {
                daysUntilWed = 7;
            }

            let hoursUntil = 5 - currentHour;
            if (daysUntilWed === 0) {
                return Math.max(0, (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond));
            }

            return Math.max(0, daysUntilWed * 24 * 3600 + (24 + hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond));
        }

        return 0;
    }, []);

    // 충전 시간 타이머 상태
    const [chargeTimers, setChargeTimers] = useState<Record<string, number>>({
        '8h': 0,
        'daily': 0,
        'weekly': 0,
        'charge3h': 0
    });

    // 충전 타이머 업데이트 (1초마다)
    useEffect(() => {
        const updateTimers = () => {
            setChargeTimers({
                '8h': getNextChargeSeconds('8h'),
                'daily': getNextChargeSeconds('daily'),
                'weekly': getNextChargeSeconds('weekly'),
                'charge3h': getNextChargeSeconds('charge3h')
            });
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [getNextChargeSeconds]);

    // 남은 시간 포맷팅 (초 → 시:분:초 또는 N일 시:분:초)
    const formatTimeRemaining = (seconds: number): string => {
        if (seconds <= 0) return '0:00:00';

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
            return `${days}일 ${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    };

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

    // 캐릭터 상태 (티켓, 오드 에너지, 충전 설정)
    const [characterState, setCharacterState] = useState<{
        baseTickets: Record<string, number>;
        bonusTickets: Record<string, number>;
        chargeSettings: Record<string, number>;
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
        chargeSettings: {
            transcend: 1, expedition: 1, nightmare: 2, dimension: 1, shugo: 2, od_energy: 15
        },
        odEnergy: { timeEnergy: 840, ticketEnergy: 0 }
    });

    // 대시보드 데이터 (모든 캐릭터의 진행현황)
    const [dashboardData, setDashboardData] = useState<Record<string, any>>({});
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);

    // 전체 캐릭터 합산 수입 (API 호출)
    const [totalIncome, setTotalIncome] = useState({ dailyIncome: 0, weeklyIncome: 0 });
    const [isIncomeLoading, setIsIncomeLoading] = useState(false);

    // 섹션1: 미션/지령서 컨텐츠
    const MISSION_CONTENT_DEFS = [
        { id: 'mission', name: '사명', maxPerChar: 5, color: 'green', ticketKey: null },
        { id: 'weekly_order', name: '주간지령서', maxPerChar: 12, color: 'cyan', ticketKey: null },
        { id: 'abyss_order', name: '어비스지령서', maxPerChar: 20, color: 'pink', ticketKey: null },
    ];

    // 섹션2: 던전 컨텐츠 (이용권)
    const DUNGEON_CONTENT_DEFS = [
        { id: 'transcend', name: '초월', maxPerChar: 14, color: 'purple', ticketKey: 'transcend' },
        { id: 'expedition', name: '원정', maxPerChar: 21, color: 'blue', ticketKey: 'expedition' },
        { id: 'sanctuary', name: '성역', maxPerChar: 4, color: 'red', ticketKey: 'sanctuary' },
    ];

    // 섹션3: 일일 컨텐츠
    const DAILY_CONTENT_DEFS = [
        { id: 'daily_dungeon', name: '일던', maxPerChar: 7, color: 'blue', ticketKey: 'daily_dungeon', contentType: 'daily_dungeon' },
        { id: 'awakening', name: '각성전', maxPerChar: 3, color: 'purple', ticketKey: 'awakening', contentType: 'awakening_battle' },
        { id: 'subjugation', name: '토벌전', maxPerChar: 3, color: 'red', ticketKey: 'subjugation', contentType: 'subjugation' },
        { id: 'nightmare', name: '악몽', maxPerChar: 14, color: 'gray', ticketKey: 'nightmare', contentType: 'nightmare' },
        { id: 'dimension', name: '차원침공', maxPerChar: 14, color: 'cyan', ticketKey: 'dimension', contentType: 'dimension_invasion' },
    ];

    // 대시보드 데이터 로드 (선택 날짜 기준)
    useEffect(() => {
        if (!isReady || characters.length === 0) return;

        const loadDashboardData = async () => {
            setIsDashboardLoading(true);
            try {
                const authHeaders = getAuthHeader();
                const characterIds = characters.map(c => c.id).join(',');
                const res = await fetch(`/api/ledger/dashboard?characterIds=${characterIds}&date=${selectedDate}`, {
                    headers: authHeaders
                });

                if (res.ok) {
                    const data = await res.json();
                    setDashboardData(data.characters || {});
                }
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load dashboard data:', error);
            } finally {
                setIsDashboardLoading(false);
            }
        };

        loadDashboardData();
    }, [isReady, characters, selectedDate, getAuthHeader]);

    // 전체 캐릭터 합산 수입 로드 (선택 날짜 기준)
    useEffect(() => {
        if (!isReady || characters.length === 0) {
            setTotalIncome({ dailyIncome: 0, weeklyIncome: 0 });
            return;
        }

        const loadTotalIncome = async () => {
            setIsIncomeLoading(true);
            try {
                const authHeaders = getAuthHeader();

                // 모든 캐릭터의 일일/주간 수입을 병렬로 가져오기
                const incomePromises = characters.map(async (char) => {
                    const [dailyRes, weeklyRes] = await Promise.all([
                        fetch(`/api/ledger/stats?characterId=${char.id}&type=daily&date=${selectedDate}`, { headers: authHeaders }),
                        fetch(`/api/ledger/stats?characterId=${char.id}&type=weekly&date=${selectedDate}`, { headers: authHeaders })
                    ]);

                    let daily = 0;
                    let weekly = 0;

                    if (dailyRes.ok) {
                        const data = await dailyRes.json();
                        daily = data.totalIncome || 0;
                    }
                    if (weeklyRes.ok) {
                        const data = await weeklyRes.json();
                        weekly = data.totalIncome || 0;
                    }

                    return { daily, weekly };
                });

                const results = await Promise.all(incomePromises);
                const dailyTotal = results.reduce((sum, r) => sum + r.daily, 0);
                const weeklyTotal = results.reduce((sum, r) => sum + r.weekly, 0);

                setTotalIncome({ dailyIncome: dailyTotal, weeklyIncome: weeklyTotal });
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load total income:', error);
                setTotalIncome({ dailyIncome: 0, weeklyIncome: 0 });
            } finally {
                setIsIncomeLoading(false);
            }
        };

        loadTotalIncome();
    }, [isReady, characters, selectedDate, getAuthHeader]);

    // 캐릭터별 진행현황 계산 함수
    const getCharacterProgress = (characterId: string) => {
        const charData = dashboardData[characterId];
        if (!charData) return { mission: [], dungeon: [], daily: [] };

        const baseTickets = charData.baseTickets || {};
        const bonusTickets = charData.bonusTickets || {};
        const weeklyData = charData.weeklyData || {};
        const missionCount = charData.missionCount || 0;

        // 섹션1: 미션/지령서 진행률
        const missionProgress = MISSION_CONTENT_DEFS.map(def => {
            let remaining = 0;
            let max = def.maxPerChar;

            if (def.id === 'mission') {
                remaining = Math.max(0, def.maxPerChar - missionCount);
            } else if (def.id === 'weekly_order') {
                remaining = Math.max(0, def.maxPerChar - (weeklyData.weeklyOrderCount || 0));
            } else if (def.id === 'abyss_order') {
                remaining = Math.max(0, def.maxPerChar - (weeklyData.abyssOrderCount || 0));
            }

            return { ...def, current: remaining, max, bonus: 0 };
        });

        // 섹션2: 던전 컨텐츠 진행률 (이용권)
        const dungeonProgress = DUNGEON_CONTENT_DEFS.map(def => {
            let remaining = 0;
            let max = def.maxPerChar;
            let bonus = 0;

            if (def.id === 'transcend') {
                remaining = baseTickets.transcend ?? def.maxPerChar;
                bonus = bonusTickets.transcend || 0;
            } else if (def.id === 'expedition') {
                remaining = baseTickets.expedition ?? def.maxPerChar;
                bonus = bonusTickets.expedition || 0;
            } else if (def.id === 'sanctuary') {
                remaining = baseTickets.sanctuary ?? def.maxPerChar;
                bonus = bonusTickets.sanctuary || 0;
            }

            return { ...def, current: remaining, max, bonus };
        });

        // 섹션3: 일일 컨텐츠 진행률
        const dailyProgress = DAILY_CONTENT_DEFS.map(def => {
            let bonus = 0;
            if (def.ticketKey) {
                bonus = bonusTickets[def.ticketKey] || 0;
            }

            let remaining = def.maxPerChar;
            if (def.ticketKey && baseTickets[def.ticketKey] !== undefined) {
                remaining = baseTickets[def.ticketKey];
            }

            return { ...def, current: remaining, max: def.maxPerChar, bonus };
        });

        return { mission: missionProgress, dungeon: dungeonProgress, daily: dailyProgress };
    };

    // 컨텐츠 칩 색상 클래스
    const getChipColorClass = (color: string) => {
        const colorMap: Record<string, string> = {
            red: styles.chipRed,
            purple: styles.chipPurple,
            blue: styles.chipBlue,
            orange: styles.chipOrange,
            green: styles.chipGreen,
            cyan: styles.chipCyan,
            pink: styles.chipPink,
            gray: styles.chipGray
        };
        return colorMap[color] || styles.chipBlue;
    };

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
                        chargeSettings: data.chargeSettings || characterState.chargeSettings,
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
        items: allItems,
        unsoldItems,
        soldItems,
        addItem,
        sellItem,
        unsellItem,
        deleteItem,
        refetch: refetchItems
    } = useLedgerItems({
        characterId: selectedCharacterId,
        getAuthHeader,
        isReady,
        selectedDate
    });

    // 아이템 검색/등록 상태
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<any[]>([]);
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [isItemSearching, setIsItemSearching] = useState(false);
    const [itemCatalog, setItemCatalog] = useState<any[]>([]);
    const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

    // 아이템 등록 모달 상태
    const [showItemRegisterModal, setShowItemRegisterModal] = useState(false);
    const [selectedItemForRegister, setSelectedItemForRegister] = useState<any>(null);
    const [registerQuantity, setRegisterQuantity] = useState(1);
    const [registerPrice, setRegisterPrice] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);

    // 아이템 액션 시트 상태 (판매/삭제)
    const [showItemActionSheet, setShowItemActionSheet] = useState(false);
    const [selectedItemForAction, setSelectedItemForAction] = useState<any>(null);
    const [sellPrice, setSellPrice] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // 아이템 필터 상태
    const [itemStatusFilter, setItemStatusFilter] = useState<'unsold' | 'sold'>('unsold');

    // 아이템 카탈로그 로드
    useEffect(() => {
        const loadItemCatalog = async () => {
            setIsLoadingCatalog(true);
            try {
                const categories = [
                    'Sword', 'Greatsword', 'Dagger', 'Bow', 'Magicbook', 'Orb', 'Mace', 'Staff', 'Guarder',
                    'Helmet', 'Shoulder', 'Torso', 'Pants', 'Gloves', 'Boots', 'Cape',
                    'Necklace', 'Earring', 'Ring', 'Bracelet',
                    'MagicStone', 'GodStone', 'Wing', 'Material'
                ];

                const promises = categories.map(cat =>
                    fetch(`/api/item/official?action=search&category=${cat}&size=200`)
                        .then(res => res.ok ? res.json() : { contents: [] })
                        .catch(() => ({ contents: [] }))
                );

                const results = await Promise.all(promises);
                const allOfficialItems = results.flatMap(r => r.contents || []);

                const items = allOfficialItems.map((item: any) => ({
                    id: String(item.id),
                    name: item.name,
                    grade: item.grade || 'Common',
                    category: item.categoryName || '기타',
                    icon_url: item.image
                }));

                const uniqueItems = Array.from(new Map(items.map((i: any) => [i.id, i])).values());
                setItemCatalog(uniqueItems as any[]);
            } catch (e) {
                console.error('[Mobile] Failed to load item catalog:', e);
            } finally {
                setIsLoadingCatalog(false);
            }
        };

        loadItemCatalog();
    }, []);

    // 아이템 검색 핸들러
    const handleItemSearch = useCallback((query: string) => {
        setItemSearchQuery(query);
        if (!query.trim()) {
            setItemSearchResults([]);
            return;
        }
        const filtered = itemCatalog.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase())
        );
        setItemSearchResults(filtered.slice(0, 20));
    }, [itemCatalog]);

    // 등급 변환 맵
    const GRADE_TO_LOCAL: Record<string, string> = {
        'Epic': 'heroic', 'Unique': 'legendary', 'Legend': 'ultimate',
        'Rare': 'rare', 'Common': 'common',
        'heroic': 'heroic', 'legendary': 'legendary', 'ultimate': 'ultimate',
        'rare': 'rare', 'common': 'common'
    };

    // 등급 색상
    const GRADE_COLORS: Record<string, string> = {
        'Epic': '#A78BFA', 'Unique': '#FBBF24', 'Legend': '#F472B6',
        'Rare': '#60A5FA', 'Common': '#9CA3AF',
        'heroic': '#A78BFA', 'legendary': '#FBBF24', 'ultimate': '#F472B6',
        'rare': '#60A5FA', 'common': '#9CA3AF'
    };

    // 카테고리 변환
    const getCategoryType = (categoryName: string): string => {
        const equipmentCategories = ['장검', '대검', '단검', '활', '법서', '보주', '전곤', '법봉', '가더', '투구', '견갑', '상의', '하의', '장갑', '신발', '망토', '목걸이', '귀걸이', '반지', '팔찌'];
        const materialCategories = ['마석/영석', '신석', '날개깃', '돌파재료', '채집재료', '제작재료', '물질변환재료'];
        if (equipmentCategories.includes(categoryName)) return 'equipment';
        if (materialCategories.includes(categoryName)) return 'material';
        if (categoryName.includes('날개')) return 'wing';
        return 'etc';
    };

    // 아이템 등록 실행
    const handleRegisterItem = async () => {
        if (!selectedItemForRegister || isRegistering) return;

        setIsRegistering(true);
        try {
            const localGrade = GRADE_TO_LOCAL[selectedItemForRegister.grade] || 'common';
            const localCategory = getCategoryType(selectedItemForRegister.category);

            await addItem({
                item_id: selectedItemForRegister.id,
                item_name: selectedItemForRegister.name,
                item_grade: localGrade,
                item_category: localCategory,
                quantity: registerQuantity,
                unit_price: registerPrice,
                total_price: registerQuantity * registerPrice,
                icon_url: selectedItemForRegister.icon_url
            });

            setShowItemRegisterModal(false);
            setSelectedItemForRegister(null);
            setRegisterQuantity(1);
            setRegisterPrice(0);
            setItemSearchQuery('');
            setItemSearchResults([]);
        } catch (e) {
            console.error('[Mobile] Failed to register item:', e);
        } finally {
            setIsRegistering(false);
        }
    };

    // 아이템 판매 실행
    const handleSellItem = async () => {
        if (!selectedItemForAction || isProcessing) return;

        setIsProcessing(true);
        try {
            const price = parseInt(sellPrice) || selectedItemForAction.total_price;
            await sellItem(selectedItemForAction.id, price);
            setShowItemActionSheet(false);
            setSelectedItemForAction(null);
            setSellPrice('');
        } catch (e) {
            console.error('[Mobile] Failed to sell item:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    // 아이템 판매 취소
    const handleUnsellItem = async () => {
        if (!selectedItemForAction || isProcessing) return;

        setIsProcessing(true);
        try {
            await unsellItem(selectedItemForAction.id);
            setShowItemActionSheet(false);
            setSelectedItemForAction(null);
        } catch (e) {
            console.error('[Mobile] Failed to unsell item:', e);
        } finally {
            setIsProcessing(false);
        }
    };

    // 아이템 삭제 실행
    const handleDeleteItem = async () => {
        if (!selectedItemForAction || isProcessing) return;

        setIsProcessing(true);
        try {
            await deleteItem(selectedItemForAction.id);
            setShowItemActionSheet(false);
            setSelectedItemForAction(null);
        } catch (e) {
            console.error('[Mobile] Failed to delete item:', e);
        } finally {
            setIsProcessing(false);
        }
    };

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

    // 전체 캐릭터 합산 일일/주간 수입 (API에서 로드됨)
    const { dailyIncome, weeklyIncome } = totalIncome;

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

                                    {/* 모든 캐릭터에 진행 현황 표시 */}
                                    {(() => {
                                        const progress = getCharacterProgress(character.id);
                                        if (progress.mission.length === 0 && progress.dungeon.length === 0 && progress.daily.length === 0) return null;
                                        return (
                                            <>
                                                {/* 섹션1: 미션/지령서 */}
                                                <div className={styles.progressLabel}>미션/지령서</div>
                                                <div className={styles.chipContainerGrid}>
                                                    {progress.mission.map(content => (
                                                        <div
                                                            key={content.id}
                                                            className={`${styles.statusChipCompact} ${getChipColorClass(content.color)}`}
                                                        >
                                                            <span className={styles.chipTxt}>{content.name}</span>
                                                            <span className={styles.chipVal}>{content.current}/{content.max}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* 섹션2: 던전 컨텐츠 */}
                                                <div className={styles.progressLabel}>던전 컨텐츠</div>
                                                <div className={styles.chipContainerGrid}>
                                                    {progress.dungeon.map(content => (
                                                        <div
                                                            key={content.id}
                                                            className={`${styles.statusChipCompact} ${getChipColorClass(content.color)}`}
                                                        >
                                                            <span className={styles.chipTxt}>{content.name}</span>
                                                            <span className={styles.chipVal}>{content.current}/{content.max}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* 섹션3: 일일 컨텐츠 */}
                                                <div className={styles.progressLabel}>일일 컨텐츠</div>
                                                <div className={styles.chipContainerGrid}>
                                                    {progress.daily.map(content => (
                                                        <div
                                                            key={content.id}
                                                            className={`${styles.statusChipCompact} ${getChipColorClass(content.color)}`}
                                                        >
                                                            <span className={styles.chipTxt}>{content.name}</span>
                                                            <span className={styles.chipVal}>{content.current}/{content.max}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        );
                                    })()}
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
                                        <span className={styles.wmTimer}>{formatTimeRemaining(chargeTimers['daily'])}</span>
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
                                        <span className={styles.wmTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
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
                                        <span className={styles.wmTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
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
                                    <div className={styles.miniCardTimer}>{formatTimeRemaining(chargeTimers['8h'])}</div>
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
                                    <div className={styles.miniCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</div>
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

                            {/* 초월 - 펼침/접힘 카드 */}
                            <div className={styles.dungeonCard}>
                                <div
                                    className={styles.dungeonCardHeader}
                                    onClick={() => toggleDungeonExpand('transcend')}
                                >
                                    <div className={styles.dungeonCardLeft}>
                                        <span className={styles.dungeonCardIcon}>🔥</span>
                                        <span className={styles.dungeonCardTitle}>초월</span>
                                        <span className={styles.dungeonCardTimer}>{formatTimeRemaining(chargeTimers['8h'])}</span>
                                    </div>
                                    <div className={styles.dungeonCardRight}>
                                        <span className={styles.dungeonCardCount}>
                                            {transcendRecords.reduce((sum, r) => sum + r.count, 0)}/
                                            {characterState.baseTickets.transcend}
                                            {characterState.bonusTickets.transcend > 0 && (
                                                <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.transcend})</span>
                                            )}
                                        </span>
                                        <span className={styles.dungeonCardKina}>
                                            {(transcendRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만
                                        </span>
                                        <span className={styles.dungeonExpandIcon}>
                                            {expandedDungeons.transcend ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {expandedDungeons.transcend && (
                                    <div className={styles.dungeonCardBody}>
                                        {/* 인라인 선택 UI */}
                                        <div className={styles.dungeonInlineControls}>
                                            <div className={styles.dungeonSelectRow}>
                                                <select
                                                    className={styles.dungeonSelect}
                                                    value={transcendBoss}
                                                    onChange={(e) => setTranscendBoss(e.target.value)}
                                                >
                                                    {dungeonData?.transcend.bosses.map(boss => (
                                                        <option key={boss.id} value={boss.id}>{boss.name}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className={styles.dungeonSelect}
                                                    value={transcendTier}
                                                    onChange={(e) => setTranscendTier(Number(e.target.value))}
                                                >
                                                    {dungeonData?.transcend.bosses[0]?.tiers?.map(t => (
                                                        <option key={t.tier} value={t.tier}>T{t.tier} ({(t.kina / 10000).toFixed(0)}만)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className={styles.dungeonActionRow}>
                                                <button
                                                    className={`${styles.dungeonDoubleBtn} ${transcendDouble ? styles.active : ''}`}
                                                    onClick={() => setTranscendDouble(!transcendDouble)}
                                                >
                                                    2배
                                                </button>
                                                <button
                                                    className={styles.dungeonRecordBtn}
                                                    onClick={handleAddTranscendRecord}
                                                    disabled={!canEdit}
                                                >
                                                    + 기록 추가
                                                </button>
                                            </div>
                                        </div>

                                        {/* 기록 리스트 */}
                                        {transcendRecords.length > 0 && (
                                            <div className={styles.dungeonRecordList}>
                                                {transcendRecords.map(record => (
                                                    <div key={record.id} className={styles.dungeonRecordItem}>
                                                        <div className={styles.dungeonRecordInfo}>
                                                            <span className={styles.dungeonRecordName}>
                                                                {record.bossName} T{record.tier}
                                                            </span>
                                                            <span className={styles.dungeonRecordCount}>x{record.count}</span>
                                                        </div>
                                                        <div className={styles.dungeonRecordRight}>
                                                            <span className={styles.dungeonRecordKina}>
                                                                {(record.kina / 10000).toFixed(0)}만
                                                            </span>
                                                            <button
                                                                className={styles.dungeonRecordDelete}
                                                                onClick={() => handleDeleteTranscendRecord(record.id)}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className={styles.dungeonRecordTotal}>
                                                    합계: {(transcendRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만 키나
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 원정 - 펼침/접힘 카드 */}
                            <div className={styles.dungeonCard}>
                                <div
                                    className={styles.dungeonCardHeader}
                                    onClick={() => toggleDungeonExpand('expedition')}
                                >
                                    <div className={styles.dungeonCardLeft}>
                                        <span className={styles.dungeonCardIcon}>⚔️</span>
                                        <span className={styles.dungeonCardTitle}>원정</span>
                                        <span className={styles.dungeonCardTimer}>{formatTimeRemaining(chargeTimers['8h'])}</span>
                                    </div>
                                    <div className={styles.dungeonCardRight}>
                                        <span className={styles.dungeonCardCount}>
                                            {expeditionRecords.reduce((sum, r) => sum + r.count, 0)}/
                                            {characterState.baseTickets.expedition}
                                            {characterState.bonusTickets.expedition > 0 && (
                                                <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.expedition})</span>
                                            )}
                                        </span>
                                        <span className={styles.dungeonCardKina}>
                                            {(expeditionRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만
                                        </span>
                                        <span className={styles.dungeonExpandIcon}>
                                            {expandedDungeons.expedition ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {expandedDungeons.expedition && (
                                    <div className={styles.dungeonCardBody}>
                                        {/* 인라인 선택 UI */}
                                        <div className={styles.dungeonInlineControls}>
                                            <div className={styles.dungeonSelectRow}>
                                                <select
                                                    className={styles.dungeonSelect}
                                                    value={expeditionCategory}
                                                    onChange={(e) => {
                                                        setExpeditionCategory(e.target.value);
                                                        const cat = dungeonData?.expedition.categories.find(c => c.id === e.target.value);
                                                        if (cat && cat.bosses.length > 0) {
                                                            setExpeditionBoss(cat.bosses[0].id);
                                                        }
                                                    }}
                                                >
                                                    {dungeonData?.expedition.categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className={styles.dungeonSelect}
                                                    value={expeditionBoss}
                                                    onChange={(e) => setExpeditionBoss(e.target.value)}
                                                >
                                                    {dungeonData?.expedition.categories
                                                        .find(c => c.id === expeditionCategory)?.bosses
                                                        .map(boss => (
                                                            <option key={boss.id} value={boss.id}>
                                                                {boss.name} ({((boss.kina || 0) / 10000).toFixed(0)}만)
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div className={styles.dungeonActionRow}>
                                                <button
                                                    className={`${styles.dungeonDoubleBtn} ${expeditionDouble ? styles.active : ''}`}
                                                    onClick={() => setExpeditionDouble(!expeditionDouble)}
                                                >
                                                    2배
                                                </button>
                                                <button
                                                    className={styles.dungeonRecordBtn}
                                                    onClick={handleAddExpeditionRecord}
                                                    disabled={!canEdit}
                                                >
                                                    + 기록 추가
                                                </button>
                                            </div>
                                        </div>

                                        {/* 기록 리스트 */}
                                        {expeditionRecords.length > 0 && (
                                            <div className={styles.dungeonRecordList}>
                                                {expeditionRecords.map(record => (
                                                    <div key={record.id} className={styles.dungeonRecordItem}>
                                                        <div className={styles.dungeonRecordInfo}>
                                                            <span className={styles.dungeonRecordName}>
                                                                {record.bossName}
                                                            </span>
                                                            <span className={styles.dungeonRecordCategory}>
                                                                ({record.category})
                                                            </span>
                                                            <span className={styles.dungeonRecordCount}>x{record.count}</span>
                                                        </div>
                                                        <div className={styles.dungeonRecordRight}>
                                                            <span className={styles.dungeonRecordKina}>
                                                                {(record.kina / 10000).toFixed(0)}만
                                                            </span>
                                                            <button
                                                                className={styles.dungeonRecordDelete}
                                                                onClick={() => handleDeleteExpeditionRecord(record.id)}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className={styles.dungeonRecordTotal}>
                                                    합계: {(expeditionRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만 키나
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 성역 - 펼침/접힘 카드 */}
                            <div className={styles.dungeonCard}>
                                <div
                                    className={styles.dungeonCardHeader}
                                    onClick={() => toggleDungeonExpand('sanctuary')}
                                >
                                    <div className={styles.dungeonCardLeft}>
                                        <span className={styles.dungeonCardIcon}>🏛️</span>
                                        <span className={styles.dungeonCardTitle}>성역</span>
                                        <span className={styles.dungeonCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
                                    </div>
                                    <div className={styles.dungeonCardRight}>
                                        <span className={styles.dungeonCardCount}>
                                            {sanctuaryRecords.reduce((sum, r) => sum + r.count, 0)}/
                                            {characterState.baseTickets.sanctuary}
                                            {characterState.bonusTickets.sanctuary > 0 && (
                                                <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.sanctuary})</span>
                                            )}
                                        </span>
                                        <span className={styles.dungeonCardKina}>
                                            {(sanctuaryRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만
                                        </span>
                                        <span className={styles.dungeonExpandIcon}>
                                            {expandedDungeons.sanctuary ? '▲' : '▼'}
                                        </span>
                                    </div>
                                </div>

                                {expandedDungeons.sanctuary && (
                                    <div className={styles.dungeonCardBody}>
                                        {/* 인라인 선택 UI */}
                                        <div className={styles.dungeonInlineControls}>
                                            <div className={styles.dungeonSelectRow}>
                                                <select
                                                    className={styles.dungeonSelect}
                                                    value={sanctuaryBoss}
                                                    onChange={(e) => setSanctuaryBoss(e.target.value)}
                                                >
                                                    {dungeonData?.sanctuary.categories[0]?.bosses.map(boss => (
                                                        <option key={boss.id} value={boss.id}>
                                                            {boss.name} ({((boss.kina || 0) / 10000).toFixed(0)}만)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className={styles.dungeonActionRow}>
                                                <button
                                                    className={`${styles.dungeonDoubleBtn} ${sanctuaryDouble ? styles.active : ''}`}
                                                    onClick={() => setSanctuaryDouble(!sanctuaryDouble)}
                                                >
                                                    2배
                                                </button>
                                                <button
                                                    className={styles.dungeonRecordBtn}
                                                    onClick={handleAddSanctuaryRecord}
                                                    disabled={!canEdit}
                                                >
                                                    + 기록 추가
                                                </button>
                                            </div>
                                        </div>

                                        {/* 기록 리스트 */}
                                        {sanctuaryRecords.length > 0 && (
                                            <div className={styles.dungeonRecordList}>
                                                {sanctuaryRecords.map(record => (
                                                    <div key={record.id} className={styles.dungeonRecordItem}>
                                                        <div className={styles.dungeonRecordInfo}>
                                                            <span className={styles.dungeonRecordName}>
                                                                {record.bossName}
                                                            </span>
                                                            <span className={styles.dungeonRecordCount}>x{record.count}</span>
                                                        </div>
                                                        <div className={styles.dungeonRecordRight}>
                                                            <span className={styles.dungeonRecordKina}>
                                                                {(record.kina / 10000).toFixed(0)}만
                                                            </span>
                                                            <button
                                                                className={styles.dungeonRecordDelete}
                                                                onClick={() => handleDeleteSanctuaryRecord(record.id)}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className={styles.dungeonRecordTotal}>
                                                    합계: {(sanctuaryRecords.reduce((sum, r) => sum + r.kina, 0) / 10000).toFixed(0)}만 키나
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 일일 컨텐츠 */}
                            <div className={styles.contentHeader}>
                                <span className={styles.contentTitle}>일일 컨텐츠</span>
                            </div>

                            {/* 일일던전 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>일일던전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, characterState.baseTickets.daily_dungeon - (records.find(r => r.content_type === 'daily_dungeon')?.completion_count || 0))}/
                                        {characterState.baseTickets.daily_dungeon}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('daily_dungeon')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('daily_dungeon')}>-</button>
                                </div>
                            </div>

                            {/* 각성전 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>각성전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, characterState.baseTickets.awakening - (records.find(r => r.content_type === 'awakening_battle')?.completion_count || 0))}/
                                        {characterState.baseTickets.awakening}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('awakening_battle')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('awakening_battle')}>-</button>
                                </div>
                            </div>

                            {/* 악몽 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>악몽</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, characterState.baseTickets.nightmare - (records.find(r => r.content_type === 'nightmare')?.completion_count || 0))}/
                                        {characterState.baseTickets.nightmare}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('nightmare')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('nightmare')}>-</button>
                                </div>
                            </div>

                            {/* 차원침공 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>차원침공</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, characterState.baseTickets.dimension - (records.find(r => r.content_type === 'dimension_invasion')?.completion_count || 0))}/
                                        {characterState.baseTickets.dimension}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => incrementCompletion('dimension_invasion')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => decrementCompletion('dimension_invasion')}>-</button>
                                </div>
                            </div>

                            {/* 토벌전 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>토벌전</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, characterState.baseTickets.subjugation - (records.find(r => r.content_type === 'subjugation')?.completion_count || 0))}/
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
                            {/* 요약 통계 */}
                            <div className={styles.itemSummaryBox}>
                                <div
                                    className={`${styles.itemSummaryStat} ${itemStatusFilter === 'unsold' ? styles.itemStatActive : ''}`}
                                    onClick={() => setItemStatusFilter('unsold')}
                                >
                                    <div className={styles.itemSummaryLabel}>보유 아이템</div>
                                    <div className={styles.itemSummaryValue}>{unsoldItems.length}건</div>
                                </div>
                                <div
                                    className={`${styles.itemSummaryStat} ${styles.noBorder} ${itemStatusFilter === 'sold' ? styles.itemStatActive : ''}`}
                                    onClick={() => setItemStatusFilter('sold')}
                                >
                                    <div className={styles.itemSummaryLabel}>판매 완료</div>
                                    <div className={styles.itemSummaryValueWhite}>
                                        {soldItems.length}건
                                    </div>
                                </div>
                            </div>

                            {/* 아이템 검색/등록 */}
                            <div className={styles.itemSearchContainer}>
                                <input
                                    type="text"
                                    className={styles.itemSearchInput}
                                    placeholder={isLoadingCatalog ? "아이템 로딩 중..." : "아이템 검색하여 등록..."}
                                    value={itemSearchQuery}
                                    onChange={(e) => handleItemSearch(e.target.value)}
                                    onFocus={() => setShowItemSearch(true)}
                                    disabled={isLoadingCatalog}
                                />
                                {itemSearchQuery && (
                                    <button
                                        className={styles.itemSearchClear}
                                        onClick={() => {
                                            setItemSearchQuery('');
                                            setItemSearchResults([]);
                                        }}
                                    >
                                        ×
                                    </button>
                                )}

                                {/* 검색 결과 드롭다운 */}
                                {showItemSearch && itemSearchResults.length > 0 && (
                                    <div className={styles.itemSearchResults}>
                                        {itemSearchResults.map((item) => (
                                            <div
                                                key={item.id}
                                                className={styles.itemSearchResultItem}
                                                onClick={() => {
                                                    setSelectedItemForRegister(item);
                                                    setShowItemRegisterModal(true);
                                                    setShowItemSearch(false);
                                                }}
                                            >
                                                {item.icon_url && (
                                                    <img
                                                        src={item.icon_url}
                                                        alt={item.name}
                                                        className={styles.itemSearchResultIcon}
                                                        style={{ borderColor: GRADE_COLORS[item.grade] || '#9CA3AF' }}
                                                    />
                                                )}
                                                <div className={styles.itemSearchResultInfo}>
                                                    <span
                                                        className={styles.itemSearchResultName}
                                                        style={{ color: GRADE_COLORS[item.grade] || '#E5E7EB' }}
                                                    >
                                                        {item.name}
                                                    </span>
                                                    <span className={styles.itemSearchResultCategory}>{item.category}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 아이템 목록 */}
                            {itemStatusFilter === 'unsold' ? (
                                unsoldItems.length === 0 ? (
                                    <div className={styles.noItemsBox}>
                                        <div className={styles.noItemsText}>보유 중인 아이템이 없습니다</div>
                                        <div className={styles.noItemsHint}>위 검색창에서 아이템을 검색하여 등록하세요</div>
                                    </div>
                                ) : (
                                    <div className={styles.itemListContainer}>
                                        {unsoldItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={styles.itemListCard}
                                                onClick={() => {
                                                    setSelectedItemForAction(item);
                                                    setSellPrice(item.total_price?.toString() || '');
                                                    setShowItemActionSheet(true);
                                                }}
                                            >
                                                <div
                                                    className={styles.itemListIcon}
                                                    style={{ borderColor: GRADE_COLORS[item.item_grade] || '#9CA3AF' }}
                                                >
                                                    {item.icon_url ? (
                                                        <img src={item.icon_url} alt={item.item_name} />
                                                    ) : (
                                                        <span>📦</span>
                                                    )}
                                                    {item.quantity > 1 && (
                                                        <span className={styles.itemListBadge}>x{item.quantity}</span>
                                                    )}
                                                </div>
                                                <div className={styles.itemListInfo}>
                                                    <div
                                                        className={styles.itemListName}
                                                        style={{ color: GRADE_COLORS[item.item_grade] || '#E5E7EB' }}
                                                    >
                                                        {item.item_name}
                                                    </div>
                                                    <div className={styles.itemListMeta}>
                                                        {item.total_price ? `${item.total_price.toLocaleString()} 키나` : '가격 미정'}
                                                    </div>
                                                </div>
                                                <div className={styles.itemListAction}>▶</div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                soldItems.length === 0 ? (
                                    <div className={styles.noItemsBox}>
                                        <div className={styles.noItemsText}>판매 완료된 아이템이 없습니다</div>
                                    </div>
                                ) : (
                                    <div className={styles.itemListContainer}>
                                        {soldItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`${styles.itemListCard} ${styles.itemListCardSold}`}
                                                onClick={() => {
                                                    setSelectedItemForAction(item);
                                                    setShowItemActionSheet(true);
                                                }}
                                            >
                                                <div
                                                    className={styles.itemListIcon}
                                                    style={{ borderColor: GRADE_COLORS[item.item_grade] || '#9CA3AF', opacity: 0.7 }}
                                                >
                                                    {item.icon_url ? (
                                                        <img src={item.icon_url} alt={item.item_name} />
                                                    ) : (
                                                        <span>📦</span>
                                                    )}
                                                </div>
                                                <div className={styles.itemListInfo}>
                                                    <div className={styles.itemListName} style={{ color: '#9CA3AF' }}>
                                                        {item.item_name}
                                                    </div>
                                                    <div className={styles.itemListMetaSold}>
                                                        판매: {item.sold_price?.toLocaleString() || 0} 키나
                                                    </div>
                                                </div>
                                                <div className={styles.itemListSoldBadge}>완료</div>
                                            </div>
                                        ))}
                                    </div>
                                )
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

            {/* 아이템 등록 모달 */}
            {showItemRegisterModal && selectedItemForRegister && (
                <div className={styles.modalOverlay} onClick={() => setShowItemRegisterModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>아이템 등록</h3>
                            <button className={styles.modalClose} onClick={() => setShowItemRegisterModal(false)}>×</button>
                        </div>

                        <div className={styles.itemRegisterBody}>
                            {/* 아이템 정보 */}
                            <div className={styles.itemRegisterInfo}>
                                {selectedItemForRegister.icon_url && (
                                    <img
                                        src={selectedItemForRegister.icon_url}
                                        alt={selectedItemForRegister.name}
                                        className={styles.itemRegisterIcon}
                                        style={{ borderColor: GRADE_COLORS[selectedItemForRegister.grade] || '#9CA3AF' }}
                                    />
                                )}
                                <div className={styles.itemRegisterDetails}>
                                    <div
                                        className={styles.itemRegisterName}
                                        style={{ color: GRADE_COLORS[selectedItemForRegister.grade] || '#E5E7EB' }}
                                    >
                                        {selectedItemForRegister.name}
                                    </div>
                                    <div className={styles.itemRegisterCategory}>{selectedItemForRegister.category}</div>
                                </div>
                            </div>

                            {/* 수량 입력 */}
                            <div className={styles.itemRegisterField}>
                                <label className={styles.itemRegisterLabel}>개수</label>
                                <div className={styles.itemQuantityControl}>
                                    <button
                                        className={styles.itemQuantityBtn}
                                        onClick={() => setRegisterQuantity(Math.max(1, registerQuantity - 1))}
                                        disabled={registerQuantity <= 1}
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        value={registerQuantity}
                                        onChange={(e) => setRegisterQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className={styles.itemQuantityInput}
                                        min={1}
                                    />
                                    <button
                                        className={styles.itemQuantityBtn}
                                        onClick={() => setRegisterQuantity(registerQuantity + 1)}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* 단가 입력 */}
                            <div className={styles.itemRegisterField}>
                                <label className={styles.itemRegisterLabel}>판매 단가 (키나)</label>
                                <input
                                    type="text"
                                    value={registerPrice.toLocaleString()}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        setRegisterPrice(parseInt(value) || 0);
                                    }}
                                    className={styles.itemPriceInput}
                                    placeholder="0"
                                />
                            </div>

                            {/* 총액 표시 */}
                            <div className={styles.itemRegisterTotal}>
                                <span className={styles.itemTotalLabel}>총 판매 금액</span>
                                <span className={styles.itemTotalValue}>{(registerQuantity * registerPrice).toLocaleString()} 키나</span>
                            </div>

                            {/* 버튼 */}
                            <div className={styles.itemRegisterButtons}>
                                <button
                                    className={styles.cancelBtn}
                                    onClick={() => setShowItemRegisterModal(false)}
                                >
                                    취소
                                </button>
                                <button
                                    className={styles.submitBtn}
                                    onClick={handleRegisterItem}
                                    disabled={isRegistering}
                                >
                                    {isRegistering ? '등록 중...' : '등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 아이템 액션 시트 (판매/삭제) */}
            {showItemActionSheet && selectedItemForAction && (
                <div className={styles.actionSheetOverlay} onClick={() => setShowItemActionSheet(false)}>
                    <div className={styles.actionSheet} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.actionSheetHandle}></div>

                        {/* 아이템 정보 */}
                        <div className={styles.actionSheetItem}>
                            {selectedItemForAction.icon_url && (
                                <img
                                    src={selectedItemForAction.icon_url}
                                    alt={selectedItemForAction.item_name}
                                    className={styles.actionSheetIcon}
                                    style={{ borderColor: GRADE_COLORS[selectedItemForAction.item_grade] || '#9CA3AF' }}
                                />
                            )}
                            <div className={styles.actionSheetInfo}>
                                <div
                                    className={styles.actionSheetName}
                                    style={{ color: GRADE_COLORS[selectedItemForAction.item_grade] || '#E5E7EB' }}
                                >
                                    {selectedItemForAction.item_name}
                                    {selectedItemForAction.quantity > 1 && ` x${selectedItemForAction.quantity}`}
                                </div>
                                <div className={styles.actionSheetPrice}>
                                    {selectedItemForAction.sold_price
                                        ? `판매가: ${selectedItemForAction.sold_price.toLocaleString()} 키나`
                                        : selectedItemForAction.total_price
                                            ? `등록가: ${selectedItemForAction.total_price.toLocaleString()} 키나`
                                            : '가격 미정'}
                                </div>
                            </div>
                        </div>

                        {/* 액션 버튼들 */}
                        <div className={styles.actionSheetButtons}>
                            {!selectedItemForAction.sold_price ? (
                                <>
                                    {/* 미판매 아이템: 판매 완료 */}
                                    <div className={styles.actionSheetSellSection}>
                                        <input
                                            type="text"
                                            className={styles.actionSheetSellInput}
                                            placeholder="판매 금액 입력"
                                            value={sellPrice}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/,/g, '');
                                                setSellPrice(value);
                                            }}
                                        />
                                        <button
                                            className={styles.actionSheetSellBtn}
                                            onClick={handleSellItem}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? '처리 중...' : '판매 완료'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* 판매완료 아이템: 판매 취소 */}
                                    <button
                                        className={styles.actionSheetUnsellBtn}
                                        onClick={handleUnsellItem}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? '처리 중...' : '판매 취소'}
                                    </button>
                                </>
                            )}

                            <button
                                className={styles.actionSheetDeleteBtn}
                                onClick={handleDeleteItem}
                                disabled={isProcessing}
                            >
                                삭제
                            </button>

                            <button
                                className={styles.actionSheetCancelBtn}
                                onClick={() => setShowItemActionSheet(false)}
                            >
                                닫기
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
