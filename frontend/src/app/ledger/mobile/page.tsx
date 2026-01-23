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
import { getGameDate, getWeekKey, isEditable, getKSTDate } from '../utils/dateUtils';
import { LedgerCharacter } from '@/types/ledger';
import { SERVERS, SERVER_MAP } from '@/app/constants/servers';
import { supabaseApi } from '@/lib/supabaseApi';
import TicketChargePopup from '../components/TicketChargePopup';
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

// 고정된 최대 횟수 상수 (PC와 동일)
const MAX_TICKETS = {
    // 던전 컨텐츠
    transcend: 14,      // 초월: 8시간 충전 (05/13/21시)
    expedition: 21,     // 원정: 8시간 충전
    sanctuary: 4,       // 성역: 주간 리셋 (수요일 05시)
    // 일일 컨텐츠
    daily_dungeon: 7,   // 일일던전: 주간 리셋
    awakening: 3,       // 각성전: 주간 리셋
    nightmare: 14,      // 악몽: 매일 05시에 2회 충전
    dimension: 14,      // 차원침공: 24시간마다 1회 충전
    subjugation: 3      // 토벌전: 주간 리셋
}

// 캐릭터 상태 기본값 (캐릭터 변경 시 fallback용)
const DEFAULT_CHARACTER_STATE = {
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
        characters: realCharacters,
        isLoading: isCharactersLoading,
        addCharacter,
        removeCharacter,
        refetch: refetchCharacters,
        error: characterError
    } = useLedgerCharacters({ getAuthHeader, isReady })

    // 개발용 더미 캐릭터 (로컬 테스트용)
    const DUMMY_CHARACTERS: LedgerCharacter[] = process.env.NODE_ENV === 'development' ? [
        {
            id: 'dummy-1',
            name: '테스트캐릭1',
            server_name: '지펠',
            class_name: '검투사',
            faction: '천족',
            item_level: 85,
            profile_image: '',
            todayIncome: 125000,
            income: 125000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'dummy-2',
            name: '테스트캐릭2',
            server_name: '이스라펠',
            class_name: '마도성',
            faction: '마족',
            item_level: 82,
            profile_image: '',
            todayIncome: 87000,
            income: 87000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'dummy-3',
            name: '테스트캐릭3',
            server_name: '지펠',
            class_name: '치유성',
            faction: '천족',
            item_level: 78,
            profile_image: '',
            todayIncome: 45000,
            income: 45000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ] : []

    // 실제 캐릭터가 없으면 더미 캐릭터 사용 (개발 환경에서만)
    const characters = realCharacters.length > 0 ? realCharacters : DUMMY_CHARACTERS

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
    const [selectedDate, setSelectedDate] = useState<string>(getGameDate());

    // 캐릭터 추가 모달 상태
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedRace, setSelectedRace] = useState<'ELYOS' | 'ASMODIANS' | ''>('');
    const [selectedServer, setSelectedServer] = useState<string>('');
    const [isAddingCharacter, setIsAddingCharacter] = useState(false);

    // 캐릭터 삭제 확인 모달 상태
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [characterToDelete, setCharacterToDelete] = useState<LedgerCharacter | null>(null);
    const [isDeletingCharacter, setIsDeletingCharacter] = useState(false);

    // 설정/충전 팝업 상태
    const [showChargePopup, setShowChargePopup] = useState(false);

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

    // 종족별 서버 목록 필터링
    const filteredServers = SERVERS.filter(s =>
        selectedRace === 'ELYOS' ? s.id.startsWith('1') :
        selectedRace === 'ASMODIANS' ? s.id.startsWith('2') :
        true
    );

    // 수정 가능 여부
    const canEdit = isEditable(selectedDate);

    // 충전 타입별 다음 충전까지 남은 시간 계산 (초 단위) - 한국 시간(KST) 기준
    const getNextChargeSeconds = useCallback((chargeType: '8h' | 'daily' | 'weekly' | 'charge3h' | '24h') => {
        // 한국 시간(KST) 기준으로 계산
        const now = getKSTDate();
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
            // 수요일 05시 리셋 - Date 객체 기반 정확한 계산
            const reset = new Date(now);
            reset.setHours(5, 0, 0, 0);
            const dayOfWeek = reset.getDay();
            let daysUntilWed = (3 - dayOfWeek + 7) % 7;

            if (daysUntilWed === 0 && now >= reset) {
                daysUntilWed = 7;
            }

            reset.setDate(reset.getDate() + daysUntilWed);
            return Math.max(0, Math.floor((reset.getTime() - now.getTime()) / 1000));
        }

        if (chargeType === '24h') {
            // 24시간마다 충전 (고정 24시간 표시)
            return 24 * 60 * 60; // 24시간 = 86400초
        }

        return 0;
    }, []);

    // 충전 시간 타이머 상태
    const [chargeTimers, setChargeTimers] = useState<Record<string, number>>({
        '8h': 0,
        'daily': 0,
        'weekly': 0,
        'charge3h': 0,
        '24h': 0
    });

    // 충전 타이머 업데이트 (1초마다)
    useEffect(() => {
        const updateTimers = () => {
            setChargeTimers({
                '8h': getNextChargeSeconds('8h'),
                'daily': getNextChargeSeconds('daily'),
                'weekly': getNextChargeSeconds('weekly'),
                'charge3h': getNextChargeSeconds('charge3h'),
                '24h': getNextChargeSeconds('24h')
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

    // 주간 컨텐츠 상태 (사명/주간지령서/어비스지령서 - PC와 동기화용)
    const [weeklyContent, setWeeklyContent] = useState<{
        missionCount: number;
        weeklyOrderCount: number;
        abyssOrderCount: number;
        shugoTickets: { base: number; bonus: number };
    }>({
        missionCount: 0,
        weeklyOrderCount: 0,
        abyssOrderCount: 0,
        shugoTickets: { base: 14, bonus: 0 }
    });
    const weeklyContentLoadingRef = useRef(false);
    const weeklyContentSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const weeklyContentLastLoadedRef = useRef<string | null>(null);  // 중복 호출 방지
    const characterStateLastLoadedRef = useRef<string | null>(null);  // 캐릭터 상태 중복 호출 방지

    // 대시보드 데이터 (모든 캐릭터의 진행현황)
    const [dashboardData, setDashboardData] = useState<Record<string, any>>({});
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);

    // 진행현황 펼치기/접기 상태 (캐릭터 ID Set)
    const [expandedProgressIds, setExpandedProgressIds] = useState<Set<string>>(new Set());

    // 첫 번째 캐릭터는 기본으로 펼치기 (사용자에게 기능 학습 유도)
    useEffect(() => {
        if (characters.length > 0 && expandedProgressIds.size === 0) {
            setExpandedProgressIds(new Set([characters[0].id]));
        }
    }, [characters]);

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

    // 개발용 더미 대시보드 데이터
    const DUMMY_DASHBOARD_DATA: Record<string, any> = process.env.NODE_ENV === 'development' ? {
        'dummy-1': {
            name: '테스트캐릭1',
            todayIncome: 125000,
            weeklyIncome: 450000,
            baseTickets: { transcend: 10, expedition: 18, sanctuary: 3, daily_dungeon: 5, awakening: 2, nightmare: 12, dimension: 10, subjugation: 2 },
            bonusTickets: { transcend: 2, expedition: 0, sanctuary: 1 },
            contentRecords: {},
            weeklyData: { weeklyOrderCount: 4, abyssOrderCount: 8, shugoBase: 10, shugoBonus: 2 },
            missionCount: 2
        },
        'dummy-2': {
            name: '테스트캐릭2',
            todayIncome: 87000,
            weeklyIncome: 320000,
            baseTickets: { transcend: 14, expedition: 21, sanctuary: 4, daily_dungeon: 7, awakening: 3, nightmare: 14, dimension: 14, subjugation: 3 },
            bonusTickets: {},
            contentRecords: {},
            weeklyData: { weeklyOrderCount: 0, abyssOrderCount: 0, shugoBase: 14, shugoBonus: 0 },
            missionCount: 0
        },
        'dummy-3': {
            name: '테스트캐릭3',
            todayIncome: 45000,
            weeklyIncome: 180000,
            baseTickets: { transcend: 6, expedition: 12, sanctuary: 2, daily_dungeon: 3, awakening: 1, nightmare: 8, dimension: 6, subjugation: 1 },
            bonusTickets: { transcend: 1 },
            contentRecords: {},
            weeklyData: { weeklyOrderCount: 8, abyssOrderCount: 15, shugoBase: 6, shugoBonus: 0 },
            missionCount: 4
        }
    } : {}

    // 대시보드 데이터 로드 (선택 날짜 기준)
    useEffect(() => {
        if (!isReady || characters.length === 0) return;

        // 더미 캐릭터인 경우 더미 데이터 사용
        const isDummyMode = characters.some(c => c.id.startsWith('dummy-'));
        if (isDummyMode) {
            setDashboardData(DUMMY_DASHBOARD_DATA);
            setIsDashboardLoading(false);
            return;
        }

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

        // 더미 캐릭터인 경우 더미 데이터에서 수입 계산
        const isDummyMode = characters.some(c => c.id.startsWith('dummy-'));
        if (isDummyMode) {
            const dailyTotal = characters.reduce((sum, c) => sum + (DUMMY_DASHBOARD_DATA[c.id]?.todayIncome || 0), 0);
            const weeklyTotal = characters.reduce((sum, c) => sum + (DUMMY_DASHBOARD_DATA[c.id]?.weeklyIncome || 0), 0);
            setTotalIncome({ dailyIncome: dailyTotal, weeklyIncome: weeklyTotal });
            setIsIncomeLoading(false);
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

    // 진행현황 펼치기/접기 토글
    const toggleProgressExpand = (characterId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 카드 클릭 이벤트 전파 방지
        setExpandedProgressIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(characterId)) {
                newSet.delete(characterId);
            } else {
                newSet.add(characterId);
            }
            return newSet;
        });
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

        // 중복 호출 방지
        if (characterStateLastLoadedRef.current === selectedCharacterId) {
            return;
        }

        const loadCharacterState = async () => {
            characterStateLastLoadedRef.current = selectedCharacterId;

            try {
                const authHeaders = getAuthHeader();
                const res = await fetch(
                    `/api/ledger/character-state?characterId=${selectedCharacterId}`,
                    { headers: authHeaders }
                );

                if (res.ok) {
                    const data = await res.json();
                    // 기본값을 이전 캐릭터 상태가 아닌 DEFAULT_CHARACTER_STATE에서 가져옴
                    setCharacterState({
                        baseTickets: data.baseTickets || DEFAULT_CHARACTER_STATE.baseTickets,
                        bonusTickets: data.bonusTickets || DEFAULT_CHARACTER_STATE.bonusTickets,
                        chargeSettings: data.chargeSettings || DEFAULT_CHARACTER_STATE.chargeSettings,
                        odEnergy: {
                            timeEnergy: data.odEnergy?.timeEnergy ?? DEFAULT_CHARACTER_STATE.odEnergy.timeEnergy,
                            ticketEnergy: data.odEnergy?.ticketEnergy ?? DEFAULT_CHARACTER_STATE.odEnergy.ticketEnergy
                        }
                    });
                } else {
                    // API 실패 시 기본값으로 초기화
                    setCharacterState(DEFAULT_CHARACTER_STATE);
                }
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load character state:', error);
                setCharacterState(DEFAULT_CHARACTER_STATE);
            }
        };

        loadCharacterState();
    }, [selectedCharacterId, isReady, getAuthHeader]);

    // 주간 컨텐츠 로드 (사명/주간지령서/어비스지령서 - PC와 동기화)
    useEffect(() => {
        if (!selectedCharacterId || !isReady) return;

        const weekKey = getWeekKey(new Date(selectedDate));
        const gameDate = getGameDate(new Date(selectedDate));
        const loadKey = `${selectedCharacterId}-${weekKey}-${gameDate}`;

        // 중복 호출 방지
        if (weeklyContentLastLoadedRef.current === loadKey) {
            return;
        }

        const loadWeeklyContent = async () => {
            weeklyContentLoadingRef.current = true;
            weeklyContentLastLoadedRef.current = loadKey;

            try {
                const res = await fetch(
                    `/api/ledger/weekly-content?characterId=${selectedCharacterId}&weekKey=${weekKey}&gameDate=${gameDate}`,
                    { headers: getAuthHeader() }
                );

                if (res.ok) {
                    const data = await res.json();
                    setWeeklyContent({
                        missionCount: data.mission?.count ?? 0,
                        weeklyOrderCount: data.weekly?.weeklyOrderCount ?? 0,
                        abyssOrderCount: data.weekly?.abyssOrderCount ?? 0,
                        shugoTickets: data.weekly?.shugoTickets ?? { base: 14, bonus: 0 }
                    });
                }
            } catch (error) {
                console.error('[Mobile Ledger] Failed to load weekly content:', error);
            } finally {
                setTimeout(() => {
                    weeklyContentLoadingRef.current = false;
                }, 100);
            }
        };

        loadWeeklyContent();
    }, [selectedCharacterId, selectedDate, isReady, getAuthHeader]);

    // 주간 컨텐츠 저장 (디바운스)
    const saveWeeklyContent = useCallback(async () => {
        if (!selectedCharacterId || weeklyContentLoadingRef.current || !canEdit) return;

        const weekKey = getWeekKey(new Date(selectedDate));
        const gameDate = getGameDate(new Date(selectedDate));

        try {
            await fetch('/api/ledger/weekly-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({
                    characterId: selectedCharacterId,
                    weekKey,
                    gameDate,
                    weeklyOrderCount: weeklyContent.weeklyOrderCount,
                    abyssOrderCount: weeklyContent.abyssOrderCount,
                    shugoTickets: weeklyContent.shugoTickets,
                    abyssRegions: [],
                    missionCount: weeklyContent.missionCount
                })
            });
        } catch (error) {
            console.error('[Mobile Ledger] Failed to save weekly content:', error);
        }
    }, [selectedCharacterId, selectedDate, canEdit, weeklyContent, getAuthHeader]);

    const debouncedSaveWeeklyContent = useCallback(() => {
        if (weeklyContentSaveTimeoutRef.current) {
            clearTimeout(weeklyContentSaveTimeoutRef.current);
        }
        weeklyContentSaveTimeoutRef.current = setTimeout(() => {
            saveWeeklyContent();
        }, 500);
    }, [saveWeeklyContent]);

    // 주간 컨텐츠 증가/감소 함수
    const incrementMission = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            missionCount: Math.min(5, prev.missionCount + 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const decrementMission = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            missionCount: Math.max(0, prev.missionCount - 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const incrementWeeklyOrder = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            weeklyOrderCount: Math.min(12, prev.weeklyOrderCount + 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const decrementWeeklyOrder = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            weeklyOrderCount: Math.max(0, prev.weeklyOrderCount - 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const incrementAbyssOrder = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            abyssOrderCount: Math.min(20, prev.abyssOrderCount + 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const decrementAbyssOrder = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            abyssOrderCount: Math.max(0, prev.abyssOrderCount - 1)
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const incrementShugo = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => {
            // 보너스가 있으면 보너스 먼저 사용
            if (prev.shugoTickets.bonus > 0) {
                return {
                    ...prev,
                    shugoTickets: { ...prev.shugoTickets, bonus: prev.shugoTickets.bonus - 1 }
                };
            }
            return {
                ...prev,
                shugoTickets: { ...prev.shugoTickets, base: Math.max(0, prev.shugoTickets.base - 1) }
            };
        });
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

    const decrementShugo = useCallback(() => {
        if (!canEdit) return;
        setWeeklyContent(prev => ({
            ...prev,
            shugoTickets: { ...prev.shugoTickets, base: Math.min(14, prev.shugoTickets.base + 1) }
        }));
        debouncedSaveWeeklyContent();
    }, [canEdit, debouncedSaveWeeklyContent]);

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

        // 잔여 횟수 확인 (기본 + 보너스)
        const baseRemaining = characterState.baseTickets.transcend;
        const bonusRemaining = characterState.bonusTickets.transcend || 0;
        const totalAvailable = baseRemaining + bonusRemaining;

        if (totalAvailable < 1) {
            alert('잔여 횟수가 부족합니다!');
            return;
        }

        const tierData = boss.tiers?.find(t => t.tier === transcendTier);
        const kina = tierData?.kina || 0;
        const multiplier = transcendDouble ? 2 : 1;

        // 충전권에서 사용했는지 추적
        const usedFromBonus = baseRemaining > 0 ? 0 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            tier: transcendTier,
            count: 1,
            kina: kina * multiplier,
            usedFromBonus
        };

        setTranscendRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName && r.tier === newRecord.tier);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina, usedFromBonus: (r.usedFromBonus || 0) + usedFromBonus }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        // 티켓 차감 (기본 먼저, 기본이 0이면 보너스)
        setCharacterState(prev => {
            if (prev.baseTickets.transcend > 0) {
                return {
                    ...prev,
                    baseTickets: {
                        ...prev.baseTickets,
                        transcend: prev.baseTickets.transcend - 1
                    }
                };
            } else {
                return {
                    ...prev,
                    bonusTickets: {
                        ...prev.bonusTickets,
                        transcend: Math.max(0, (prev.bonusTickets.transcend || 0) - 1)
                    }
                };
            }
        });

        setShowDungeonModal(null);
    };

    // 초월 기록 삭제
    const handleDeleteTranscendRecord = (recordId: string) => {
        if (!canEdit) return;

        // 삭제되는 기록의 count 찾기
        const record = transcendRecords.find(r => r.id === recordId);
        const countToRestore = record?.count || 1;
        const usedFromBonus = record?.usedFromBonus || 0;
        const usedFromBase = countToRestore - usedFromBonus;

        setTranscendRecords(prev => prev.filter(r => r.id !== recordId));

        // 티켓 복구 (기본은 기본으로, 보너스는 보너스로)
        setCharacterState(prev => {
            const maxBase = MAX_TICKETS.transcend;
            const newBase = Math.min(maxBase, prev.baseTickets.transcend + usedFromBase);
            const newBonus = (prev.bonusTickets.transcend || 0) + usedFromBonus;
            return {
                ...prev,
                baseTickets: {
                    ...prev.baseTickets,
                    transcend: newBase
                },
                bonusTickets: {
                    ...prev.bonusTickets,
                    transcend: newBonus
                }
            };
        });
    };

    // 원정 기록 추가
    const handleAddExpeditionRecord = () => {
        if (!dungeonData || !canEdit) return;

        const category = dungeonData.expedition.categories.find(c => c.id === expeditionCategory);
        const boss = category?.bosses.find(b => b.id === expeditionBoss);
        if (!boss) return;

        // 잔여 횟수 확인 (기본 + 보너스)
        const baseRemaining = characterState.baseTickets.expedition;
        const bonusRemaining = characterState.bonusTickets.expedition || 0;
        const totalAvailable = baseRemaining + bonusRemaining;

        if (totalAvailable < 1) {
            alert('잔여 횟수가 부족합니다!');
            return;
        }

        const multiplier = expeditionDouble ? 2 : 1;

        // 충전권에서 사용했는지 추적 (기본 먼저 사용, 기본이 0이면 보너스)
        const usedFromBonus = baseRemaining > 0 ? 0 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            category: category?.name,
            count: 1,
            kina: (boss.kina || 0) * multiplier,
            usedFromBonus
        };

        setExpeditionRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName && r.category === newRecord.category);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina, usedFromBonus: (r.usedFromBonus || 0) + usedFromBonus }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        // 티켓 차감 (기본 먼저, 기본이 0이면 보너스)
        setCharacterState(prev => {
            if (prev.baseTickets.expedition > 0) {
                return {
                    ...prev,
                    baseTickets: {
                        ...prev.baseTickets,
                        expedition: prev.baseTickets.expedition - 1
                    }
                };
            } else {
                return {
                    ...prev,
                    bonusTickets: {
                        ...prev.bonusTickets,
                        expedition: Math.max(0, (prev.bonusTickets.expedition || 0) - 1)
                    }
                };
            }
        });

        setShowDungeonModal(null);
    };

    // 원정 기록 삭제
    const handleDeleteExpeditionRecord = (recordId: string) => {
        if (!canEdit) return;

        // 삭제되는 기록의 count 찾기
        const record = expeditionRecords.find(r => r.id === recordId);
        const countToRestore = record?.count || 1;
        const usedFromBonus = record?.usedFromBonus || 0;
        const usedFromBase = countToRestore - usedFromBonus;

        setExpeditionRecords(prev => prev.filter(r => r.id !== recordId));

        // 티켓 복구 (기본은 기본으로, 보너스는 보너스로)
        setCharacterState(prev => {
            const maxBase = MAX_TICKETS.expedition;
            const newBase = Math.min(maxBase, prev.baseTickets.expedition + usedFromBase);
            const newBonus = (prev.bonusTickets.expedition || 0) + usedFromBonus;
            return {
                ...prev,
                baseTickets: {
                    ...prev.baseTickets,
                    expedition: newBase
                },
                bonusTickets: {
                    ...prev.bonusTickets,
                    expedition: newBonus
                }
            };
        });
    };

    // 성역 기록 추가
    const handleAddSanctuaryRecord = () => {
        if (!dungeonData || !canEdit) return;

        const category = dungeonData.sanctuary.categories[0];
        const boss = category?.bosses.find(b => b.id === sanctuaryBoss);
        if (!boss) return;

        // 잔여 횟수 확인 (기본 + 보너스)
        const baseRemaining = characterState.baseTickets.sanctuary;
        const bonusRemaining = characterState.bonusTickets.sanctuary || 0;
        const totalAvailable = baseRemaining + bonusRemaining;

        if (totalAvailable < 1) {
            alert('잔여 횟수가 부족합니다!');
            return;
        }

        const multiplier = sanctuaryDouble ? 2 : 1;

        // 충전권에서 사용했는지 추적 (기본 먼저 사용, 기본이 0이면 보너스)
        const usedFromBonus = baseRemaining > 0 ? 0 : 1;

        const newRecord: DungeonRecord = {
            id: Date.now().toString(),
            bossName: boss.name,
            count: 1,
            kina: (boss.kina || 0) * multiplier,
            usedFromBonus
        };

        setSanctuaryRecords(prev => {
            const existing = prev.find(r => r.bossName === newRecord.bossName);
            if (existing) {
                return prev.map(r =>
                    r.id === existing.id
                        ? { ...r, count: r.count + 1, kina: r.kina + newRecord.kina, usedFromBonus: (r.usedFromBonus || 0) + usedFromBonus }
                        : r
                );
            }
            return [...prev, newRecord];
        });

        // 티켓 차감 (기본 먼저, 기본이 0이면 보너스)
        setCharacterState(prev => {
            if (prev.baseTickets.sanctuary > 0) {
                return {
                    ...prev,
                    baseTickets: {
                        ...prev.baseTickets,
                        sanctuary: prev.baseTickets.sanctuary - 1
                    }
                };
            } else {
                return {
                    ...prev,
                    bonusTickets: {
                        ...prev.bonusTickets,
                        sanctuary: Math.max(0, (prev.bonusTickets.sanctuary || 0) - 1)
                    }
                };
            }
        });

        setShowDungeonModal(null);
    };

    // 성역 기록 삭제
    const handleDeleteSanctuaryRecord = (recordId: string) => {
        if (!canEdit) return;

        // 삭제되는 기록의 count 찾기
        const record = sanctuaryRecords.find(r => r.id === recordId);
        const countToRestore = record?.count || 1;
        const usedFromBonus = record?.usedFromBonus || 0;
        const usedFromBase = countToRestore - usedFromBonus;

        setSanctuaryRecords(prev => prev.filter(r => r.id !== recordId));

        // 티켓 복구 (기본은 기본으로, 보너스는 보너스로)
        setCharacterState(prev => {
            const maxBase = MAX_TICKETS.sanctuary;
            const newBase = Math.min(maxBase, prev.baseTickets.sanctuary + usedFromBase);
            const newBonus = (prev.bonusTickets.sanctuary || 0) + usedFromBonus;
            return {
                ...prev,
                baseTickets: {
                    ...prev.baseTickets,
                    sanctuary: newBase
                },
                bonusTickets: {
                    ...prev.bonusTickets,
                    sanctuary: newBonus
                }
            };
        });
    };

    // 일일 컨텐츠 완료 횟수 증가 (보너스 티켓 차감 처리)
    const handleIncrementContent = async (contentType: string, ticketKey: string) => {
        const maxTicket = MAX_TICKETS[ticketKey as keyof typeof MAX_TICKETS] || 0;
        const currentCompletion = records.find(r => r.content_type === contentType)?.completion_count || 0;
        const bonusAvailable = characterState.bonusTickets[ticketKey as keyof typeof characterState.bonusTickets] || 0;

        // 기본 티켓이 남아있으면 그냥 증가
        if (currentCompletion < maxTicket) {
            await incrementCompletion(contentType);
            return;
        }

        // 기본 티켓 소진 후 보너스 티켓 사용
        if (bonusAvailable > 0) {
            await incrementCompletion(contentType);
            // 보너스 티켓 차감
            setCharacterState(prev => ({
                ...prev,
                bonusTickets: {
                    ...prev.bonusTickets,
                    [ticketKey]: Math.max(0, (prev.bonusTickets[ticketKey as keyof typeof prev.bonusTickets] || 0) - 1)
                }
            }));
        }
    };

    // 일일 컨텐츠 완료 횟수 감소 (보너스 티켓 복구 처리)
    const handleDecrementContent = async (contentType: string, ticketKey: string) => {
        const maxTicket = MAX_TICKETS[ticketKey as keyof typeof MAX_TICKETS] || 0;
        const currentCompletion = records.find(r => r.content_type === contentType)?.completion_count || 0;

        if (currentCompletion <= 0) return;

        // 기본 티켓 범위 내면 그냥 감소
        if (currentCompletion <= maxTicket) {
            await decrementCompletion(contentType);
            return;
        }

        // 보너스 티켓 사용 중이었으면 복구
        await decrementCompletion(contentType);
        setCharacterState(prev => ({
            ...prev,
            bonusTickets: {
                ...prev.bonusTickets,
                [ticketKey]: (prev.bonusTickets[ticketKey as keyof typeof prev.bonusTickets] || 0) + 1
            }
        }));
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

    // 캐릭터 검색 (PC 버전과 동일한 supabaseApi 사용)
    const handleSearch = async () => {
        const searchName = searchQuery.trim();
        if (searchName.length < 2) return;

        setIsSearching(true);
        try {
            // 서버 ID와 종족 필터 설정
            const serverId = selectedServer ? parseInt(selectedServer) : undefined;
            const raceFilter = selectedRace === 'ELYOS' ? 'elyos' : selectedRace === 'ASMODIANS' ? 'asmodian' : undefined;

            // 하이브리드 검색: 로컬 DB + 외부 API 동시 호출
            const [localRes, liveRes] = await Promise.allSettled([
                supabaseApi.searchLocalCharacter(searchName, serverId, raceFilter),
                supabaseApi.searchCharacter(searchName, serverId, raceFilter, 1)
            ]);

            // 결과 병합 및 중복 제거
            const combined: any[] = [];
            const seen = new Set<string>();

            const addResult = (c: any) => {
                const charId = c.characterId || c.character_id || c.id;
                if (!charId || seen.has(charId)) return;
                seen.add(charId);

                // HTML 태그 제거
                const cleanName = (c.name || '').replace(/<[^>]*>/g, '');
                // 프로필 이미지 URL 처리
                const rawImg = c.profileImageUrl || c.profile_image || c.profileImage || c.imageUrl || '';
                let profileImg = rawImg;
                if (rawImg.startsWith('/')) {
                    profileImg = `https://profileimg.plaync.com${rawImg}`;
                }
                // 종족 처리
                const raceValue = c.race === 1 ? '천족' : c.race === 2 ? '마족' :
                    c.race === 'Elyos' || c.race === '천족' ? '천족' :
                    c.race === 'Asmodian' || c.race === '마족' ? '마족' :
                    c.race_name || c.raceName || '';

                combined.push({
                    characterId: charId,
                    name: cleanName,
                    level: c.level || 0,
                    className: c.class_name || c.className || c.job || '',
                    serverName: c.serverName || c.server_name || c.server || SERVER_MAP[c.serverId || c.server_id] || '알 수 없음',
                    serverId: String(c.serverId || c.server_id || ''),
                    race: raceValue,
                    profileImageUrl: profileImg,
                    itemLevel: c.itemLevel || c.item_level || 0
                });
            };

            // 로컬 DB 결과 먼저 추가 (더 빠름)
            if (localRes.status === 'fulfilled') {
                localRes.value.forEach(addResult);
            }

            // 외부 API 결과 추가
            if (liveRes.status === 'fulfilled') {
                liveRes.value.list.forEach(addResult);
            }

            setSearchResults(combined.slice(0, 10));
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

    // 이용권 충전 핸들러 (보너스 티켓 추가)
    const handleTicketCharge = (charges: Record<string, number>) => {
        if (!selectedCharacterId) return;

        // 슈고페스타는 별도 처리 (shugoTickets 사용)
        if (charges['shugo_festa'] > 0) {
            setWeeklyContent(prev => ({
                ...prev,
                shugoTickets: {
                    ...prev.shugoTickets,
                    bonus: prev.shugoTickets.bonus + charges['shugo_festa']
                }
            }));
            // 주간 컨텐츠 저장 트리거
            debouncedSaveWeeklyContent();
        }

        // 슈고페스타 제외한 나머지 보너스 티켓 업데이트
        const otherCharges = { ...charges };
        delete otherCharges['shugo_festa'];

        if (Object.keys(otherCharges).some(key => otherCharges[key] > 0)) {
            setCharacterState(prev => {
                const newBonusTickets = { ...prev.bonusTickets };
                Object.keys(otherCharges).forEach(key => {
                    if (otherCharges[key] > 0) {
                        newBonusTickets[key] = (newBonusTickets[key] || 0) + otherCharges[key];
                    }
                });
                return {
                    ...prev,
                    bonusTickets: newBonusTickets
                };
            });

            // DB에 저장
            fetch('/api/ledger/character-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({
                    characterId: selectedCharacterId,
                    bonusTickets: Object.keys(otherCharges).reduce((acc, key) => {
                        if (otherCharges[key] > 0) {
                            acc[key] = (characterState.bonusTickets[key] || 0) + otherCharges[key];
                        }
                        return acc;
                    }, { ...characterState.bonusTickets })
                })
            }).catch(err => console.error('[Mobile] 보너스 티켓 저장 실패:', err));
        }
    };

    // 초기설정 동기화 핸들러
    const handleInitialSync = async (settings: {
        odTimeEnergy: number;
        odTicketEnergy: number;
        tickets: Record<string, number>;
    }) => {
        if (!selectedCharacterId) {
            console.error('[Mobile] 캐릭터가 선택되지 않음');
            return;
        }

        const newBaseTickets = {
            ...characterState.baseTickets,
            ...settings.tickets
        };

        const newBonusTickets = {
            transcend: 0,
            expedition: 0,
            sanctuary: 0,
            daily_dungeon: 0,
            awakening: 0,
            nightmare: 0,
            dimension: 0,
            subjugation: 0
        };

        // API로 저장
        try {
            const res = await fetch('/api/ledger/character-state', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify({
                    characterId: selectedCharacterId,
                    baseTickets: newBaseTickets,
                    bonusTickets: newBonusTickets,
                    odEnergy: {
                        timeEnergy: settings.odTimeEnergy,
                        ticketEnergy: settings.odTicketEnergy,
                        lastChargeTime: new Date().toISOString()
                    }
                })
            });

            if (!res.ok) {
                throw new Error('초기설정 저장 실패');
            }

            // 상태 업데이트
            setCharacterState(prev => ({
                ...prev,
                baseTickets: newBaseTickets,
                bonusTickets: newBonusTickets
            }));

            console.log('[Mobile] 초기설정 동기화 완료');
        } catch (error) {
            console.error('[Mobile] 초기설정 동기화 실패:', error);
            throw error;
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
                                >
                                    {/* 캐릭터 헤더 - 클릭시 진행현황 펼치기/접기 */}
                                    <div className={styles.charHeader} onClick={(e) => toggleProgressExpand(character.id, e)}>
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
                                            <div className={styles.charIncome}>{formatMoney(dashboardData[character.id]?.todayIncome || 0)}</div>
                                            <div className={styles.charIncomeWeekly}>{formatMoney(dashboardData[character.id]?.weeklyIncome || 0)}</div>
                                        </div>
                                        {/* 펼침/접힘 아이콘 */}
                                        <div className={styles.expandIcon}>
                                            {expandedProgressIds.has(character.id) ? '▲' : '▼'}
                                        </div>
                                    </div>

                                    {/* 진행 현황 - 카드 클릭시 펼치기/접기 */}
                                    {(() => {
                                        const progress = getCharacterProgress(character.id);
                                        if (progress.mission.length === 0 && progress.dungeon.length === 0 && progress.daily.length === 0) return null;
                                        const isExpanded = expandedProgressIds.has(character.id);
                                        return (
                                            <div className={styles.progressSection}>
                                                {/* 펼쳐진 상태일 때만 컨텐츠 표시 */}
                                                {isExpanded && (
                                                    <>
                                                        {/* 섹션1: 미션/지령서 */}
                                                        <div className={styles.progressLabel}>미션/지령서</div>
                                                        <div className={styles.chipContainerGrid}>
                                                            {progress.mission.map(content => {
                                                                const isComplete = content.current <= 0 && (content.bonus || 0) <= 0;
                                                                return (
                                                                    <div
                                                                        key={content.id}
                                                                        className={`${styles.statusChipCompact} ${getChipColorClass(content.color)} ${isComplete ? styles.statusChipComplete : ''}`}
                                                                    >
                                                                        <span className={styles.chipTxt}>{content.name}</span>
                                                                        <span className={styles.chipVal}>
                                                                            {content.current}/{content.max}
                                                                            {content.bonus > 0 && <span className={styles.chipBonus}>(+{content.bonus})</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* 섹션2: 던전 컨텐츠 */}
                                                        <div className={styles.progressLabel}>던전 컨텐츠</div>
                                                        <div className={styles.chipContainerGrid}>
                                                            {progress.dungeon.map(content => {
                                                                const isComplete = content.current <= 0 && (content.bonus || 0) <= 0;
                                                                return (
                                                                    <div
                                                                        key={content.id}
                                                                        className={`${styles.statusChipCompact} ${getChipColorClass(content.color)} ${isComplete ? styles.statusChipComplete : ''}`}
                                                                    >
                                                                        <span className={styles.chipTxt}>{content.name}</span>
                                                                        <span className={styles.chipVal}>
                                                                            {content.current}/{content.max}
                                                                            {content.bonus > 0 && <span className={styles.chipBonus}>(+{content.bonus})</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* 섹션3: 일일 컨텐츠 */}
                                                        <div className={styles.progressLabel}>일일 컨텐츠</div>
                                                        <div className={styles.chipContainerGrid}>
                                                            {progress.daily.map(content => {
                                                                const isComplete = content.current <= 0 && (content.bonus || 0) <= 0;
                                                                return (
                                                                    <div
                                                                        key={content.id}
                                                                        className={`${styles.statusChipCompact} ${getChipColorClass(content.color)} ${isComplete ? styles.statusChipComplete : ''}`}
                                                                    >
                                                                        <span className={styles.chipTxt}>{content.name}</span>
                                                                        <span className={styles.chipVal}>
                                                                            {content.current}/{content.max}
                                                                            {content.bonus > 0 && <span className={styles.chipBonus}>(+{content.bonus})</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
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
                                    {/* 설정 버튼 */}
                                    <button
                                        className={styles.settingsBtn}
                                        onClick={() => setShowChargePopup(true)}
                                        title="초기설정 및 이용권 충전"
                                    >
                                        ⚙️
                                    </button>
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
                                    <span className={styles.value}>{formatMoney(dashboardData[selectedCharacter.id]?.todayIncome || 0)}</span>
                                </div>
                                <div className={styles.incomeStatDetail}>
                                    <span className={styles.label}>주간수입</span>
                                    <span className={styles.value}>{formatMoney(dashboardData[selectedCharacter.id]?.weeklyIncome || 0)}</span>
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
                                    {characterState.odEnergy.timeEnergy}
                                    {characterState.odEnergy.ticketEnergy > 0 && (
                                        <span className={styles.odValueBonus}>(+{characterState.odEnergy.ticketEnergy})</span>
                                    )}
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
                                            {weeklyContent.missionCount}/5
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementMission();
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementMission();
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < weeklyContent.missionCount ? styles.filled : ''}`}
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
                                            {weeklyContent.weeklyOrderCount}/12
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementWeeklyOrder();
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementWeeklyOrder();
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(12)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < weeklyContent.weeklyOrderCount ? styles.filled : ''}`}
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
                                            {weeklyContent.abyssOrderCount}/20
                                        </span>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                incrementAbyssOrder();
                                            }}
                                        >+</button>
                                        <button
                                            className={styles.btnStep}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                decrementAbyssOrder();
                                            }}
                                        >-</button>
                                    </div>
                                </div>
                                <div className={styles.wmProgressTrack}>
                                    {[...Array(10)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`${styles.wmBlock} ${i < Math.min(10, weeklyContent.abyssOrderCount) ? styles.filled : ''}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            {/* 슈고페스타 & 어비스 회랑 */}
                            <div className={styles.dualCardGrid}>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardLabel}>슈고 페스타</div>
                                    <div className={styles.miniCardTimer}>{formatTimeRemaining(chargeTimers['charge3h'])}</div>
                                    <div className={styles.miniCardValue}>
                                        {weeklyContent.shugoTickets.base + weeklyContent.shugoTickets.bonus}
                                        <span className={styles.miniCardMax}>/ 14</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => decrementShugo()}
                                        >-</button>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => incrementShugo()}
                                        >+</button>
                                    </div>
                                </div>
                                <div className={styles.miniCard}>
                                    <div className={styles.miniCardLabel}>어비스 회랑</div>
                                    <div className={styles.miniCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</div>
                                    <div className={styles.miniCardValue}>
                                        {Math.max(0, 3 - (records.find(r => r.content_type === 'abyss_corridor')?.completion_count || 0))}
                                        <span className={styles.miniCardMax}>/ 3</span>
                                    </div>
                                    <div className={styles.miniCardControls}>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => decrementCompletion('abyss_corridor')}
                                        >+</button>
                                        <button
                                            className={styles.btnStepMini}
                                            onClick={() => incrementCompletion('abyss_corridor')}
                                        >-</button>
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
                                            {characterState.baseTickets.transcend}/
                                            {MAX_TICKETS.transcend}
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
                                            {characterState.baseTickets.expedition}/
                                            {MAX_TICKETS.expedition}
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
                                            {characterState.baseTickets.sanctuary}/
                                            {MAX_TICKETS.sanctuary}
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
                                    <span className={styles.simpleCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, MAX_TICKETS.daily_dungeon - (records.find(r => r.content_type === 'daily_dungeon')?.completion_count || 0))}/
                                        {MAX_TICKETS.daily_dungeon}
                                        {(characterState.bonusTickets.daily_dungeon || 0) > 0 && (
                                            <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.daily_dungeon})</span>
                                        )}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => handleIncrementContent('daily_dungeon', 'daily_dungeon')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => handleDecrementContent('daily_dungeon', 'daily_dungeon')}>-</button>
                                </div>
                            </div>

                            {/* 각성전 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>각성전</span>
                                    <span className={styles.simpleCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, MAX_TICKETS.awakening - (records.find(r => r.content_type === 'awakening_battle')?.completion_count || 0))}/
                                        {MAX_TICKETS.awakening}
                                        {(characterState.bonusTickets.awakening || 0) > 0 && (
                                            <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.awakening})</span>
                                        )}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => handleIncrementContent('awakening_battle', 'awakening')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => handleDecrementContent('awakening_battle', 'awakening')}>-</button>
                                </div>
                            </div>

                            {/* 악몽 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>악몽</span>
                                    <span className={styles.simpleCardTimer}>{formatTimeRemaining(chargeTimers['daily'])}</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, MAX_TICKETS.nightmare - (records.find(r => r.content_type === 'nightmare')?.completion_count || 0))}/
                                        {MAX_TICKETS.nightmare}
                                        {(characterState.bonusTickets.nightmare || 0) > 0 && (
                                            <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.nightmare})</span>
                                        )}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => handleIncrementContent('nightmare', 'nightmare')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => handleDecrementContent('nightmare', 'nightmare')}>-</button>
                                </div>
                            </div>

                            {/* 차원침공 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>차원침공</span>
                                    <span className={styles.simpleCardTimer}>{formatTimeRemaining(chargeTimers['24h'])}</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, MAX_TICKETS.dimension - (records.find(r => r.content_type === 'dimension_invasion')?.completion_count || 0))}/
                                        {MAX_TICKETS.dimension}
                                        {(characterState.bonusTickets.dimension || 0) > 0 && (
                                            <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.dimension})</span>
                                        )}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => handleIncrementContent('dimension_invasion', 'dimension')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => handleDecrementContent('dimension_invasion', 'dimension')}>-</button>
                                </div>
                            </div>

                            {/* 토벌전 - 잔여횟수/최대횟수 (PC와 동일) */}
                            <div className={styles.simpleCard}>
                                <div className={styles.simpleCardLeft}>
                                    <div className={styles.simpleCardBar}></div>
                                    <span className={styles.simpleCardTitle}>토벌전</span>
                                    <span className={styles.simpleCardTimer}>{formatTimeRemaining(chargeTimers['weekly'])}</span>
                                </div>
                                <div className={styles.simpleCardRight}>
                                    <span className={styles.simpleCardCount}>
                                        {Math.max(0, MAX_TICKETS.subjugation - (records.find(r => r.content_type === 'subjugation')?.completion_count || 0))}/
                                        {MAX_TICKETS.subjugation}
                                        {(characterState.bonusTickets.subjugation || 0) > 0 && (
                                            <span className={styles.dungeonCardBonus}>(+{characterState.bonusTickets.subjugation})</span>
                                        )}
                                    </span>
                                    <button className={styles.btnStepSmall} onClick={() => handleIncrementContent('subjugation', 'subjugation')}>+</button>
                                    <button className={styles.btnStepSmall} onClick={() => handleDecrementContent('subjugation', 'subjugation')}>-</button>
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
                <div className={styles.modalOverlay} onClick={() => {
                    setShowAddModal(false);
                    setSelectedRace('');
                    setSelectedServer('');
                    setSearchQuery('');
                    setSearchResults([]);
                }}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>캐릭터 추가</h3>
                            <button className={styles.modalClose} onClick={() => {
                                setShowAddModal(false);
                                setSelectedRace('');
                                setSelectedServer('');
                                setSearchQuery('');
                                setSearchResults([]);
                            }}>×</button>
                        </div>

                        <div className={styles.searchSection}>
                            {/* 종족 선택 */}
                            <div className={styles.raceSelect}>
                                <button
                                    className={`${styles.raceBtn} ${selectedRace === 'ELYOS' ? styles.raceBtnElyos : ''}`}
                                    onClick={() => { setSelectedRace('ELYOS'); setSelectedServer(''); setSearchResults([]); }}
                                >
                                    천족
                                </button>
                                <button
                                    className={`${styles.raceBtn} ${selectedRace === 'ASMODIANS' ? styles.raceBtnAsmodian : ''}`}
                                    onClick={() => { setSelectedRace('ASMODIANS'); setSelectedServer(''); setSearchResults([]); }}
                                >
                                    마족
                                </button>
                            </div>

                            {/* 서버 선택 (종족 선택 후 표시) */}
                            {selectedRace && (
                                <div className={styles.serverSelectGrid}>
                                    {filteredServers.map((server) => (
                                        <button
                                            key={server.id}
                                            className={`${styles.serverBtnSmall} ${selectedServer === server.id ? (selectedRace === 'ELYOS' ? styles.serverBtnElyos : styles.serverBtnAsmodian) : ''}`}
                                            onClick={() => setSelectedServer(server.id)}
                                        >
                                            {server.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className={styles.searchInputWrapper}>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="캐릭터명 (2글자 이상)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    className={styles.searchBtn}
                                    onClick={handleSearch}
                                    disabled={isSearching || searchQuery.trim().length < 2}
                                >
                                    {isSearching ? '...' : '검색'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.searchResults}>
                            {searchResults.length === 0 ? (
                                <div className={styles.noResults}>
                                    {searchQuery.length >= 2 ? '검색 결과가 없습니다' : '종족과 서버를 선택 후 캐릭터명을 검색하세요'}
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
                                                {result.race && (
                                                    <span className={`${styles.raceBadge} ${result.race === '천족' ? styles.raceBadgeElyos : styles.raceBadgeAsmodian}`}>
                                                        {result.race}
                                                    </span>
                                                )}
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

            {/* 초기설정 & 이용권 충전 팝업 */}
            <TicketChargePopup
                isOpen={showChargePopup}
                onClose={() => setShowChargePopup(false)}
                onCharge={handleTicketCharge}
                currentTickets={{
                    transcend: { base: characterState.baseTickets.transcend, bonus: characterState.bonusTickets.transcend || 0 },
                    expedition: { base: characterState.baseTickets.expedition, bonus: characterState.bonusTickets.expedition || 0 },
                    sanctuary: { base: characterState.baseTickets.sanctuary, bonus: characterState.bonusTickets.sanctuary || 0 },
                    daily_dungeon: { base: characterState.baseTickets.daily_dungeon, bonus: characterState.bonusTickets.daily_dungeon || 0 },
                    awakening: { base: characterState.baseTickets.awakening, bonus: characterState.bonusTickets.awakening || 0 },
                    nightmare: { base: characterState.baseTickets.nightmare, bonus: characterState.bonusTickets.nightmare || 0 },
                    dimension: { base: characterState.baseTickets.dimension, bonus: characterState.bonusTickets.dimension || 0 },
                    subjugation: { base: characterState.baseTickets.subjugation, bonus: characterState.bonusTickets.subjugation || 0 }
                }}
                odEnergy={{
                    timeEnergy: characterState.odEnergy.timeEnergy,
                    ticketEnergy: characterState.odEnergy.ticketEnergy
                }}
                onInitialSync={handleInitialSync}
            />

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
