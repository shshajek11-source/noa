'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, ImagePlus, Loader2, Check, X, Edit3, Star, StarOff, Plus, Trash2, ChevronDown, Upload, Eye, Clock, Bug, TrendingUp, TrendingDown, HelpCircle, AlertTriangle } from 'lucide-react'
import { supabaseApi, CharacterSearchResult, SERVER_NAME_TO_ID } from '@/lib/supabaseApi'
import styles from './stat-update.module.css'

// 천족 서버 목록
const ELYOS_SERVERS = [
  '시엘', '네자칸', '바이젤', '카이시넬', '유스티엘', '아리엘', '프레기온',
  '메스람타에다', '히타니에', '나니아', '타하바타', '루터스', '페르노스',
  '다미누', '카사카', '바카르마', '챈가룽', '코치룽', '이슈타르', '티아마트', '포에타'
]

// 마족 서버 목록
const ASMODIAN_SERVERS = [
  '지켈', '트리니엘', '루미엘', '마르쿠탄', '아스펠', '에레슈키갈', '브리트라',
  '네몬', '하달', '루드라', '울고른', '무닌', '오다르', '젠카카', '크로메데',
  '콰이링', '바바룽', '파프니르', '인드나흐', '이스할겐'
]

// 4개 이미지 슬롯 정의
const STAT_SLOTS = [
  { id: 'basic', label: '주요능력치', description: '공격력, 방어력, 명중 등' },
  { id: 'combat', label: '전투/판정', description: '관통, 피해 증폭, 다단 히트 등' },
  { id: 'pvpPve', label: 'PVP/PVE', description: 'PVP, PVE, 보스 피해 등' },
  { id: 'special', label: '특수/자원', description: '행동력, 비행력, 회복 등' }
] as const

type SlotId = typeof STAT_SLOTS[number]['id']

// 슬롯별 예상 스탯 목록 (이미지에 있어야 하는 스탯들)
const EXPECTED_STATS_BY_SLOT: Record<SlotId, string[]> = {
  basic: [
    '공격력', '방어력',
    '명중', '회피',
    '치명타', '치명타 저항',
    '생명력', '정신력',
    '전투 속도', '이동 속도'
  ],
  combat: [
    // 전투
    '관통', '봉혼석 추가 피해',
    '치명타 공격력', '치명타 방어력',
    '후방 공격력', '후방 방어력',
    '피해 증폭', '피해 내성',
    '무기 피해 증폭', '무기 피해 내성',
    '치명타 피해 증폭', '치명타 피해 내성',
    '후방 피해 증폭', '후방 피해 내성',
    // 판정
    '다단 히트 적중', '다단 히트 저항',
    '후방 치명타', '후방 치명타 저항',
    '막기 관통', '막기',
    '철벽 관통', '철벽',
    '재생 관통', '재생',
    '완벽', '완벽 저항',
    '강타', '강타 저항'
  ],
  pvpPve: [
    // PVP
    'PVP 공격력', 'PVP 방어력',
    'PVP 피해 증폭', 'PVP 피해 내성',
    'PVP 명중', 'PVP 회피',
    'PVP 치명타', 'PVP 치명타 저항',
    // PVE
    'PVE 공격력', 'PVE 방어력',
    'PVE 명중', 'PVE 회피',
    'PVE 피해 증폭', 'PVE 피해 내성',
    // 보스
    '보스 공격력', '보스 방어력',
    '보스 피해 증폭', '보스 피해 내성'
  ],
  special: [
    // 특수
    '질주 속도', '비행 속도',
    '탑승물 지상 이동 속도', '탑승물 질주 행동력 소모',
    '치유 증폭', '받는 치유량',
    '재사용 시간', '적대치 획득량',
    // 자원
    '행동력', '비행력',
    '전투 생명력 자연 회복', '비전투 생명력 자연 회복',
    '생명력 물약 회복', '생명력 물약 회복 증가',
    '전투 정신력 자연 회복', '비전투 정신력 자연 회복',
    '정신력 소모량', '정신력 획득 증가',
    '전투 행동력 자연 회복', '비전투 행동력 자연 회복',
    '전투 비행력 자연 회복', '비전투 비행력 자연 회복'
  ]
}

// 인식된 스탯 타입
interface RecognizedStat {
  name: string
  value: string
  isPercentage: boolean
  isRecognized: boolean  // OCR로 인식되었는지 여부 (false면 빨간색 표시)
}

// 슬롯 데이터 타입
interface SlotData {
  image: string | null
  stats: RecognizedStat[]
  isProcessing: boolean
  updatedAt: string | null
  rawText?: string  // OCR 원본 텍스트 (디버그용)
  processingProgress?: string  // 멀티스케일 OCR 진행 상태
  multiScaleResults?: MultiScaleOcrResult[]  // 각 스케일별 OCR 결과 (디버그용)
}

// 멀티 스케일 OCR 결과 타입
interface MultiScaleOcrResult {
  scale: number
  stats: RecognizedStat[]
  rawText: string
}

// 캐릭터 타입
interface CharacterInfo {
  characterId: string
  characterName: string
  serverName: string
  serverId: number
  className: string
  level: number
  raceName: string
}

// 즐겨찾기 캐릭터 타입
interface FavoriteCharacter extends CharacterInfo {
  sortOrder?: number
  createdAt?: string
}

// 알려진 스탯명 리스트
const KNOWN_STAT_NAMES = [
  '공격력', '방어력', '명중', '회피', '치명타', '치명타 저항',
  '생명력', '정신력', '전투 속도', '이동 속도',
  '관통', '봉혼석 추가 피해', '치명타 공격력', '치명타 방어력',
  '후방 공격력', '후방 방어력', '피해 증폭', '피해 내성',
  '무기 피해 증폭', '무기 피해 내성', '치명타 피해 증폭', '치명타 피해 내성',
  '후방 피해 증폭', '후방 피해 내성',
  '다단 히트 적중', '다단 히트 저항', '후방 치명타', '후방 치명타 저항',
  '막기 관통', '막기', '철벽 관통', '철벽', '재생 관통', '재생',
  '완벽', '완벽 저항', '강타', '강타 저항',
  'PVP 공격력', 'PVP 방어력', 'PVP 피해 증폭', 'PVP 피해 내성',
  'PVP 명중', 'PVP 회피', 'PVP 치명타', 'PVP 치명타 저항',
  'PVE 공격력', 'PVE 방어력', 'PVE 피해 증폭', 'PVE 피해 내성',
  'PVE 명중', 'PVE 회피',
  '보스 공격력', '보스 방어력', '보스 피해 증폭', '보스 피해 내성',
  '질주 속도', '비행 속도', '탑승물 지상 이동 속도', '탑승물 질주 행동력 소모',
  '치유 증폭', '받는 치유량', '재사용 시간', '적대치 획득량',
  '행동력', '비행력',
  '전투 생명력 자연 회복', '비전투 생명력 자연 회복', '생명력 물약 회복 증가', '생명력 물약 회복',
  '전투 정신력 자연 회복', '비전투 정신력 자연 회복', '정신력 소모량', '정신력 획득 증가',
  '전투 행동력 자연 회복', '비전투 행동력 자연 회복',
  '전투 비행력 자연 회복', '비전투 비행력 자연 회복'
]

// OCR 오인식 방지를 위한 별칭 매핑
const STAT_ALIASES: Record<string, string[]> = {
  '명중': ['명증', '멍중', '영중', '몀중', '명 중', '띵중', '명:중', '[ [그', '[[그', '[ [ 그', '[- [그', '[-[그', '[―[그'],
  '치명타': ['치면타', '치멍타', '차명타', '치영타', '치 1 명타', '치:명타', '치명', 'XIE', 'xie'],
  '공격력': ['공걱력', '공격럭'],
  '방어력': ['방어럭', '방이력'],
  '회피': ['회 피', '화피', '회:피'],
  '생명력': ['생명럭', '상명력'],
  '정신력': ['정신럭', '점신력'],
  '전투 속도': ['전투속도', '전투 소도', '전투 쇽도'],
  '이동 속도': ['이동속도', '이동 소도'],
  '철벽': ['HY', 'hy', 'H Y', 'h y', '철 벽', 'Hy', 'hY'],
  'PVP 회피': ['pvp 2m', 'pvp 2 m', 'pvp2m'],
  '봉혼석 추가 피해': ['BEA', 'bea', 'BEA 추가 피해', 'bea 추가 피해', 'BEA추가피해'],
  '탑승물 질주 행동력 소모': ['탑승물 질주 행동력 소', '탑승물 질주 행동력 소...'],
  '행동력': ['행통력', '행 동 력', '행 통 력'],
  '전투 행동력 자연 회복': ['전투 행통력 자연 회복', '전투 행통력 자연회복'],
  '비전투 행동력 자연 회복': ['비전투 행통력 자연 회복', '비전투 행통력 자연회복'],
  // 강타 오인식 (숫자/기호로 잘못 인식되는 경우)
  '강타': ['[2131', '[2137', '[213', '강 타', '2131', '2137', '감타', '강터'],
  '강타 저항': ['강타저항', '강타 저향', '강타저향'],
  '완벽 저항': ['완벽저항', '완벽 저향', '완벽저향'],
  '막기 관통': ['막기관통', '막기 관퉁'],
  '재생 관통': ['재생관통', '재생 관퉁', '재생관퉁'],
  '철벽 관통': ['철벽관통', '철벽 관퉁'],
  // 공백 없이 붙어서 인식되는 경우
  '후방 방어력': ['후방방어력'],
  '후방 치명타 저항': ['후방치명타저항', '후방 치명타저항', '후방치명타 저항'],
  'PVE 피해 내성': ['PVE 피해내성', 'PVE피해내성', 'PVE피해 내성'],
  // PVP/PVE/보스 오인식
  'PVP 치명타 저항': ['PVP X|HEF XE', 'PVP XIHEF XE', 'PVP X|HEFXE', 'PVPX|HEFXE', 'PVP치명타저항'],
  'PVP 방어력': ['PVP 방어럭', 'PVP방어력'],
  'PVE 방어력': ['PVE ¥0jY', 'PVE¥0jY', 'PVE 방어럭', 'PVE방어력'],
  'PVE 회피': ['PVE 8a', 'PVE8a', 'PVE 8A', 'PVE8A', 'PVE 20|', 'PVE20|', 'PVE 2이', 'PVE2이'],
  '보스 방어력': ['보스 방어럭', '보스방어력'],
  '보스 피해 내성': ['2A 피해 내성', '2A피해내성', '2A 피해내성', '보스피해내성', '보스 피해내성']
}

// device_id 가져오기/생성
function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

export default function StatUpdatePage() {
  // 캐릭터 선택 UI 접힘 상태
  const [isCharacterSectionCollapsed, setIsCharacterSectionCollapsed] = useState(false)

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'favorites' | 'search'>('favorites')

  // 검색 상태
  const [race, setRace] = useState<'elyos' | 'asmodian' | null>(null)
  const [serverName, setServerName] = useState<string>('')
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CharacterInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 즐겨찾기 상태
  const [favorites, setFavorites] = useState<FavoriteCharacter[]>([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true)

  // 선택된 캐릭터
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterInfo | null>(null)

  // 기존 저장된 OCR 스탯
  const [savedOcrStats, setSavedOcrStats] = useState<RecognizedStat[] | null>(null)
  const [isLoadingSavedStats, setIsLoadingSavedStats] = useState(false)

  // 슬롯 데이터
  const [slots, setSlots] = useState<Record<SlotId, SlotData>>({
    basic: { image: null, stats: [], isProcessing: false, updatedAt: null },
    combat: { image: null, stats: [], isProcessing: false, updatedAt: null },
    pvpPve: { image: null, stats: [], isProcessing: false, updatedAt: null },
    special: { image: null, stats: [], isProcessing: false, updatedAt: null }
  })

  // 활성 슬롯 (붙여넣기 대상)
  const [activeSlot, setActiveSlot] = useState<SlotId | null>(null)

  // 검토 모달 상태
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [editingStatIndex, setEditingStatIndex] = useState<{ slotId: SlotId, index: number } | null>(null)
  const [showReviewDebug, setShowReviewDebug] = useState(false)  // 검토 모달 디버그
  const [showMultiScaleDebug, setShowMultiScaleDebug] = useState<SlotId | null>(null)  // 멀티스케일 결과 보기

  // 기존 스탯 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStats, setEditingStats] = useState<RecognizedStat[]>([])
  const [editingStatIdx, setEditingStatIdx] = useState<number | null>(null)

  // 저장 상태
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 디버그 상태
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [deviceIdDisplay, setDeviceIdDisplay] = useState<string>('없음')

  // 사용 가이드 모달 상태
  const [showGuide, setShowGuide] = useState(false)

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // 값 비교 함수: 숫자로 변환하여 비교
  const compareValues = (newValue: string, oldValue: string): 'up' | 'down' | 'same' | 'new' => {
    if (!oldValue || oldValue.trim() === '') return 'new'
    if (!newValue || newValue.trim() === '') return 'same'

    // 숫자만 추출 (콤마, %, 공백 제거)
    const parseNum = (v: string): number => {
      const cleaned = v.replace(/[,%\s]/g, '')
      return parseFloat(cleaned) || 0
    }

    const newNum = parseNum(newValue)
    const oldNum = parseNum(oldValue)

    if (newNum > oldNum) return 'up'
    if (newNum < oldNum) return 'down'
    return 'same'
  }

  // 저장된 스탯에서 특정 스탯의 값 찾기
  const getSavedStatValue = (statName: string): string => {
    if (!savedOcrStats) return ''
    const found = savedOcrStats.find(s => s.name === statName)
    return found?.value || ''
  }

  const fileInputRefs = useRef<Record<SlotId, HTMLInputElement | null>>({
    basic: null, combat: null, pvpPve: null, special: null
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<HTMLIFrameElement>(null)
  const [isWorkerReady, setIsWorkerReady] = useState(false)

  // OCR 요청 큐 시스템 (순차 처리)
  const ocrQueueRef = useRef<{ slotId: SlotId; image: string }[]>([])
  const isOcrProcessingRef = useRef(false)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)  // 큐 상태 표시

  // 클라이언트 마운트 후 device_id 표시
  useEffect(() => {
    setDeviceIdDisplay(getDeviceId() || '없음')
  }, [])

  // 즐겨찾기 로드
  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setIsLoadingFavorites(true)
    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/favorite-characters', {
        headers: { 'X-Device-ID': deviceId }
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data.favorites || [])
      }
    } catch (err) {
      console.error('Failed to load favorites:', err)
    } finally {
      setIsLoadingFavorites(false)
    }
  }

  // 즐겨찾기 추가
  const addToFavorites = async (char: CharacterInfo) => {
    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/favorite-characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId
        },
        body: JSON.stringify({
          characterId: char.characterId,
          serverId: char.serverId,
          serverName: char.serverName,
          characterName: char.characterName,
          className: char.className,
          raceName: char.raceName,
          level: char.level
        })
      })
      if (res.ok) {
        loadFavorites()
      }
    } catch (err) {
      console.error('Failed to add favorite:', err)
    }
  }

  // 즐겨찾기 삭제
  const removeFromFavorites = async (characterId: string) => {
    try {
      const deviceId = getDeviceId()
      const res = await fetch(`/api/favorite-characters?characterId=${encodeURIComponent(characterId)}`, {
        method: 'DELETE',
        headers: { 'X-Device-ID': deviceId }
      })
      if (res.ok) {
        loadFavorites()
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    }
  }

  // 즐겨찾기 여부 확인
  const isFavorite = (characterId: string) => {
    return favorites.some(f => f.characterId === characterId)
  }

  // OCR 워커 준비 상태 확인
  useEffect(() => {
    const handleWorkerMessage = (event: MessageEvent) => {
      const { type } = event.data || {}
      if (type === 'ready') {
        setIsWorkerReady(true)
      }
    }

    window.addEventListener('message', handleWorkerMessage)

    const checkWorker = setInterval(() => {
      if (workerRef.current?.contentWindow) {
        workerRef.current.contentWindow.postMessage({ type: 'ping' }, '*')
      }
    }, 500)

    const fallbackTimer = setTimeout(() => {
      setIsWorkerReady(true)
    }, 3000)

    return () => {
      window.removeEventListener('message', handleWorkerMessage)
      clearInterval(checkWorker)
      clearTimeout(fallbackTimer)
    }
  }, [])

  // 클립보드 붙여넣기 핸들러
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (!selectedCharacter || !activeSlot) return

    const items = e.clipboardData?.items
    if (!items) return

    const itemsArray = Array.from(items)
    for (const item of itemsArray) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          processImageFile(file, activeSlot)
        }
        break
      }
    }
  }, [selectedCharacter, activeSlot])

  // 클립보드 이벤트 등록
  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  // 자동 검색 (디바운스 150ms)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 1) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      handleSearchAuto()
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, race, serverName])

  // 캐릭터 검색 (자동 검색용)
  const handleSearchAuto = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      const serverId = serverName ? SERVER_NAME_TO_ID[serverName] : undefined
      const raceFilter = race || undefined

      const [localResults, apiResponse] = await Promise.all([
        supabaseApi.searchLocalCharacter(searchQuery, serverId, raceFilter).catch(() => [] as CharacterSearchResult[]),
        supabaseApi.searchCharacter(searchQuery, serverId, raceFilter, 1)
      ])

      const apiResults = apiResponse.list || []

      const seen = new Set<string>()
      const merged: CharacterInfo[] = []

      const addResult = (r: CharacterSearchResult) => {
        const key = r.characterId || `${r.server_id || r.serverId}_${r.name}`
        if (seen.has(key)) return
        seen.add(key)

        if (raceFilter) {
          const charRace = (r.race || '').toLowerCase()
          const isElyos = charRace === 'elyos' || charRace === '천족'
          const isAsmodian = charRace === 'asmodian' || charRace === '마족'
          if (raceFilter === 'elyos' && !isElyos) return
          if (raceFilter === 'asmodian' && !isAsmodian) return
        }

        merged.push({
          characterId: r.characterId,
          characterName: r.name.replace(/<\/?[^>]+(>|$)/g, ''),
          serverName: r.server,
          serverId: r.server_id || r.serverId || 0,
          className: r.className || (r as any).class || '',
          level: r.level || 0,
          raceName: r.race || ''
        })
      }

      localResults.forEach(addResult)
      apiResults.forEach(addResult)

      setSearchResults(merged)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.'
      setError(errMsg)
    } finally {
      setIsSearching(false)
    }
  }

  // 캐릭터 검색 (버튼 클릭용 - 레거시)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchResults([])
    setError(null)

    try {
      const serverId = serverName ? SERVER_NAME_TO_ID[serverName] : undefined
      const raceFilter = race || undefined

      const [localResults, apiResponse] = await Promise.all([
        supabaseApi.searchLocalCharacter(searchQuery, serverId, raceFilter).catch(() => [] as CharacterSearchResult[]),
        supabaseApi.searchCharacter(searchQuery, serverId, raceFilter, 1)
      ])

      const apiResults = apiResponse.list || []

      const seen = new Set<string>()
      const merged: CharacterInfo[] = []

      const addResult = (r: CharacterSearchResult) => {
        const key = r.characterId || `${r.server_id || r.serverId}_${r.name}`
        if (seen.has(key)) return
        seen.add(key)

        if (raceFilter) {
          const charRace = (r.race || '').toLowerCase()
          const isElyos = charRace === 'elyos' || charRace === '천족'
          const isAsmodian = charRace === 'asmodian' || charRace === '마족'
          if (raceFilter === 'elyos' && !isElyos) return
          if (raceFilter === 'asmodian' && !isAsmodian) return
        }

        merged.push({
          characterId: r.characterId,
          characterName: r.name.replace(/<\/?[^>]+(>|$)/g, ''),
          serverName: r.server,
          serverId: r.server_id || r.serverId || 0,
          className: r.className || (r as any).class || '',
          level: r.level || 0,
          raceName: r.race || ''
        })
      }

      localResults.forEach(addResult)
      apiResults.forEach(addResult)

      if (merged.length === 0) {
        setError('검색 결과가 없습니다.')
      } else {
        setSearchResults(merged)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.'
      setError(errMsg)
    } finally {
      setIsSearching(false)
    }
  }

  // 기존 저장된 OCR 스탯 불러오기
  const loadSavedOcrStats = async (characterId: string) => {
    setIsLoadingSavedStats(true)
    setSavedOcrStats(null)
    try {
      const deviceId = getDeviceId()
      const res = await fetch(`/api/character/ocr-stats?characterId=${encodeURIComponent(characterId)}`, {
        headers: { 'X-Device-ID': deviceId }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.stats && Array.isArray(data.stats) && data.stats.length > 0) {
          // API 응답을 RecognizedStat 형식으로 변환
          const stats: RecognizedStat[] = data.stats.map((s: { name: string; value: string | number }) => ({
            name: s.name,
            value: String(s.value),
            isPercentage: String(s.value).includes('%'),
            isRecognized: true
          }))
          setSavedOcrStats(stats)
          addDebugLog(`기존 OCR 스탯 ${stats.length}개 로드됨`)
        } else {
          addDebugLog('저장된 OCR 스탯 없음')
        }
      }
    } catch (err) {
      console.error('Failed to load saved OCR stats:', err)
    } finally {
      setIsLoadingSavedStats(false)
    }
  }

  // 캐릭터 선택
  const selectCharacter = (char: CharacterInfo) => {
    addDebugLog(`캐릭터 선택: ${char.characterName}`)
    setSelectedCharacter(char)
    setSlots({
      basic: { image: null, stats: [], isProcessing: false, updatedAt: null },
      combat: { image: null, stats: [], isProcessing: false, updatedAt: null },
      pvpPve: { image: null, stats: [], isProcessing: false, updatedAt: null },
      special: { image: null, stats: [], isProcessing: false, updatedAt: null }
    })
    setActiveSlot(null)
    setError(null)
    setSaveSuccess(false)
    setIsCharacterSectionCollapsed(true)

    // 기존 저장된 OCR 스탯 불러오기
    loadSavedOcrStats(char.characterId)
  }

  // 기존 스탯 수정 모달 열기
  const openEditModal = () => {
    if (!savedOcrStats || savedOcrStats.length === 0) return

    // 모든 예상 스탯을 순서대로 구성 (저장된 값이 있으면 채우고, 없으면 빈 값)
    const allExpectedStats: RecognizedStat[] = []

    for (const slotId of Object.keys(EXPECTED_STATS_BY_SLOT) as SlotId[]) {
      const expectedStats = EXPECTED_STATS_BY_SLOT[slotId]
      for (const expectedName of expectedStats) {
        const found = savedOcrStats.find(s => s.name === expectedName)
        if (found) {
          allExpectedStats.push({ ...found, isRecognized: true })
        } else {
          allExpectedStats.push({
            name: expectedName,
            value: '',
            isPercentage: false,
            isRecognized: false
          })
        }
      }
    }

    setEditingStats(allExpectedStats)
    setIsEditModalOpen(true)
    addDebugLog('기존 스탯 수정 모달 열림')
  }

  // 수정 모달에서 스탯 값 변경
  const handleEditStatChange = (index: number, newValue: string) => {
    setEditingStats(prev => prev.map((stat, idx) =>
      idx === index ? { ...stat, value: newValue, isRecognized: newValue.trim() !== '' } : stat
    ))
    setEditingStatIdx(null)
  }

  // 수정된 스탯 저장
  const handleSaveEditedStats = async () => {
    if (!selectedCharacter) return

    // 값이 있는 스탯만 필터링
    const statsToSave = editingStats.filter(s => s.value.trim() !== '')

    if (statsToSave.length === 0) {
      setError('저장할 스탯이 없습니다.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/character/ocr-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId
        },
        body: JSON.stringify({
          characterId: selectedCharacter.characterId,
          serverId: selectedCharacter.serverId,
          characterName: selectedCharacter.characterName,
          stats: statsToSave
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`저장 실패: ${res.status} - ${errorText}`)
      }

      addDebugLog(`수정된 스탯 ${statsToSave.length}개 저장 완료`)
      setSaveSuccess(true)
      setIsEditModalOpen(false)

      // 저장된 스탯 새로고침
      loadSavedOcrStats(selectedCharacter.characterId)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      setError(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  // OCR 큐에 요청 추가
  const addToOcrQueue = (slotId: SlotId, image: string) => {
    // 같은 슬롯의 기존 요청이 있으면 제거 (최신 요청만 유지)
    ocrQueueRef.current = ocrQueueRef.current.filter(item => item.slotId !== slotId)
    ocrQueueRef.current.push({ slotId, image })

    addDebugLog(`[큐] ${slotId} 추가됨 (대기: ${ocrQueueRef.current.length}개)`)
    updateQueueStatus()

    // 처리 중이 아니면 큐 처리 시작
    if (!isOcrProcessingRef.current) {
      processOcrQueue()
    }
  }

  // 큐 상태 업데이트
  const updateQueueStatus = () => {
    const queueLength = ocrQueueRef.current.length
    if (queueLength > 0) {
      setQueueStatus(`대기 중: ${queueLength}개`)
    } else {
      setQueueStatus(null)
    }
  }

  // OCR 큐 순차 처리
  const processOcrQueue = async () => {
    if (isOcrProcessingRef.current) return
    if (ocrQueueRef.current.length === 0) {
      setQueueStatus(null)
      return
    }

    isOcrProcessingRef.current = true
    const { slotId, image } = ocrQueueRef.current.shift()!
    updateQueueStatus()

    addDebugLog(`[큐] ${slotId} 처리 시작`)

    try {
      await runOcr(image, slotId)
    } catch (err) {
      console.error('OCR Queue Error:', err)
    }

    isOcrProcessingRef.current = false
    addDebugLog(`[큐] ${slotId} 처리 완료`)

    // 다음 요청 처리
    if (ocrQueueRef.current.length > 0) {
      processOcrQueue()
    } else {
      setQueueStatus(null)
    }
  }

  // 이미지 파일 처리
  const processImageFile = async (file: File, slotId: SlotId) => {
    setError(null)
    setSlots(prev => ({
      ...prev,
      [slotId]: { ...prev[slotId], isProcessing: true }
    }))

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setSlots(prev => ({
        ...prev,
        [slotId]: { ...prev[slotId], image: base64 }
      }))
      // 큐에 추가 (순차 처리)
      addToOcrQueue(slotId, base64)
    }
    reader.readAsDataURL(file)
  }

  // 이미지 전처리 (특정 스케일로)
  const preprocessImageAtScale = async (base64Image: string, targetScale: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // 별도 캔버스 생성 (병렬 처리를 위해)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(base64Image)
          return
        }

        const newWidth = Math.round(img.width * targetScale)
        const newHeight = Math.round(img.height * targetScale)

        canvas.width = newWidth
        canvas.height = newHeight

        // 고품질 업스케일링 설정
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // 그레이스케일 + 대비 강화
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // 그레이스케일 변환
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        // 대비 강화 (어두운 배경에 밝은 텍스트 최적화)
        const contrast = 1.8
        const brightness = 10
        for (let i = 0; i < data.length; i += 4) {
          let val = data[i]
          val = ((val / 255 - 0.5) * contrast + 0.5) * 255 + brightness
          val = Math.max(0, Math.min(255, val))
          data[i] = val
          data[i + 1] = val
          data[i + 2] = val
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = base64Image
    })
  }

  // 멀티 스케일 이미지 생성 (1x, 2x, 3x, 4x)
  const preprocessImageMultiScale = async (base64Image: string): Promise<{ scale: number; image: string }[]> => {
    const scales = [1, 2, 3, 4]
    const results = await Promise.all(
      scales.map(async (scale) => ({
        scale,
        image: await preprocessImageAtScale(base64Image, scale)
      }))
    )
    return results
  }

  // OCR 요청 ID 카운터
  const ocrRequestIdRef = useRef(0)

  // OCR 워커에 요청 (고유 ID로 응답 매칭)
  const sendToOcrWorker = async (base64Image: string, slotId: SlotId): Promise<string> => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current
      if (!worker?.contentWindow) {
        reject(new Error('OCR 워커가 준비되지 않았습니다.'))
        return
      }

      if (!isWorkerReady) {
        reject(new Error('OCR 엔진을 로딩 중입니다.'))
        return
      }

      // 고유 요청 ID 생성
      const requestId = `${slotId}_${++ocrRequestIdRef.current}_${Date.now()}`
      addDebugLog(`[${slotId}] OCR 요청 시작 (ID: ${requestId})`)

      const handleMessage = (event: MessageEvent) => {
        const { type, data, requestId: responseId } = event.data || {}

        // 요청 ID가 있는 경우 매칭 확인 (워커가 ID를 지원하지 않으면 무시)
        if (responseId && responseId !== requestId) {
          return // 다른 요청의 응답이므로 무시
        }

        if (type === 'result') {
          window.removeEventListener('message', handleMessage)
          const fullText = (data?.texts || [])
            .map((t: { text: string }) => t.text)
            .join('\n')
          addDebugLog(`[${slotId}] OCR 완료 (ID: ${requestId})`)
          resolve(fullText)
        } else if (type === 'error') {
          window.removeEventListener('message', handleMessage)
          reject(new Error(data?.message || 'OCR 처리 실패'))
        }
      }

      window.addEventListener('message', handleMessage)

      worker.contentWindow.postMessage({
        type: 'process',
        requestId, // 요청 ID 포함
        data: {
          image: base64Image,
          lang: 'kor+eng',
          psm: '6'
        }
      }, '*')

      setTimeout(() => {
        window.removeEventListener('message', handleMessage)
        reject(new Error('OCR 처리 시간이 초과되었습니다.'))
      }, 30000)
    })
  }

  // 다수결 로직: 각 스탯별로 가장 많이 나온 값 선택
  const mergeMultiScaleResults = (results: MultiScaleOcrResult[]): RecognizedStat[] => {
    // 모든 스탯 이름 수집
    const allStatNames = new Set<string>()
    results.forEach(r => r.stats.forEach(s => allStatNames.add(s.name)))

    const mergedStats: RecognizedStat[] = []

    for (const statName of Array.from(allStatNames)) {
      // 각 스케일에서 해당 스탯의 값 수집
      const values: string[] = []
      let isPercentage = false

      results.forEach(r => {
        const found = r.stats.find(s => s.name === statName)
        if (found && found.value) {
          values.push(found.value)
          if (found.isPercentage) isPercentage = true
        }
      })

      if (values.length === 0) continue

      // 다수결: 가장 많이 나온 값 선택
      const valueCounts = new Map<string, number>()
      values.forEach(v => {
        valueCounts.set(v, (valueCounts.get(v) || 0) + 1)
      })

      let bestValue = values[0]
      let bestCount = 0
      valueCounts.forEach((count, value) => {
        if (count > bestCount) {
          bestCount = count
          bestValue = value
        }
      })

      // 디버그: 다수결 결과 로그
      if (valueCounts.size > 1) {
        const voteLog = Array.from(valueCounts.entries())
          .map(([v, c]) => `${v}(${c}표)`)
          .join(', ')
        console.log(`[다수결] ${statName}: ${voteLog} → 선택: ${bestValue}`)
      }

      mergedStats.push({
        name: statName,
        value: bestValue,
        isPercentage,
        isRecognized: true
      })
    }

    return mergedStats
  }

  // OCR 실행 (멀티 스케일 + 다수결)
  const runOcr = async (base64Image: string, slotId: SlotId) => {
    try {
      // 진행 상태 업데이트: 이미지 전처리 중
      setSlots(prev => ({
        ...prev,
        [slotId]: { ...prev[slotId], processingProgress: '이미지 전처리 중...' }
      }))

      // 4개 스케일로 이미지 전처리
      const scaledImages = await preprocessImageMultiScale(base64Image)
      addDebugLog(`[${slotId}] 멀티스케일 이미지 생성 완료 (1x, 2x, 3x, 4x)`)

      // 각 스케일별 OCR 실행 (순차 실행 - 병렬은 OCR 워커 충돌 가능)
      const multiScaleResults: MultiScaleOcrResult[] = []

      for (const { scale, image } of scaledImages) {
        setSlots(prev => ({
          ...prev,
          [slotId]: { ...prev[slotId], processingProgress: `OCR 스캔 중 (${scale}x)...` }
        }))

        try {
          const text = await sendToOcrWorker(image, slotId)
          const stats = extractAllStats(text)
          multiScaleResults.push({ scale, stats, rawText: text })
          addDebugLog(`[${slotId}] ${scale}x OCR 완료: ${stats.length}개 스탯`)
        } catch (err) {
          addDebugLog(`[${slotId}] ${scale}x OCR 실패: ${err}`)
        }
      }

      // 진행 상태: 결과 병합 중
      setSlots(prev => ({
        ...prev,
        [slotId]: { ...prev[slotId], processingProgress: '결과 병합 중...' }
      }))

      // 다수결로 최종 결과 병합
      const mergedStats = mergeMultiScaleResults(multiScaleResults)
      console.log(`[runOcr] 다수결 병합 결과:`, mergedStats.map(s => `${s.name}=${s.value}`))

      // 예상 스탯과 비교하여 누락된 스탯을 빈 값으로 추가
      const allStats = fillMissingStats(mergedStats, slotId)
      const recognizedCount = mergedStats.length
      const missingCount = allStats.filter(s => !s.isRecognized).length

      // 디버그용 원본 텍스트 (2x 스케일 결과 사용 - 일반적으로 가장 정확)
      const rawTextForDebug = multiScaleResults.find(r => r.scale === 2)?.rawText
        || multiScaleResults[0]?.rawText
        || ''

      setSlots(prev => ({
        ...prev,
        [slotId]: {
          ...prev[slotId],
          stats: allStats,
          rawText: rawTextForDebug,
          isProcessing: false,
          processingProgress: undefined,
          multiScaleResults: multiScaleResults  // 각 스케일별 결과 저장
        }
      }))

      if (recognizedCount === 0) {
        addDebugLog(`[${slotId}] 스탯 인식 실패 (${missingCount}개 누락)`)
      } else {
        addDebugLog(`[${slotId}] 멀티스케일 OCR 완료: ${recognizedCount}개 인식, ${missingCount}개 누락`)
      }
    } catch (err) {
      console.error('OCR Error:', err)
      setSlots(prev => ({
        ...prev,
        [slotId]: { ...prev[slotId], isProcessing: false, processingProgress: undefined }
      }))
      setError('이미지 인식에 실패했습니다.')
    }
  }

  // 스탯 추출 (디버그 로그 포함)
  const extractAllStats = (text: string): RecognizedStat[] => {
    const tempResults: { index: number, stat: RecognizedStat }[] = []
    const sortedStatNames = [...KNOWN_STAT_NAMES].sort((a, b) => b.length - a.length)

    let remainingText = text

    // 디버그: 원본 텍스트에 "이동 속도" 또는 "이동속도" 포함 여부 확인
    if (text.includes('이동') || text.includes('속도')) {
      console.log('[extractAllStats] 원본 텍스트:', text)
      console.log('[extractAllStats] "이동 속도" 포함:', text.includes('이동 속도'))
      console.log('[extractAllStats] "이동속도" 포함:', text.includes('이동속도'))
    }

    for (const statName of sortedStatNames) {
      const searchNames = [statName, ...(STAT_ALIASES[statName] || [])]

      for (const searchName of searchNames) {
        const cleanName = searchName.replace(/\s+/g, '')
        const escapedParams = cleanName.split('').map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s._\\|\\[\\]]*')
        const regex = new RegExp(`(${escapedParams})[^0-9가-힣\\-]*?([-]?[\\d,]+\\.?\\d*\\s*%?)`, 'g')

        // 디버그: "이동 속도" 또는 "전투 속도" 처리 시 로그
        if (statName === '이동 속도' || statName === '전투 속도') {
          console.log(`[extractAllStats] "${statName}" 처리 중...`)
          console.log(`  - 정규식 패턴: ${regex.source}`)
          console.log(`  - 현재 remainingText 일부: "${remainingText.substring(0, 100)}..."`)

          // 수동 테스트
          const testMatch = remainingText.match(regex)
          console.log(`  - 매칭 결과:`, testMatch)
        }

        let match
        while ((match = regex.exec(remainingText)) !== null) {
          const fullMatch = match[0]
          const rawValue = match[2].trim()

          // 디버그: 속도 관련 매칭 로그
          if (statName.includes('속도')) {
            console.log(`[extractAllStats] "${statName}" 매칭 발견: "${fullMatch}", 값: "${rawValue}"`)
          }

          if (!rawValue || rawValue === '-' || rawValue === '.') {
            if (statName.includes('속도')) {
              console.log(`[extractAllStats] "${statName}" 값이 비어있거나 유효하지 않음 - 스킵`)
            }
            continue
          }

          let isPercent = rawValue.endsWith('%')
          let finalValue = rawValue

          if (isPercent) {
            if (finalValue.includes(',')) {
              finalValue = finalValue.replace(/,/, '.')
            }
            const numericVal = parseFloat(finalValue.replace('%', ''))
            if ((statName.includes('속도') || statName.includes('완벽') || statName.includes('재생') || statName.includes('강타') || statName.includes('철벽') || statName.includes('적중')) && numericVal > 100 && !finalValue.includes('.')) {
              finalValue = (numericVal / 10).toFixed(1) + '%'
            }
          } else {
            finalValue = finalValue.replace(/,/g, '')
          }

          tempResults.push({
            index: match.index,
            stat: {
              name: statName,
              value: finalValue,
              isPercentage: isPercent,
              isRecognized: true  // OCR로 인식됨
            }
          })

          if (statName.includes('속도')) {
            console.log(`[extractAllStats] "${statName}" 추가됨: ${finalValue}`)
          }

          const beforeMatch = remainingText.substring(0, match.index)
          const afterMatch = remainingText.substring(match.index + fullMatch.length)
          const spaces = ' '.repeat(fullMatch.length)

          remainingText = beforeMatch + spaces + afterMatch
          regex.lastIndex = 0
        }
      }
    }

    console.log(`[extractAllStats] 최종 결과: ${tempResults.length}개 스탯`)
    return tempResults.sort((a, b) => a.index - b.index).map(r => r.stat)
  }

  // OCR 결과와 예상 스탯을 비교하여 누락된 스탯을 빈 값으로 추가
  // 지정된 스탯만 표시 (예상 목록에 없는 스탯은 무시)
  const fillMissingStats = (recognizedStats: RecognizedStat[], slotId: SlotId): RecognizedStat[] => {
    const expectedStats = EXPECTED_STATS_BY_SLOT[slotId]

    // 예상 스탯 순서대로 결과 구성 (지정된 스탯만)
    const result: RecognizedStat[] = []

    for (const expectedName of expectedStats) {
      const recognized = recognizedStats.find(s => s.name === expectedName)
      if (recognized) {
        result.push(recognized)
      } else {
        // 누락된 스탯: 빈 값 + isRecognized: false
        result.push({
          name: expectedName,
          value: '',
          isPercentage: false,
          isRecognized: false
        })
      }
    }

    // 예상 목록에 없는 스탯은 무시 (디버그 로그만 출력)
    const extraStats = recognizedStats.filter(s => !expectedStats.includes(s.name))
    if (extraStats.length > 0) {
      console.log(`[fillMissingStats] 무시된 스탯 (${slotId}):`, extraStats.map(s => s.name).join(', '))
    }

    return result
  }

  // 슬롯 클릭 핸들러 (활성화)
  const handleSlotClick = (slotId: SlotId) => {
    if (!selectedCharacter) {
      setError('먼저 캐릭터를 선택해주세요.')
      return
    }
    setActiveSlot(slotId)
  }

  // 슬롯 이미지 제거
  const handleSlotRemove = (slotId: SlotId, e: React.MouseEvent) => {
    e.stopPropagation()
    setSlots(prev => ({
      ...prev,
      [slotId]: { image: null, stats: [], isProcessing: false, updatedAt: null }
    }))
  }

  // 스탯 값 수정
  const handleStatEdit = (slotId: SlotId, index: number, newValue: string) => {
    setSlots(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        stats: prev[slotId].stats.map((stat, idx) =>
          idx === index ? {
            ...stat,
            value: newValue,
            // 값이 입력되면 인식된 것으로 처리 (빨간색 해제)
            isRecognized: newValue.trim() !== '' ? true : stat.isRecognized
          } : stat
        )
      }
    }))
    setEditingStatIndex(null)
  }

  // 스탯 삭제
  const handleStatDelete = (slotId: SlotId, index: number) => {
    setSlots(prev => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        stats: prev[slotId].stats.filter((_, idx) => idx !== index)
      }
    }))
  }

  // 모든 스탯 합치기
  const getAllStats = (): RecognizedStat[] => {
    return STAT_SLOTS.reduce((acc, slot) => {
      return [...acc, ...slots[slot.id].stats]
    }, [] as RecognizedStat[])
  }

  // 업로드된 슬롯 수
  const getUploadedSlotCount = () => {
    return STAT_SLOTS.filter(slot => slots[slot.id].stats.length > 0).length
  }

  // 저장
  const handleSave = async () => {
    if (!selectedCharacter) return

    const allStats = getAllStats()
    if (allStats.length === 0) {
      setError('저장할 스탯이 없습니다. 이미지를 먼저 업로드해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const deviceId = getDeviceId()
      addDebugLog(`저장 시작 - deviceId: ${deviceId}`)
      addDebugLog(`캐릭터: ${selectedCharacter.characterName}`)
      addDebugLog(`총 스탯 개수: ${allStats.length}`)

      const res = await fetch('/api/character/ocr-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId
        },
        body: JSON.stringify({
          characterId: selectedCharacter.characterId,
          serverId: selectedCharacter.serverId,
          characterName: selectedCharacter.characterName,
          stats: allStats
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`저장 실패: ${res.status} - ${errorText}`)
      }

      const now = new Date().toLocaleString('ko-KR')
      setSlots(prev => {
        const updated = { ...prev }
        STAT_SLOTS.forEach(slot => {
          if (prev[slot.id].stats.length > 0) {
            updated[slot.id] = { ...updated[slot.id], updatedAt: now }
          }
        })
        return updated
      })

      addDebugLog('저장 성공!')
      setSaveSuccess(true)
      setIsReviewModalOpen(false)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      addDebugLog(`에러 발생: ${errMsg}`)
      setError(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const availableServers = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* 헤더 */}
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>캐릭터 스탯 업데이트</h1>
            <button
              className={styles.guideButton}
              onClick={() => setShowGuide(true)}
            >
              <HelpCircle size={14} />
              가이드
            </button>
          </div>
          <p className={styles.description}>
            캐릭터를 선택하고, 게임 스탯 스크린샷을 슬롯에 등록하여 스탯을 업데이트하세요.
          </p>
        </header>

        {/* 데이터 무결성 정책 경고 배너 */}
        <div style={{
          backgroundColor: 'rgba(217, 43, 75, 0.1)',
          border: '1px solid var(--brand-red-main)',
          borderRadius: '8px',
          padding: '16px',
          margin: '0 0 24px 0',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            color: 'var(--brand-red-main)',
            marginTop: '2px',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{
              color: 'var(--brand-red-main)',
              fontSize: '15px',
              fontWeight: '600',
              marginBottom: '4px',
              marginTop: 0
            }}>데이터 무결성 정책 안내</h3>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: '1.5',
              wordBreak: 'keep-all',
              margin: 0
            }}>
              본 서비스는 정확한 데이터 제공을 원칙으로 합니다. <strong style={{ color: '#fff', fontWeight: 600 }}>OCR 인식 오류 수정은 가능하나, 고의로 허위 데이터를 입력하여 랭킹을 교란하는 행위</strong>가 적발될 경우,
              사전 경고 없이 <strong style={{ color: '#fff', fontWeight: 600 }}>서비스 이용이 영구 제한</strong>될 수 있습니다.
              제출된 데이터가 실제 수치와 큰 차이를 보일 경우 <strong style={{ color: '#fff', fontWeight: 600 }}>시스템이 자동으로 감지</strong>하오니 각별한 주의 바랍니다.
              정확한 정보 공유를 위해 협조 부탁드립니다.
            </p>
          </div>
        </div>

        {/* 캐릭터 선택 영역 (접을 수 있음) */}
        <section className={`${styles.characterSection} ${isCharacterSectionCollapsed ? styles.collapsed : ''}`}>
          {/* 선택된 캐릭터 표시 (접혔을 때) */}
          {selectedCharacter && isCharacterSectionCollapsed && (
            <div className={styles.selectedCharacterBar} onClick={() => setIsCharacterSectionCollapsed(false)}>
              <div className={styles.selectedInfo}>
                <span className={styles.selectedName}>{selectedCharacter.characterName}</span>
                <span className={styles.selectedDetails}>
                  {selectedCharacter.className} Lv.{selectedCharacter.level} | {selectedCharacter.serverName}
                </span>
              </div>
              <button className={styles.changeButton}>
                <ChevronDown size={16} />
                변경
              </button>
            </div>
          )}

          {/* 탭 + 검색/즐겨찾기 영역 (펼쳤을 때) */}
          {!isCharacterSectionCollapsed && (
            <>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'favorites' ? styles.active : ''}`}
                  onClick={() => setActiveTab('favorites')}
                >
                  <Star size={16} />
                  즐겨찾기
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'search' ? styles.active : ''}`}
                  onClick={() => setActiveTab('search')}
                >
                  <Search size={16} />
                  캐릭터 검색
                </button>
              </div>

              <div className={styles.tabContent}>
                {/* 즐겨찾기 탭 */}
                {activeTab === 'favorites' && (
                  <div className={styles.favoritesPanel}>
                    {isLoadingFavorites ? (
                      <div className={styles.loading}>
                        <Loader2 className={styles.spinner} size={24} />
                        <span>로딩 중...</span>
                      </div>
                    ) : favorites.length === 0 ? (
                      <div className={styles.emptyFavorites}>
                        <StarOff size={32} />
                        <p>등록된 캐릭터가 없습니다.</p>
                        <button className={styles.goSearchButton} onClick={() => setActiveTab('search')}>
                          <Plus size={14} />
                          캐릭터 추가
                        </button>
                      </div>
                    ) : (
                      <div className={styles.favoritesList}>
                        {favorites.map((char) => (
                          <div
                            key={char.characterId}
                            className={`${styles.favoriteItem} ${selectedCharacter?.characterId === char.characterId ? styles.selected : ''}`}
                            onClick={() => selectCharacter(char)}
                          >
                            <div className={styles.favoriteInfo}>
                              <span className={styles.favoriteName}>{char.characterName}</span>
                              <span className={styles.favoriteDetails}>
                                {char.className} Lv.{char.level} | {char.serverName}
                              </span>
                            </div>
                            <button
                              className={styles.removeButton}
                              onClick={(e) => {
                                e.stopPropagation()
                                removeFromFavorites(char.characterId)
                              }}
                              title="즐겨찾기 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 검색 탭 */}
                {activeTab === 'search' && (
                  <div className={styles.searchPanel}>
                    <div className={styles.raceButtons}>
                      <button
                        className={`${styles.raceButton} ${race === 'elyos' ? styles.selected : ''}`}
                        onClick={() => { setRace('elyos'); setServerName(''); setSearchResults([]) }}
                      >
                        천족
                      </button>
                      <button
                        className={`${styles.raceButton} ${race === 'asmodian' ? styles.selected : ''}`}
                        onClick={() => { setRace('asmodian'); setServerName(''); setSearchResults([]) }}
                      >
                        마족
                      </button>
                    </div>

                    {race && (
                      <>
                        <div className={styles.serverDropdownWrapper}>
                          <button
                            type="button"
                            className={styles.serverDropdownTrigger}
                            onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                          >
                            <span>{serverName || '전체 서버'}</span>
                            <ChevronDown size={16} className={isServerDropdownOpen ? styles.chevronUp : ''} />
                          </button>
                          {isServerDropdownOpen && (
                            <div className={styles.serverDropdownMenu}>
                              <div
                                className={`${styles.serverDropdownItem} ${!serverName ? styles.selected : ''}`}
                                onClick={() => { setServerName(''); setIsServerDropdownOpen(false) }}
                              >
                                전체 서버
                              </div>
                              {availableServers.map(srv => (
                                <div
                                  key={srv}
                                  className={`${styles.serverDropdownItem} ${serverName === srv ? styles.selected : ''}`}
                                  onClick={() => { setServerName(srv); setIsServerDropdownOpen(false) }}
                                >
                                  {srv}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={styles.searchContainer}>
                          <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="캐릭터 이름 입력..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          />
                          <button
                            className={styles.searchButton}
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                          >
                            {isSearching ? <Loader2 className={styles.spinner} size={18} /> : <Search size={18} />}
                          </button>
                        </div>
                      </>
                    )}

                    {searchResults.length > 0 && (
                      <div className={styles.searchResults}>
                        {searchResults.map((char) => (
                          <div
                            key={char.characterId}
                            className={`${styles.searchResultItem} ${selectedCharacter?.characterId === char.characterId ? styles.selected : ''}`}
                            onClick={() => selectCharacter(char)}
                          >
                            <div className={styles.charInfo}>
                              <span className={styles.charName}>{char.characterName}</span>
                              <span className={styles.charDetails}>
                                {char.className} Lv.{char.level} | {char.serverName}
                              </span>
                            </div>
                            <button
                              className={`${styles.favoriteToggle} ${isFavorite(char.characterId) ? styles.isFavorite : ''}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isFavorite(char.characterId)) {
                                  removeFromFavorites(char.characterId)
                                } else {
                                  addToFavorites(char)
                                }
                              }}
                              title={isFavorite(char.characterId) ? '즐겨찾기 삭제' : '즐겨찾기 추가'}
                            >
                              {isFavorite(char.characterId) ? <Star size={16} /> : <StarOff size={16} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {error && !selectedCharacter && (
                      <div className={styles.errorMessage}>{error}</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* 이미지 슬롯 영역 */}
        <section className={styles.slotsSection}>
          {!selectedCharacter ? (
            <div className={styles.noSelection}>
              <ImagePlus size={48} />
              <p>캐릭터를 먼저 선택해주세요.</p>
            </div>
          ) : (
            <>
              <div className={styles.slotsHeader}>
                <div className={styles.slotsTitleRow}>
                  <h2 className={styles.slotsTitle}>스탯 이미지 등록</h2>
                  {queueStatus && (
                    <span className={styles.queueStatus}>
                      <Loader2 className={styles.spinner} size={12} />
                      {queueStatus}
                    </span>
                  )}
                </div>
                <p className={styles.slotsHint}>
                  {activeSlot ? (
                    <span className={styles.activeHint}>
                      <strong>[{STAT_SLOTS.find(s => s.id === activeSlot)?.label}]</strong> 슬롯 활성화됨 - Ctrl+V로 붙여넣기
                    </span>
                  ) : (
                    '슬롯을 클릭하면 붙여넣기 가능 상태가 됩니다'
                  )}
                </p>
              </div>

              {/* 기존 스탯 수정 버튼 */}
              {savedOcrStats && savedOcrStats.length > 0 && (
                <div className={styles.savedStatsBar}>
                  <div className={styles.savedStatsInfo}>
                    <Check size={16} />
                    <span>저장된 스탯 {savedOcrStats.length}개</span>
                  </div>
                  <button
                    className={styles.loadSavedBtn}
                    onClick={openEditModal}
                  >
                    <Edit3 size={14} />
                    기존 스탯 수정하기
                  </button>
                </div>
              )}
              {isLoadingSavedStats && (
                <div className={styles.savedStatsBar}>
                  <Loader2 className={styles.spinner} size={16} />
                  <span>저장된 스탯 확인 중...</span>
                </div>
              )}

              <div className={styles.slotsGrid}>
                {STAT_SLOTS.map((slot) => (
                  <div
                    key={slot.id}
                    className={`${styles.slot} ${activeSlot === slot.id ? styles.active : ''} ${slots[slot.id].image ? styles.hasImage : ''}`}
                    onClick={() => handleSlotClick(slot.id)}
                  >
                    {/* 슬롯 헤더 */}
                    <div className={styles.slotHeader}>
                      <span className={styles.slotLabel}>{slot.label}</span>
                      <input
                        ref={(el) => { fileInputRefs.current[slot.id] = el }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) processImageFile(file, slot.id)
                          e.target.value = ''
                        }}
                      />
                      <button
                        className={styles.slotUploadBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRefs.current[slot.id]?.click()
                        }}
                        title="이미지 업로드"
                      >
                        <Upload size={14} />
                      </button>
                    </div>

                    {/* 슬롯 컨텐츠 */}
                    <div className={styles.slotContent}>
                      {slots[slot.id].isProcessing ? (
                        <div className={styles.slotProcessing}>
                          <Loader2 className={styles.spinner} size={24} />
                          <span>{slots[slot.id].processingProgress || '분석 중...'}</span>
                        </div>
                      ) : slots[slot.id].image ? (
                        <>
                          <img src={slots[slot.id].image!} alt={slot.label} className={styles.slotImage} />
                          <button
                            className={styles.slotRemoveBtn}
                            onClick={(e) => handleSlotRemove(slot.id, e)}
                            title="이미지 제거"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <div className={styles.slotEmpty}>
                          <ImagePlus size={24} />
                          <span>{slot.description}</span>
                        </div>
                      )}
                    </div>

                    {/* 슬롯 푸터 (스탯 수 / 업데이트 시간) */}
                    <div className={styles.slotFooter}>
                      {slots[slot.id].stats.length > 0 && (
                        <span className={styles.statCount}>
                          <Check size={12} /> {slots[slot.id].stats.length}개 인식
                        </span>
                      )}
                      {slots[slot.id].multiScaleResults && slots[slot.id].multiScaleResults!.length > 0 && (
                        <button
                          className={styles.scanDetailBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMultiScaleDebug(slot.id)
                          }}
                          title="스캔 상세 보기"
                        >
                          <Eye size={12} /> 스캔 상세
                        </button>
                      )}
                      {slots[slot.id].updatedAt && (
                        <span className={styles.updatedAt}>
                          <Clock size={12} /> {slots[slot.id].updatedAt}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 액션 버튼 */}
              <div className={styles.actionButtons}>
                <button
                  className={styles.reviewButton}
                  onClick={() => setIsReviewModalOpen(true)}
                  disabled={getUploadedSlotCount() === 0}
                >
                  <Eye size={18} />
                  검토하기 ({getAllStats().length}개 스탯)
                </button>
              </div>

              {saveSuccess && (
                <div className={styles.successBanner}>
                  <Check size={18} />
                  <span>스탯이 성공적으로 저장되었습니다!</span>
                  <a
                    href={`/c/${selectedCharacter.serverName}/${selectedCharacter.characterName}`}
                    className={styles.viewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    캐릭터 페이지 보기
                  </a>
                </div>
              )}

              {error && (
                <div className={styles.errorBanner}>
                  <X size={16} />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* 검토 모달 */}
      {isReviewModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsReviewModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>스탯 검토</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className={`${styles.debugToggleBtn} ${showReviewDebug ? styles.active : ''}`}
                  onClick={() => setShowReviewDebug(!showReviewDebug)}
                  title="디버그 모드"
                >
                  <Bug size={16} />
                </button>
                <button className={styles.modalClose} onClick={() => setIsReviewModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={styles.modalContent}>
              {STAT_SLOTS.map((slot) => {
                if (slots[slot.id].stats.length === 0) return null

                return (
                  <div key={slot.id} className={styles.reviewSection}>
                    <h3 className={styles.reviewSectionTitle}>
                      {slot.label}
                      <span className={styles.reviewSectionBadge}>{slots[slot.id].stats.length}개</span>
                    </h3>
                    <div className={styles.reviewGrid}>
                      {/* 이미지 */}
                      <div className={styles.reviewImage}>
                        {slots[slot.id].image && (
                          <img src={slots[slot.id].image!} alt={slot.label} />
                        )}
                      </div>

                      {/* 스탯 목록 */}
                      <div className={styles.reviewStats}>
                        <div className={styles.statsGrid2Col}>
                          {slots[slot.id].stats.map((stat, idx) => {
                            const savedValue = getSavedStatValue(stat.name)
                            const changeType = compareValues(stat.value, savedValue)
                            return (
                              <div
                                key={idx}
                                className={`${styles.reviewStatItem} ${!stat.isRecognized ? styles.notRecognized : ''} ${changeType === 'up' ? styles.increased : ''} ${changeType === 'down' ? styles.decreased : ''}`}
                              >
                                <span className={styles.reviewStatName}>{stat.name}</span>
                                <div className={styles.reviewStatValueWrap}>
                                  {changeType === 'up' && (
                                    <span className={styles.changeIndicator + ' ' + styles.up}>
                                      <TrendingUp size={12} />
                                    </span>
                                  )}
                                  {changeType === 'down' && (
                                    <span className={styles.changeIndicator + ' ' + styles.down}>
                                      <TrendingDown size={12} />
                                    </span>
                                  )}
                                  {editingStatIndex?.slotId === slot.id && editingStatIndex?.index === idx ? (
                                    <input
                                      type="text"
                                      defaultValue={stat.value}
                                      className={styles.statInput}
                                      autoFocus
                                      placeholder="값 입력..."
                                      onBlur={(e) => handleStatEdit(slot.id, idx, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleStatEdit(slot.id, idx, e.currentTarget.value)
                                        } else if (e.key === 'Escape') {
                                          setEditingStatIndex(null)
                                        }
                                      }}
                                    />
                                  ) : (
                                    <span
                                      className={`${styles.reviewStatValue} ${!stat.isRecognized ? styles.notRecognizedValue : ''}`}
                                      onClick={() => setEditingStatIndex({ slotId: slot.id, index: idx })}
                                      title={stat.isRecognized ? "클릭하여 수정" : "인식 실패 - 클릭하여 직접 입력"}
                                    >
                                      {stat.value || '???'}
                                      <Edit3 size={10} className={styles.editIcon} />
                                    </span>
                                  )}
                                </div>
                                <button
                                  className={styles.deleteStatBtn}
                                  onClick={() => handleStatDelete(slot.id, idx)}
                                  title="삭제"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 디버그 패널 */}
                    {showReviewDebug && slots[slot.id].rawText && (
                      <div className={styles.reviewDebugPanel}>
                        <div className={styles.reviewDebugHeader}>
                          <span>🔍 OCR 원본 텍스트 (슬롯: {slot.id})</span>
                          <span className={styles.reviewDebugCharCount}>
                            {slots[slot.id].rawText?.length || 0}자
                          </span>
                        </div>
                        <pre className={styles.reviewDebugText}>
                          {slots[slot.id].rawText}
                        </pre>

                        {/* 스탯 검색 분석 */}
                        <div className={styles.reviewDebugAnalysis}>
                          <strong>스탯 검색 분석:</strong>
                          <div>
                            {['전투 속도', '이동 속도', '질주 속도', '비행 속도'].map(statName => {
                              const rawText = slots[slot.id].rawText || ''
                              const found = rawText.includes(statName) || rawText.includes(statName.replace(' ', ''))
                              // 해당 스탯이 추출 결과에 있는지 확인
                              const extracted = slots[slot.id].stats.some(s => s.name === statName)
                              return (
                                <div key={statName} style={{ marginLeft: '8px', fontSize: '11px' }}>
                                  <span style={{ color: found ? '#4ade80' : '#f87171' }}>
                                    {found ? '✓' : '✗'}
                                  </span>
                                  {' '}{statName}: 텍스트에 {found ? '있음' : '없음'}
                                  {found && (
                                    <span style={{ color: extracted ? '#4ade80' : '#f87171', marginLeft: '8px' }}>
                                      → 추출 {extracted ? '성공' : '실패'}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* "이동" 문자열 주변 분석 */}
                          {(slots[slot.id].rawText || '').includes('이동') && (
                            <div style={{ marginTop: '8px' }}>
                              <strong>&quot;이동&quot; 주변 20자:</strong>
                              <pre style={{ fontSize: '10px', background: '#1a1a1a', padding: '4px', marginTop: '4px' }}>
                                {(() => {
                                  const text = slots[slot.id].rawText || ''
                                  const idx = text.indexOf('이동')
                                  if (idx === -1) return '없음'
                                  const start = Math.max(0, idx - 5)
                                  const end = Math.min(text.length, idx + 15)
                                  const snippet = text.substring(start, end)
                                  // 유니코드 코드포인트 표시
                                  const codes = snippet.split('').map(c => `${c}(${c.charCodeAt(0).toString(16)})`).join(' ')
                                  return `"${snippet}"\n유니코드: ${codes}`
                                })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setIsReviewModalOpen(false)}>
                취소
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    스탯 업데이트
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 스탯 수정 모달 */}
      {isEditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <Edit3 size={20} />
                스탯 수정 - {selectedCharacter?.characterName}
              </h2>
              <button className={styles.modalClose} onClick={() => setIsEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.editModalContent}>
              {/* 카테고리별 스탯 표시 */}
              {STAT_SLOTS.map((slot) => {
                const expectedStats = EXPECTED_STATS_BY_SLOT[slot.id]
                const startIdx = STAT_SLOTS.slice(0, STAT_SLOTS.indexOf(slot))
                  .reduce((sum, s) => sum + EXPECTED_STATS_BY_SLOT[s.id].length, 0)
                const slotStats = editingStats.slice(startIdx, startIdx + expectedStats.length)

                return (
                  <div key={slot.id} className={styles.editSection}>
                    <h3 className={styles.editSectionTitle}>
                      {slot.label}
                      <span className={styles.editSectionCount}>
                        {slotStats.filter(s => s.value.trim() !== '').length}/{slotStats.length}
                      </span>
                    </h3>
                    <div className={styles.editStatsGrid}>
                      {slotStats.map((stat, idx) => {
                        const globalIdx = startIdx + idx
                        const savedValue = getSavedStatValue(stat.name)
                        const changeType = compareValues(stat.value, savedValue)
                        return (
                          <div
                            key={globalIdx}
                            className={`${styles.editStatItem} ${!stat.value.trim() ? styles.empty : ''} ${changeType === 'up' ? styles.increased : ''} ${changeType === 'down' ? styles.decreased : ''}`}
                          >
                            <span className={styles.editStatName}>{stat.name}</span>
                            <div className={styles.editStatValueWrap}>
                              {changeType === 'up' && (
                                <span className={styles.changeIndicator + ' ' + styles.up}>
                                  <TrendingUp size={12} />
                                </span>
                              )}
                              {changeType === 'down' && (
                                <span className={styles.changeIndicator + ' ' + styles.down}>
                                  <TrendingDown size={12} />
                                </span>
                              )}
                              {editingStatIdx === globalIdx ? (
                                <input
                                  type="text"
                                  defaultValue={stat.value}
                                  className={styles.editStatInput}
                                  autoFocus
                                  placeholder="값 입력"
                                  onBlur={(e) => handleEditStatChange(globalIdx, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditStatChange(globalIdx, e.currentTarget.value)
                                    } else if (e.key === 'Escape') {
                                      setEditingStatIdx(null)
                                    }
                                  }}
                                />
                              ) : (
                                <span
                                  className={styles.editStatValue}
                                  onClick={() => setEditingStatIdx(globalIdx)}
                                >
                                  {stat.value || '-'}
                                  <Edit3 size={10} className={styles.editIcon} />
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setIsEditModalOpen(false)}>
                취소
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveEditedStats}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    스탯 저장 ({editingStats.filter(s => s.value.trim() !== '').length}개)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멀티스케일 스캔 결과 모달 */}
      {showMultiScaleDebug && slots[showMultiScaleDebug]?.multiScaleResults && (
        <div className={styles.modalOverlay} onClick={() => setShowMultiScaleDebug(null)}>
          <div className={styles.multiScaleModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                멀티스케일 스캔 결과 - {STAT_SLOTS.find(s => s.id === showMultiScaleDebug)?.label}
              </h2>
              <button className={styles.modalClose} onClick={() => setShowMultiScaleDebug(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.multiScaleContent}>
              {slots[showMultiScaleDebug].multiScaleResults!.map((result) => (
                <div key={result.scale} className={styles.scaleResult}>
                  <div className={styles.scaleHeader}>
                    <span className={styles.scaleLabel}>{result.scale}x 스케일</span>
                    <span className={styles.scaleStatCount}>{result.stats.length}개 인식</span>
                  </div>

                  {/* 인식된 스탯 목록 */}
                  <div className={styles.scaleStats}>
                    {result.stats.length === 0 ? (
                      <span className={styles.noStats}>인식된 스탯 없음</span>
                    ) : (
                      result.stats.map((stat, idx) => (
                        <div key={idx} className={styles.scaleStat}>
                          <span className={styles.scaleStatName}>{stat.name}</span>
                          <span className={styles.scaleStatValue}>{stat.value}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* OCR 원본 텍스트 (축약) */}
                  <details className={styles.rawTextDetails}>
                    <summary>OCR 원본 텍스트</summary>
                    <pre className={styles.rawTextPre}>{result.rawText || '(없음)'}</pre>
                  </details>
                </div>
              ))}

              {/* 다수결 결과 요약 */}
              <div className={styles.votingSummary}>
                <h3>다수결 결과</h3>
                <p className={styles.votingDescription}>
                  각 스탯별로 4개 스케일에서 가장 많이 나온 값이 최종 선택됩니다.
                </p>
                <div className={styles.finalStats}>
                  {slots[showMultiScaleDebug].stats.filter(s => s.isRecognized).map((stat, idx) => {
                    // 각 스케일에서 해당 스탯의 값 수집
                    const votes = slots[showMultiScaleDebug].multiScaleResults!
                      .map(r => r.stats.find(s => s.name === stat.name)?.value)
                      .filter(Boolean) as string[]

                    const voteCounts = new Map<string, number>()
                    votes.forEach(v => voteCounts.set(v, (voteCounts.get(v) || 0) + 1))

                    const voteDisplay = Array.from(voteCounts.entries())
                      .map(([v, c]) => `${v}(${c}표)`)
                      .join(', ')

                    return (
                      <div key={idx} className={styles.finalStat}>
                        <span className={styles.finalStatName}>{stat.name}</span>
                        <span className={styles.finalStatVotes}>{voteDisplay || '-'}</span>
                        <span className={styles.finalStatValue}>→ {stat.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용 가이드 모달 */}
      {showGuide && (
        <div className={styles.modalOverlay} onClick={() => setShowGuide(false)}>
          <div className={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>스크린샷 위치 안내</h2>
              <button className={styles.modalClose} onClick={() => setShowGuide(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.guideContent}>
              <p className={styles.guideIntro}>
                게임 내 캐릭터 정보 &gt; 능력치 탭에서 아래 영역을 캡처하여 각 슬롯에 등록하세요.
              </p>

              <div className={styles.guideGrid}>
                <div className={styles.guideItem}>
                  <div className={styles.guideItemHeader}>
                    <span className={styles.guideSlotNumber}>슬롯1</span>
                    <span className={styles.guideSlotName}>주요능력치</span>
                  </div>
                  <div className={styles.guideImageWrap}>
                    <img src="/guide/stat-update/basic.png" alt="주요능력치" />
                  </div>
                  <div className={styles.guideStats}>
                    공격력, 방어력, 명중, 회피, 치명타, 생명력, 정신력, 속도
                  </div>
                </div>

                <div className={styles.guideItem}>
                  <div className={styles.guideItemHeader}>
                    <span className={styles.guideSlotNumber}>슬롯2</span>
                    <span className={styles.guideSlotName}>전투/판정</span>
                  </div>
                  <div className={styles.guideImageWrap}>
                    <img src="/guide/stat-update/combat.png" alt="전투/판정" />
                  </div>
                  <div className={styles.guideStats}>
                    관통, 피해 증폭/내성, 다단 히트, 막기, 철벽, 재생, 완벽, 강타
                  </div>
                </div>

                <div className={styles.guideItem}>
                  <div className={styles.guideItemHeader}>
                    <span className={styles.guideSlotNumber}>슬롯3</span>
                    <span className={styles.guideSlotName}>PVP/PVE</span>
                  </div>
                  <div className={styles.guideImageWrap}>
                    <img src="/guide/stat-update/pvp-pve.png" alt="PVP/PVE" />
                  </div>
                  <div className={styles.guideStats}>
                    PVP/PVE 공방, 명중/회피, 피해 증폭/내성, 보스 관련
                  </div>
                </div>

                <div className={styles.guideItem}>
                  <div className={styles.guideItemHeader}>
                    <span className={styles.guideSlotNumber}>슬롯4</span>
                    <span className={styles.guideSlotName}>특수/자원</span>
                  </div>
                  <div className={styles.guideImageWrap}>
                    <img src="/guide/stat-update/special.png" alt="특수/자원" />
                  </div>
                  <div className={styles.guideStats}>
                    질주/비행 속도, 치유 증폭, 행동력, 비행력, 자연 회복
                  </div>
                </div>
              </div>

              <div className={styles.guideTips}>
                <h3>Tips</h3>
                <ul>
                  <li><strong>Ctrl+V</strong>로 클립보드 이미지 붙여넣기</li>
                  <li>슬롯 클릭 후 붙여넣기하면 해당 슬롯에 등록</li>
                  <li>이미지 등록 시 자동 OCR 스캔</li>
                  <li>인식된 값은 클릭하여 직접 수정 가능</li>
                </ul>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowGuide(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 숨겨진 캔버스 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* OCR 워커 iframe */}
      <iframe
        ref={workerRef}
        src="/ocr-worker/index.html"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        onLoad={() => setIsWorkerReady(true)}
        title="OCR Worker"
      />

      {/* 디버그 패널 (개발용) */}
      {showDebug && (
        <div className={styles.debugPanel}>
          <div className={styles.debugHeader}>
            <span>Debug Panel</span>
            <button onClick={() => setDebugLogs([])}>Clear</button>
            <button onClick={() => setShowDebug(false)}>Close</button>
          </div>
          <div className={styles.debugContent}>
            <div>Device ID: {deviceIdDisplay}</div>
            <div>선택된 캐릭터: {selectedCharacter?.characterName || '없음'}</div>
            <div>활성 슬롯: {activeSlot || '없음'}</div>
            {debugLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {!showDebug && (
        <button className={styles.debugToggle} onClick={() => setShowDebug(true)}>
          Debug
        </button>
      )}
    </main>
  )
}
