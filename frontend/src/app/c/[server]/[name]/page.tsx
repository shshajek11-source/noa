'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useSearchParams } from 'next/navigation'
import ProfileSection from '../../../components/ProfileSection'
import TitleCard from '../../../components/TitleCard'

import DaevanionCard from '../../../components/DaevanionCard'
import EquipmentGrid from '../../../components/EquipmentGrid'
import AccordionCard from '../../../components/AccordionCard'
import { supabaseApi, CharacterDetail, SERVER_NAME_TO_ID, SERVER_ID_TO_NAME, getApiBaseUrl } from '../../../../lib/supabaseApi'
import { normalizeCharacterId } from '../../../../lib/characterId'
import RankingCard from '../../../components/RankingCard'
import EquipmentDetailList from '../../../components/EquipmentDetailList'

// 지연 로딩 컴포넌트 (탭 전환 시에만 로드)
const SkillSection = dynamic(() => import('../../../components/SkillSection'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>스킬 정보 로딩 중...</div>
})
const StatsSummaryView = dynamic(() => import('../../../components/StatsSummaryView'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>능력치 로딩 중...</div>
})
const DetailedViewSection = dynamic(() => import('../../../components/DetailedViewSection'), {
  ssr: false,
  loading: () => <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>상세 정보 로딩 중...</div>
})

// 모달 지연 로딩 (아이템 클릭 시에만 로드)
const ItemDetailModal = dynamic(() => import('../../../components/ItemDetailModal'), { ssr: false })
import { RecentCharacter } from '../../../../types/character'
import type { OcrStat } from '../../../../types/stats'
import DSTabs from '@/app/components/design-system/DSTabs'
import { MAIN_CHARACTER_KEY, MainCharacter } from '../../../components/SearchBar'
import CharacterDetailMobile from '../../../components/mobile/CharacterDetailMobile'

// --- Types mapping to UI components ---
export type CharacterData = {
  id: number
  characterId?: string  // v2.2: 전투력 DB 저장용
  name: string
  server: string
  class: string
  level: number
  power: number
  power_index?: number
  tier_rank?: string
  percentile?: number
  rank?: number
  updated_at: string
  power_change?: number
  level_change?: number
  stats?: Record<string, number>
  warning?: string
  race?: string
  title?: string
  character_image_url?: string
  item_level?: number
  skills?: any
  title_name?: string
  title_grade?: string
  title_id?: number
  pvp_score?: number
  pve_score?: number
}

// --- Helper Functions for Data Mapping ---

const mapEquipment = (rawEquipment: any, rawPetWings: any = [], rawAppearance: any = []): {
  equipment: any[],
  accessories: any[],
  arcana: any[],
  pets: any[],
  wings: any[],
  appearance: any[],
  debugInfo: any
} => {
  // rawPetWings might be an object or undefined. Ensure it's an array.
  let safePetWings: any[] = []
  if (Array.isArray(rawPetWings)) {
    safePetWings = rawPetWings
  } else if (rawPetWings && typeof rawPetWings === 'object') {
    // Handle Case: rawPetWings is an object with 'pet' and 'wing' keys (Direct Objects)
    if (rawPetWings.pet && !Array.isArray(rawPetWings.pet)) {
      safePetWings.push({ ...rawPetWings.pet, categoryName: 'Pet', slotName: '펫' })
    }
    if (rawPetWings.wing && !Array.isArray(rawPetWings.wing)) {
      safePetWings.push({ ...rawPetWings.wing, categoryName: 'Wing', slotName: '날개' })
    }

    // Handle Case: properties might be arrays (Fallback)
    const potentialArrays = Object.values(rawPetWings).filter(val => Array.isArray(val)) as any[][]
    safePetWings = [...safePetWings, ...potentialArrays.flat()]
  }

  // console.log('[DEBUG] mappedEquipment - rawPetWings:', rawPetWings)
  // console.log('[DEBUG] mappedEquipment - safePetWings:', safePetWings)

  // Check for potential appearance list in rawEquipment
  // Based on debug: keys include 'equipmentList' and 'skinList'
  const skinList = (rawEquipment?.skinList || []).map((item: any) => ({ ...item, _isSkin: true }))
  const appearanceList = rawEquipment?.appearanceList || rawEquipment?.costumeList || []

  // Merge all lists
  const list = [...(rawEquipment?.equipmentList || []), ...safePetWings, ...appearanceList, ...skinList, ...(Array.isArray(rawAppearance) ? rawAppearance : [])]
  // console.log('[DEBUG] mappedEquipment - Merged List Length:', list.length)

  if (list.length === 0) return { equipment: [], accessories: [], arcana: [], pets: [], wings: [], appearance: [], debugInfo: null } // Early return if empty

  const equipment: any[] = []
  const accessories: any[] = []
  const arcana: any[] = []
  const pets: any[] = []
  const wings: any[] = []
  const appearance: any[] = []
  const uniqueCategories = new Set<string>()
  const rawKeys = Object.keys(rawEquipment || {})

  // 1. Define Sort Orders (User Requested)
  // 1. Define Sort Orders (User Requested)
  const equipmentSortOrder: Record<string, number> = {
    '주무기': 1, '보조무기': 2,
    '투구': 3, '견갑': 4,
    '흉갑': 5, '장갑': 6,
    '각반': 7, '장화': 8,
    '망토': 9, '허리띠': 10
  }

  const accessorySortOrder: Record<string, number> = {
    '귀걸이1': 1, '귀걸이2': 2,
    '아뮬렛': 3, '목걸이': 4,
    '반지1': 5, '반지2': 6,
    '팔찌1': 7, '팔찌2': 8,
    '룬1': 9, '룬2': 10
  }

  // Grade Mapping
  const gradeMap: Record<string, number> = {
    'Common': 1, 'Rare': 2, 'Legend': 3, 'Unique': 4, 'Epic': 5, 'Mythic': 6
  }

  const slotMap: Record<string, string> = {
    'Main': '주무기', 'Sub': '보조무기',
    'Head': '투구', 'Helmet': '투구', 'Cap': '투구',
    'Torso': '흉갑', 'Breastplate': '흉갑', 'Top': '흉갑', 'Shirt': '흉갑', 'Tunic': '흉갑',
    'Glove': '장갑', 'Gloves': '장갑', 'Hand': '장갑',
    'Foot': '장화', 'Feet': '장화', 'Shoes': '장화', 'Boots': '장화',
    'Shoulder': '견갑', 'Pauldrons': '견갑', 'Mantle': '견갑',
    'Legs': '각반', 'Leg': '각반', 'Pants': '각반', 'Bottom': '각반', 'Greaves': '각반',
    'Wing': '망토', 'Cape': '망토',
    'Waist': '허리띠', 'Belt': '허리띠',
    'Earring1': '귀걸이1', 'Earring 2': '귀걸이2', 'Earring2': '귀걸이2', 'Earring 1': '귀걸이1',
    'Ring1': '반지1', 'Ring 2': '반지2', 'Ring2': '반지2', 'Ring 1': '반지1',
    'Necklace': '목걸이',
    'Bracelet': '팔찌', 'Bracelet1': '팔찌1', 'Bracelet2': '팔찌2',
    'Feather': '깃털',
    // Fallback Korean
    '주무기': '주무기', '보조무기': '보조무기', '투구': '투구', '머리': '투구',
    '상의': '흉갑', '흉갑': '흉갑',
    '장갑': '장갑', '손': '장갑',
    '하의': '각반', '각반': '각반', '다리': '각반',
    '신발': '장화', '장화': '장화', '발': '장화',
    '어깨': '견갑', '견갑': '견갑',
    '귀고리 쪽': '귀걸이1', '귀고리 짝': '귀걸이2', '반지 쪽': '반지1', '반지 짝': '반지2', '목걸이': '목걸이', '허리': '허리띠'
  }

  list.forEach((item: any) => {
    // 1. Try to find valid keys from various properties
    const rawSlot = item.slotPosName || item.slotName || item.categoryName
    let slotName = slotMap[rawSlot] || rawSlot

    // 2. 🚨 FORCE OVERRIDE based on slotPos (Most Reliable)
    if (item.slotPos === 1) slotName = '주무기'
    if (item.slotPos === 2) slotName = '보조무기'
    // if (item.slotPos === 3) slotName = '흉갑' // (추정)
    // if (item.slotPos === 4) slotName = '장갑' // (추정)
    // if (item.slotPos === 5) slotName = '장화' // (추정)
    if (item.slotPos === 9) slotName = '목걸이'
    // if (item.slotPos === 11) slotName = '견갑' // (추정)
    // if (item.slotPos === 12) slotName = '각반' // (추정)
    if (item.slotPos === 15) slotName = '팔찌2' // 해방자
    if (item.slotPos === 16) slotName = '팔찌1' // 각성
    if (item.slotPos === 17) slotName = '허리띠'
    if (item.slotPos === 19) slotName = '망토'
    if (item.slotPos === 22) slotName = '아뮬렛'
    if (item.slotPos === 23) slotName = '룬1'
    if (item.slotPos === 24) slotName = '룬2'

    // 3. Fallback: Keyword Search in Category or Name if still unmapped or using fallback
    if (!equipmentSortOrder[slotName] && !accessorySortOrder[slotName]) {
      const searchTarget = (item.categoryName + ' ' + item.name).toLowerCase()

      if (searchTarget.includes('투구') || searchTarget.includes('helm') || searchTarget.includes('hat')) slotName = '투구'
      else if (searchTarget.includes('흉갑') || searchTarget.includes('plate') || searchTarget.includes('tunic') || searchTarget.includes('상의')) slotName = '흉갑'
      else if (searchTarget.includes('견갑') || searchTarget.includes('pauldron')) slotName = '견갑'
      else if (searchTarget.includes('장갑') || searchTarget.includes('glove')) slotName = '장갑'
      else if (searchTarget.includes('각반') || searchTarget.includes('leggings') || searchTarget.includes('greaves') || searchTarget.includes('하의') || searchTarget.includes('leg')) slotName = '각반'
      else if (searchTarget.includes('장화') || searchTarget.includes('boots') || searchTarget.includes('shoes') || searchTarget.includes('신발')) slotName = '장화'
      else if (searchTarget.includes('날개') || searchTarget.includes('wing')) slotName = '날개'
    }

    // Additional Normalization to ensure strict match
    if (slotName === '상의') slotName = '흉갑'
    if (slotName === '하의') slotName = '각반'
    if (slotName === '어깨') slotName = '견갑'
    if (slotName === '신발') slotName = '장화'
    if (slotName === '다리') slotName = '각반'
    if (slotName === '손') slotName = '장갑'
    if (slotName === '머리') slotName = '투구'
    if (slotName === '날개' || slotName === 'Bird') slotName = '날개'

    // Check if this is an Arcana item (slotPos 41-45 or slotPosName starts with "Arcana")
    const isArcana = (item.slotPos >= 41 && item.slotPos <= 45) || rawSlot?.startsWith('Arcana')

    if (item.categoryName) uniqueCategories.add(item.categoryName)

    // Check if this is Pet (slotPos 51 or contains "펫")
    const isPet = item.slotPos === 51 || slotName?.includes('펫') || slotName?.includes('Pet')
    // if (isPet) console.log('[DEBUG] Found Pet:', item.name, item.slotPos)

    // Check if this is Wings (slotPos 52 or contains "날개")
    const isWings = item.slotPos === 52 || slotName?.includes('날개') || slotName?.includes('Wing')
    // if (isWings) console.log('[DEBUG] Found Wings:', item.name, item.slotPos)

    let isAccessory = false
    let isEquipment = false

    if (accessorySortOrder[slotName]) {
      isAccessory = true
    } else if (equipmentSortOrder[slotName]) {
      isEquipment = true
    } else {
      // Fallback checks
      isAccessory = !isArcana && !isPet && !isWings && slotName && (
        slotName.includes('귀걸이') ||
        slotName.includes('목걸이') ||
        slotName.includes('반지') ||
        slotName.includes('팔찌') ||
        slotName.includes('룬') ||
        slotName.includes('아뮬렛') ||
        slotName.includes('부적')
      )
    }

    // Check for Appearance
    const isAppearance = item._isSkin === true ||
      item.categoryName?.includes('외형') ||
      item.categoryName?.includes('모션') ||
      item.categoryName?.includes('의상') ||
      item.categoryName?.includes('머리장식') ||
      item.categoryName?.includes('가발') ||
      item.name?.includes('모션') ||
      item.name?.includes('외형') ||
      slotName?.includes('외형')

    const mappedItem = {
      slot: slotName,
      name: item.name || item.itemName,
      enhancement: item.enchantLevel > 0 ? `+${item.enchantLevel}` : '',
      tier: gradeMap[item.grade] || item.gradeCode || 3,
      itemLevel: item.itemLevel || 0, // 아이템 레벨
      grade: item.grade, // 아이템 등급 (색상 결정용)
      image: item.icon || item.image || item.itemArt,
      category: item.categoryName,
      breakthrough: item.exceedLevel || 0, // 공식 사이트와 동일한 필드명 사용!
      soulEngraving: item.soulEngraving ? { grade: item.soulEngraving.grade, percentage: item.soulEngraving.value } : undefined,
      manastones: (item.manastoneList && item.manastoneList.length > 0)
        ? item.manastoneList.map((m: any) => ({ type: m.name || m.type, value: m.point || m.value }))
        : (item.detail?.manastones || []).map((m: any) => ({ type: m.type || m.name, value: m.value })),
      detail: item.detail, // Explicitly pass the detail object
      raw: item
    }

    if (isPet) {
      pets.push(mappedItem)
    } else if (isWings) {
      wings.push(mappedItem)
    } else if (isAppearance) {
      appearance.push(mappedItem)
    } else if (isArcana) {
      arcana.push(mappedItem)
    } else if (isAccessory) {
      accessories.push(mappedItem)
    } else {
      equipment.push(mappedItem)
    }
  })

  // Sort the arrays
  equipment.sort((a, b) => {
    const orderA = equipmentSortOrder[a.slot] || 99
    const orderB = equipmentSortOrder[b.slot] || 99
    return orderA - orderB
  })

  accessories.sort((a, b) => {
    const orderA = accessorySortOrder[a.slot] || 99
    const orderB = accessorySortOrder[b.slot] || 99
    return orderA - orderB
  })

  arcana.sort((a, b) => (a.raw.slotPos || 0) - (b.raw.slotPos || 0))

  return {
    equipment,
    accessories,
    arcana,
    pets,
    wings,
    appearance,
    debugInfo: {
      categories: Array.from(uniqueCategories),
      keys: rawKeys,
      rawEquipLength: (rawEquipment?.equipmentList || []).length
    }
  }
}

const mapStats = (rawStats: any): any[] => {
  if (!rawStats?.statList) return []

  return rawStats.statList.map((stat: any) => ({
    name: stat.name,
    value: typeof stat.value === 'string' ? parseInt(stat.value.replace(/,/g, '')) : stat.value,
    percentile: undefined, // API usually doesn't give per-stat percentile in this list
    breakdown: undefined // Detailed breakdown might need separate parsing
  }))
}

// OCR 스탯과 API 스탯 병합 함수
// 이름이 같으면 OCR 값으로 덮어씌움
// OcrStat 타입은 types/stats.ts에서 import

const mergeStatsWithOcr = (apiStats: any, ocrStats: OcrStat[] | null): any => {
  if (!ocrStats || ocrStats.length === 0) return apiStats
  if (!apiStats?.statList) return apiStats

  // statList 복사
  const mergedStatList = [...apiStats.statList]

  for (const ocrStat of ocrStats) {
    const existingIndex = mergedStatList.findIndex(
      (s: any) => s.name === ocrStat.name
    )

    const ocrValue = ocrStat.value.replace(/,/g, '').replace(/%$/, '')
    const numericValue = parseFloat(ocrValue)

    if (existingIndex >= 0) {
      // 이름이 같으면 덮어씌움
      mergedStatList[existingIndex] = {
        ...mergedStatList[existingIndex],
        value: isNaN(numericValue) ? ocrStat.value : numericValue,
        isOcrOverride: true // OCR로 덮어씌워진 값임을 표시
      }
    } else {
      // 새 스탯은 추가
      mergedStatList.push({
        name: ocrStat.name,
        value: isNaN(numericValue) ? ocrStat.value : numericValue,
        isOcrOverride: true
      })
    }
  }

  return {
    ...apiStats,
    statList: mergedStatList,
    hasOcrData: true
  }
}

const mapDevanion = (rawDevanion: any) => {
  // DEBUG: Log raw structure to terminal to identify correct keys
  // console.log('[[DEBUG]] mapDevanion raw input:', JSON.stringify(rawDevanion, null, 2));

  const result: any = {
    boards: {},
    totalInvestment: rawDevanion?.totalInvestment || 0,
    globalRank: rawDevanion?.globalRank || 0,
    boardList: rawDevanion?.boardList || []  // 🔥 CRITICAL: Pass boardList to DevanionBoard component
  }

  // 1. Try to map real data
  if (rawDevanion?.boardList && Array.isArray(rawDevanion.boardList)) {
    rawDevanion.boardList.forEach((board: any) => {
      // Assuming API returns standard fields, map them
      // If keys are unknown, we rely on 'name' or 'id'
      const name = board.name || board.subjectName
      if (name) {
        result.boards[name] = {
          name: name,
          progress: board.level >= 45 ? '완료' : '진행중', // Simple heuristic
          activeNodes: board.currentExp || board.level || 0, // Fallback to level as nodes
          totalNodes: 87, // Standard total matches grid
          effects: board.stats || [] // Assuming array of strings
        }
      }
    })
  }

  // 2. Ensure every God has data (Mix Real + Mock)
  // If the API didn't return a board, or returned it with 0 progress, use Mock Data for demo
  const GODS = [
    { id: 'nezakan', name: '네자칸' },
    { id: 'zikel', name: '지켈' },
    { id: 'baizel', name: '바이젤' },
    { id: 'triniel', name: '트리니엘' },
    { id: 'ariel', name: '아리엘' },
    { id: 'asphel', name: '아스펠' }
  ]

  GODS.forEach((god, index) => {
    // Check if real data exists and has progress
    const existing = result.boards[god.name] || result.boards[god.id]

    // If missing or empty (0 active nodes), inject Mock Data
    if (!existing || existing.activeNodes === 0) {
      // Valid progress for demo: random but consistent per index for stability
      // Nezakan(0)=12, Zikel(1)=25, etc.
      const active = index === 0 ? 12 :
        index === 1 ? 25 :
          index === 2 ? 5 :
            index === 3 ? 30 :
              index === 4 ? 15 : 40

      const mockBoard = {
        name: god.name,
        progress: '진행중', // Always show as in-progress if we are mocking
        activeNodes: active,
        totalNodes: 87,
        effects: [`${god.name}의 권능 I`, '추가 능력치 +10', '전투력 +50']
      }

      // Overwrite/Set
      result.boards[god.id] = mockBoard
      result.boards[god.name] = mockBoard
    }
  })

  return result
}




export default function CharacterDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const raceParam = searchParams.get('race') || undefined
  const isMock = searchParams.get('mock') === 'true'

  // URL params are usually encoded so we decode them
  const rawServerParam = decodeURIComponent(params.server as string)
  // 서버 ID가 URL에 들어온 경우 서버 이름으로 변환 (예: "2017" -> "콰이링")
  const serverName = SERVER_ID_TO_NAME[parseInt(rawServerParam)] || rawServerParam
  const charName = decodeURIComponent(params.name as string)

  const [data, setData] = useState<CharacterData | null>(null)
  const [rawData, setRawData] = useState<CharacterDetail | null>(null) // Keep full DB response if needed
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mapped Data States
  const [mappedEquipment, setMappedEquipment] = useState<{
    equipment: any[],
    accessories: any[],
    arcana: any[],
    pets: any[],
    wings: any[],
    appearance: any[],
    debugInfo: any
  }>({
    equipment: [],
    accessories: [],
    arcana: [],
    pets: [],
    wings: [],
    appearance: [],
    debugInfo: {}
  })
  const [mappedStats, setMappedStats] = useState<any>({})
  const [ocrStats, setOcrStats] = useState<OcrStat[] | null>(null)
  const [mappedTitles, setMappedTitles] = useState<any>({})
  const [mappedDaevanion, setMappedDaevanion] = useState<any>({})
  const [mappedRankings, setMappedRankings] = useState<any>({})
  const [mappedSkills, setMappedSkills] = useState<any>(null)

  // API params for DevanionBoard
  const [apiCharacterId, setApiCharacterId] = useState<string | undefined>(undefined)
  const [apiServerId, setApiServerId] = useState<string | undefined>(undefined)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  // null = 감지 전, true/false = 감지 완료 (플래시 방지)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // --- Main Character for Comparison ---
  const [mainCharacter, setMainCharacter] = useState<MainCharacter | null>(null)
  const [mainCharacterData, setMainCharacterData] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
    if (saved) {
      setMainCharacter(JSON.parse(saved))
    }

    const handleMainCharChange = () => {
      const updated = localStorage.getItem(MAIN_CHARACTER_KEY)
      setMainCharacter(updated ? JSON.parse(updated) : null)
    }
    window.addEventListener('mainCharacterChanged', handleMainCharChange)
    return () => window.removeEventListener('mainCharacterChanged', handleMainCharChange)
  }, [])

  useEffect(() => {
    if (mainCharacter && mainCharacter.characterId) {
      const fetchMainDetail = async () => {
        try {
          const serverId = mainCharacter.server_id || 1
          const apiUrl = `${getApiBaseUrl()}/api/character?id=${encodeURIComponent(mainCharacter.characterId)}&server=${serverId}`

          const res = await fetch(apiUrl)
          if (res.ok) {
            const detail = await res.json()
            // current character와 동일한 mapEquipment 로직 사용
            const mapped = mapEquipment(detail.equipment, detail.petwing, detail.appearance || detail.costume)
            setMainCharacterData({
              ...mainCharacter,
              mappedEquipment: mapped,
              pvp_score: detail.profile?.pvp_score || 0,
              pve_score: detail.profile?.pve_score || detail.profile?.pve_score || mainCharacter.pve_score || mainCharacter.hit_score,
              character_image_url: detail.profile?.profileImage || mainCharacter.imageUrl
            })
          }
        } catch (e) {
          console.error("Failed to fetch main character detail", e)
        }
      }
      fetchMainDetail()
    } else {
      setMainCharacterData(null)
    }
  }, [mainCharacter])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // Tablet & Mobile
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleItemClick = useCallback((item: any) => {
    setSelectedItem(item)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedItem(null)
  }, [])

  // Helper to save history
  const saveToHistory = (charData: CharacterData, serverId: number) => {
    try {
      const stored = localStorage.getItem('aion_recent_searches')
      let history: RecentCharacter[] = stored ? JSON.parse(stored) : []

      // Use provided server string or fallback
      const sName = charData.server
      const newId = `${sName}_${charData.name}`

      // Remove existing entry with same ID
      history = history.filter(h => h.id !== newId)

      // Add new entry to front
      const newEntry: RecentCharacter = {
        id: newId,
        name: charData.name,
        server: sName,
        serverId: serverId,
        race: (charData.race === '천족' || charData.race === 'Elyos') ? 'elyos' : 'asmodian',
        class: charData.class,
        level: charData.level,
        itemLevel: charData.power || charData.item_level || 0, // Use combat power as proxy for now if item_level missing
        profileImage: charData.character_image_url || '',
        timestamp: Date.now()
      }

      history.unshift(newEntry)

      // Limit to 10
      if (history.length > 10) {
        history = history.slice(0, 10)
      }

      localStorage.setItem('aion_recent_searches', JSON.stringify(history))
    } catch (e) {
      console.error("Failed to save history", e)
    }
  }

  const fetchData = async (refresh = false) => {
    try {
      setLoading(true)
      setError(null)
      setDebugLogs([]) // 새 요청 시 로그 초기화
      addDebugLog(`시작: serverName=${serverName}, charName=${charName}, race=${raceParam}`)

      if (isMock) {
        // console.log('Using MOCK data')
        await new Promise(r => setTimeout(r, 500)) // Fake delay
        const mockData: CharacterData = {
          id: 2002, // Zikel ID approx
          name: '죄수',
          server: '지켈',
          class: '살성',
          level: 55,
          power: 3496, // Example power
          power_index: 3496,
          updated_at: new Date().toISOString(),
          race: '마족',
          character_image_url: '/param/class/1_1.jpg',
          item_level: 0
        }
        setData(mockData)
        // Pass mock server ID (e.g. 2002 for Zikel)
        saveToHistory(mockData, 2002)
        setLoading(false)
        return
      }

      // console.log('Fetching data for:', charName, serverName)

      // Map server name to ID for accurate search
      const targetSearchServerId = SERVER_NAME_TO_ID[serverName]
      addDebugLog(`서버 ID 매핑: ${serverName} -> ${targetSearchServerId}`)

      // Step 1: Search with Server ID if available, otherwise Global
      addDebugLog(`검색 API 호출 중...`)
      const searchResponse = await supabaseApi.searchCharacter(charName, targetSearchServerId, raceParam)
      const searchResults = searchResponse.list
      addDebugLog(`검색 결과: ${searchResults.length}개 찾음`)

      // Filter by server name or ID locally.
      let match = searchResults.find(r => {
        // "all" 서버인 경우 서버 필터링 없이 첫 번째 결과 사용
        if (serverName === 'all' || serverName === '전체') {
          return true
        }
        // serverId로 매칭 (API는 serverId로 반환, DB는 server_id로 반환)
        const resultServerId = r.serverId || r.server_id
        if (targetSearchServerId && resultServerId) {
          return resultServerId === targetSearchServerId
        }
        // serverName으로 매칭 (API는 serverName으로 반환, DB는 server로 반환)
        const resultServerName = r.serverName || r.server
        return resultServerName === serverName
      })

      // 검색 실패 시 DB 직접 조회 폴백
      if (!match && targetSearchServerId) {
        addDebugLog(`검색 실패, DB 직접 조회 시도...`)
        try {
          const dbFallbackRes = await fetch(
            `https://mnbngmdjiszyowfvnzhk.supabase.co/rest/v1/characters?name=eq.${encodeURIComponent(charName)}&server_id=eq.${targetSearchServerId}&select=character_id,name,server_id,class_name,race_name,profile_image&limit=1`,
            {
              headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'
              }
            }
          )
          if (dbFallbackRes.ok) {
            const dbData = await dbFallbackRes.json()
            if (dbData && dbData.length > 0) {
              const dbChar = dbData[0]
              addDebugLog(`DB 직접 조회 성공: ${dbChar.character_id}`)
              match = {
                characterId: dbChar.character_id,
                name: dbChar.name,
                server_id: dbChar.server_id,
                server: serverName,
                job: dbChar.class_name,
                race: dbChar.race_name,
                level: 0,
                imageUrl: dbChar.profile_image
              }
            }
          }
        } catch (dbErr) {
          addDebugLog(`DB 직접 조회 실패: ${dbErr}`)
        }
      }

      if (!match) {
        const resultServers = searchResults.map(r => r.serverName || r.server).filter(Boolean)
        addDebugLog(`ERROR: 매칭 실패 - 검색결과 서버: ${resultServers.join(', ')}`)

        // 다른 서버에서 발견된 경우 자동 리다이렉트
        const foundServer = searchResults[0]?.serverName || searchResults[0]?.server
        if (searchResults.length > 0 && foundServer && foundServer !== serverName) {
          addDebugLog(`다른 서버에서 발견: ${foundServer}, 리다이렉트 중...`)
          window.location.href = `/c/${encodeURIComponent(foundServer)}/${encodeURIComponent(charName)}`
          return
        }

        throw new Error(`'${serverName}' 서버에서 '${charName}' 캐릭터를 찾을 수 없습니다. (ID: ${targetSearchServerId || 'unknown'})`)
      }
      addDebugLog(`매칭 성공: characterId=${match.characterId}`)

      // Step 2: Get Detail from Local API and OCR Stats in parallel
      const serverId = match.serverId || match.server_id || SERVER_NAME_TO_ID[serverName] || 1
      const encodedCharacterId = encodeURIComponent(match.characterId)
      const forceParam = refresh ? '&force=true' : ''
      const apiUrl = `${getApiBaseUrl()}/api/character?id=${encodedCharacterId}&server=${serverId}${forceParam}`
      addDebugLog(`상세 API 호출: ${apiUrl}`)

      // OCR 스탯 조회 URL 준비 (병렬 실행을 위해)
      const normalizedCharIdForOcr = normalizeCharacterId(match.characterId)
      const ocrUrl = `/api/character/ocr-stats?characterId=${encodeURIComponent(normalizedCharIdForOcr)}`
      addDebugLog(`OCR 조회 URL (병렬): ${ocrUrl}`)

      // 상세 API와 OCR API를 병렬로 호출
      const [detailRes, ocrRes] = await Promise.all([
        fetch(apiUrl),
        fetch(ocrUrl).catch(err => {
          console.error('OCR fetch error:', err)
          return null
        })
      ])

      addDebugLog(`상세 API 응답: status=${detailRes.status}`)
      if (ocrRes) {
        addDebugLog(`OCR 응답 상태: ${ocrRes.status} ${ocrRes.statusText}`)
      }

      if (!detailRes.ok) {
        const errorText = await detailRes.text().catch(() => '')
        addDebugLog(`ERROR: API 실패 - ${errorText}`)
        throw new Error(`캐릭터 상세 API 호출 실패 (status: ${detailRes.status})${errorText ? ` - ${errorText}` : ''}`)
      }

      const detail = await detailRes.json()

      // API 응답 구조 검증
      if (!detail || !detail.profile) {
        addDebugLog(`ERROR: 응답에 profile이 없음 - ${JSON.stringify(detail).substring(0, 200)}`)
        throw new Error('캐릭터 정보가 올바르지 않습니다. 잠시 후 다시 시도해주세요.')
      }

      if (!detail.profile.characterId) {
        addDebugLog(`ERROR: characterId 없음 - profile: ${JSON.stringify(detail.profile).substring(0, 200)}`)
        throw new Error('캐릭터 ID를 찾을 수 없습니다.')
      }

      addDebugLog(`상세 데이터 수신 완료: ${detail.profile.characterName || 'unknown'}`)

      // Transform logic
      let mappedStats = detail.stats || {}
      const mappedTitles = detail.titles || {}
      // console.log('Titles data:', detail.titles)
      // console.log('Mapped titles:', mappedTitles)
      const mappedDaevanion = detail.daevanion || {}
      const mappedRankings = detail.rankings || {}

      // OCR 스탯 처리 (이미 병렬로 가져옴)
      let fetchedOcrStats: OcrStat[] | null = null
      try {
        if (ocrRes && ocrRes.ok) {
          const ocrData = await ocrRes.json()
          addDebugLog(`OCR 응답 데이터: ${JSON.stringify(ocrData)}`)

          if (ocrData.stats && Array.isArray(ocrData.stats) && ocrData.stats.length > 0) {
            addDebugLog(`OCR 스탯 ${ocrData.stats.length}개 발견: ${ocrData.stats.map((s: any) => s.name).join(', ')}`)
            fetchedOcrStats = ocrData.stats
            // statList에도 병합 (호환성 유지)
            mappedStats = mergeStatsWithOcr(mappedStats, ocrData.stats)
          } else {
            addDebugLog(`OCR 스탯 없음 (stats=${JSON.stringify(ocrData.stats)})`)
          }
        } else if (ocrRes) {
          addDebugLog(`OCR 조회 실패: status=${ocrRes.status}`)
        } else {
          addDebugLog(`OCR 조회 스킵 (fetch 실패)`)
        }
      } catch (ocrErr) {
        console.error('OCR stats parse error:', ocrErr)
        addDebugLog(`OCR 파싱 에러: ${ocrErr}`)
        // OCR 스탯 조회 실패해도 계속 진행
      }

      // Pass appearance data if available
      const mappedEquipment = mapEquipment(detail.equipment, detail.petwing, detail.appearance || detail.costume)

      // Process skills: add sequence number and category
      const processSkills = (skillData: any) => {
        if (!skillData || !skillData.skillList) return skillData

        const skillList = skillData.skillList.map((skill: any, index: number) => {
          const sequenceNumber = index + 1
          let skillCategory = 'active'

          if (sequenceNumber >= 13 && sequenceNumber <= 22) {
            skillCategory = 'passive'
          } else if (sequenceNumber >= 23) {
            skillCategory = 'stigma'
          }

          return {
            ...skill,
            sequenceNumber,
            skillCategory
          }
        })

        return {
          ...skillData,
          skillList
        }
      }

      const mappedSkills = processSkills(detail.skill)

      // Update State
      setData({
        id: 0,
        characterId: detail.profile.characterId,  // v2.2: 전투력 저장용
        name: detail.profile.characterName,
        server: detail.profile.serverName,
        class: detail.profile.className,
        level: detail.profile.characterLevel,
        power: 0,
        updated_at: new Date().toISOString(),
        character_image_url: detail.profile.profileImage,
        item_level: detail.profile.jobLevel,
        race: detail.profile.raceName,
        stats: mappedStats,
        skills: mappedSkills,
        title_name: detail.profile.titleName,
        title_grade: detail.profile.titleGrade,
        title_id: detail.profile.titleId
      })


      setMappedEquipment(mappedEquipment)
      setMappedStats(mappedStats)
      setOcrStats(fetchedOcrStats)
      setMappedTitles(mappedTitles)
      setMappedDaevanion(mappedDaevanion)
      setMappedRankings(mappedRankings)
      setMappedSkills(mappedSkills)

      // Set API params for DevanionBoard - use detail.profile.characterId for correct character
      setApiCharacterId(detail.profile.characterId)
      setApiServerId(String(serverId))

      // Supabase DB에서 item_level, pve_score 가져오기
      try {
        const dbRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/characters?character_id=eq.${encodeURIComponent(detail.profile.characterId)}&select=item_level,pve_score,pvp_score,pve_score`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json'
            }
          }
        )
        if (dbRes.ok) {
          const dbData = await dbRes.json()
          if (dbData && dbData.length > 0) {
            const dbItemLevel = dbData[0].item_level
            const dbNoaScore = dbData[0].pve_score
            const dbPvpScore = dbData[0].pvp_score
            const dbPveScore = dbData[0].pve_score
            addDebugLog(`DB에서 item_level=${dbItemLevel}, pve_score=${dbNoaScore}, pvp=${dbPvpScore}, pve=${dbPveScore} 로드`)

            // Update data with DB values
            setData(prev => prev ? {
              ...prev,
              item_level: dbItemLevel || prev.item_level,
              power: dbNoaScore || prev.power,
              pvp_score: dbPvpScore,
              pve_score: dbPveScore
            } : prev)
          }
        }
      } catch (dbErr) {
        console.error('Failed to fetch item_level from DB:', dbErr)
      }

      // --- SYNC JOB TO DB ---
      // If we have a valid Korean class name, sync it to the DB to fix any "pcId:X" issues in ranking
      const className = detail.profile.className
      if (className && /[가-힣]/.test(className) && !className.startsWith('pcId')) {
        fetch('/api/character/sync-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: detail.profile.characterId,
            serverId: serverId,
            job: className,
            level: detail.profile.characterLevel,
            race: detail.profile.raceName,
            name: detail.profile.characterName
          })
        }).catch(console.error)
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || '캐릭터 정보를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [serverName, charName, isMock])

  const handleRefresh = useCallback(() => {
    if (loading) return
    const confirmRefresh = window.confirm('최신 데이터를 강제로 불러오시겠습니까? 시간이 소요될 수 있습니다.')
    if (confirmRefresh) {
      fetchData(true)
    }
  }, [loading])

  // 메모이제이션: 장비 + 악세서리 배열 (렌더링마다 새 배열 생성 방지)
  // 주의: hooks는 모든 조건문 전에 호출해야 함
  const combinedEquipment: any[] = useMemo(() =>
    [...mappedEquipment.equipment, ...mappedEquipment.accessories],
    [mappedEquipment.equipment, mappedEquipment.accessories]
  )

  // 대표 캐릭터 설정
  const handleSetMainCharacter = async () => {
    if (!data) return

    const currentServerId = SERVER_NAME_TO_ID[data.server] || parseInt(apiServerId || '0')

    // 로컬 DB에서 hit_score(pve_score) 가져오기
    let hitScore: number | undefined = undefined
    let itemLevel: number | undefined = data.item_level

    if (apiCharacterId) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/characters?character_id=eq.${encodeURIComponent(apiCharacterId)}&select=pve_score,item_level`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Content-Type': 'application/json'
            }
          }
        )
        if (res.ok) {
          const dbData = await res.json()
          if (dbData && dbData.length > 0) {
            hitScore = dbData[0].pve_score // DB 필드명은 pve_score
            if (!itemLevel && dbData[0].item_level) {
              itemLevel = dbData[0].item_level
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch hit_score from DB', e)
      }
    }

    const mainChar: MainCharacter = {
      characterId: apiCharacterId || '',
      name: data.name,
      server: data.server,
      server_id: currentServerId,
      race: data.race || '',
      className: data.class,
      level: data.level,
      hit_score: hitScore,
      item_level: itemLevel,
      imageUrl: data.character_image_url,
      setAt: Date.now()
    }

    try {
      localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(mainChar))
      window.dispatchEvent(new Event('mainCharacterChanged'))
      alert(`${data.name} 캐릭터가 대표 캐릭터로 설정되었습니다.`)
    } catch (e) {
      console.error('Failed to set main character', e)
      alert('대표 캐릭터 설정에 실패했습니다.')
    }
  }

  // Skeleton Loading UI
  if (loading) {
    return (
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {/* Skeleton Header */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Profile Skeleton */}
            <div style={{ width: '280px' }}>
              <div style={{
                background: 'linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '12px',
                height: '320px'
              }} />
            </div>
            {/* Center Skeleton */}
            <div style={{ flex: 1 }}>
              <div style={{
                background: 'linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '12px',
                height: '400px'
              }} />
            </div>
          </div>
          {/* Loading text */}
          <div style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1rem', fontWeight: 600 }}>
            캐릭터 정보를 불러오는 중...
          </div>
        </div>
        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: 'var(--bg-main)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: '#1F2937',
          border: '1px solid #EF4444',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center'
        }}>
          {/* Error Icon */}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>

          {/* Error Message */}
          <div style={{ color: '#EF4444', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>
            {error}
          </div>

          {/* Debug Logs (collapsible) */}
          {debugLogs.length > 0 && (
            <details style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <summary style={{ color: '#9CA3AF', cursor: 'pointer', marginBottom: '0.5rem' }}>
                디버그 로그 보기
              </summary>
              <div style={{
                background: '#111318',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#9CA3AF',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {debugLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </details>
          )}

          {/* Copy Error Button */}
          <button
            onClick={() => {
              const errorInfo = {
                error,
                url: window.location.href,
                logs: debugLogs,
                timestamp: new Date().toISOString()
              }
              navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2))
              alert('에러 정보가 복사되었습니다.')
            }}
            style={{
              background: '#374151',
              color: '#E5E7EB',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '0.875rem'
            }}
          >
            📋 에러 정보 복사
          </button>

          {/* Retry Button */}
          <button
            onClick={() => fetchData(true)}
            style={{
              background: 'var(--primary)',
              color: '#000',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  // 모바일 감지 전 로딩 (플래시 방지)
  if (isMobile === null) {
    return null // LayoutClient에서 로딩 화면 표시
  }

  // 모바일 뷰 렌더링
  if (isMobile) {
    return (
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>
        <CharacterDetailMobile
          data={data}
          mappedEquipment={mappedEquipment}
          mappedStats={mappedStats}
          mappedSkills={mappedSkills}
          mainCharacterData={mainCharacterData}
          onItemClick={handleItemClick}
          onRegisterMainCharacter={(char) => {
            const mainChar: MainCharacter = {
              characterId: char.characterId,
              name: char.name,
              server: char.server,
              server_id: char.server_id || SERVER_NAME_TO_ID[char.server] || 1,
              race: char.race || '',
              className: char.className,
              level: char.level,
              hit_score: char.pve_score || char.pve_score,
              pve_score: char.pve_score,
              pvp_score: char.pvp_score,
              item_level: char.item_level,
              imageUrl: char.imageUrl,
              setAt: Date.now()
            }
            localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(mainChar))
            window.dispatchEvent(new Event('mainCharacterChanged'))
            alert(`${char.name} 캐릭터가 실시간 비교 대상으로 등록되었습니다.`)
          }}
        />
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={handleCloseModal}
            isMobile={isMobile}
          />
        )}
      </div>
    )
  }

  if (!data) return null

  // 데이터 부분 누락 경고 확인
  const hasStatsWarning = !mappedStats?.statList || mappedStats.statList.length === 0
  const hasEquipmentWarning = mappedEquipment.equipment.length === 0 && mappedEquipment.accessories.length === 0
  const showDataWarning = hasStatsWarning || hasEquipmentWarning

  // --- Dummy Components Data (REMOVED/REPLACED) ---
  const dummyDevanionData = {
    boards: { '네자칸': { progress: '완료', activeNodes: 45, totalNodes: 45, effects: ['물리 공격력 +5%', '치명타 +120'] } },
    totalInvestment: 0,
    globalRank: 0
  }

  return (
    <div className="char-detail-page">
      {/* 데이터 부분 누락 경고 배너 */}
      {showDataWarning && (
        <div style={{
          background: 'linear-gradient(90deg, #92400E 0%, #78350F 100%)',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#FEF3C7', fontWeight: 600, marginBottom: '2px' }}>
              일부 데이터가 로드되지 않았습니다
            </div>
            <div style={{ color: '#FDE68A', fontSize: '0.85rem' }}>
              {hasStatsWarning && '능력치 정보가 없습니다. '}
              {hasEquipmentWarning && '장비 정보가 없습니다. '}
              새로고침 버튼을 눌러 다시 시도해보세요.
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            style={{
              background: '#F59E0B',
              color: '#000',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            새로고침
          </button>
        </div>
      )}

      {/* Adaptive Styles */}
      <style jsx>{`
        .char-detail-page {
          width: 100%;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          min-height: 100vh;
          position: relative;
          box-sizing: border-box;
        }
        .debug-panel {
          display: none;
        }
        .fab-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .refresh-fab, .main-char-fab {
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .refresh-fab {
          background: #facc15;
          color: #0f172a;
          box-shadow: 0 4px 12px rgba(250, 204, 21, 0.4);
        }
        .main-char-fab {
          background: #1f2937;
          border: 2px solid #facc15;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .refresh-fab:hover, .main-char-fab:hover {
          transform: scale(1.1);
        }
        .grid-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        .left-column, .center-column, .right-column {
          width: 100%;
        }

        /* Desktop: 1200px fixed - 3 columns */
        @media (min-width: 1025px) {
          .char-detail-page {
            width: 1280px;
            padding: 2rem;
          }
          .debug-panel {
            display: block;
            position: fixed;
            top: 100px;
            left: 10px;
            width: 200px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            padding: 12px;
            background: rgba(15, 17, 23, 0.95);
            border: 1px solid #374151;
            border-radius: 8px;
            font-size: 0.75rem;
            color: #9CA3AF;
            z-index: 9999;
          }
          .fab-container {
            bottom: 30px;
            right: 30px;
          }
          .refresh-fab, .main-char-fab {
            width: 60px;
            height: 60px;
          }
          .grid-container {
            display: grid !important;
            grid-template-columns: 280px 440px 1fr !important;
            gap: 2rem !important;
            align-items: start !important;
            width: 100%;
          }
          .left-column {
            width: 280px;
            min-width: 280px;
            max-width: 280px;
          }
          .center-column {
            width: 440px;
            min-width: 440px;
            max-width: 440px;
            overflow: visible;
          }
          .right-column {
            min-width: 300px;
            flex: 1;
            overflow: visible;
          }
          .detail-section {
            grid-column: 1 / -1;
          }
        }

        /* Tablet: 768px fixed - 2 columns */
        @media (min-width: 769px) and (max-width: 1024px) {
          .char-detail-page {
            width: 768px;
            padding: 1.5rem;
          }
          .grid-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1rem !important;
          }
          .left-column {
            grid-column: 1 / 2;
          }
          .center-column {
            grid-column: 2 / 3;
          }
          .right-column {
            grid-column: 1 / -1;
          }
          .detail-section {
            grid-column: 1 / -1;
          }
        }

        /* Mobile: 100% - 1 column */
        @media (max-width: 768px) {
          .char-detail-page {
            width: 100%;
            padding: 1rem;
          }
          .grid-container {
            gap: 0.75rem;
          }
          .fab-container {
            bottom: 16px;
            right: 16px;
            gap: 8px;
          }
          .refresh-fab, .main-char-fab {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>

      {/* FAB Buttons Container */}
      <div className="fab-container">
        {/* Set Main Character FAB */}
        <button
          onClick={handleSetMainCharacter}
          disabled={loading}
          title="대표 캐릭터로 설정"
          className="main-char-fab"
          style={{ cursor: loading ? 'wait' : 'pointer' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>

        {/* Refresh FAB */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          title="데이터 강제 갱신"
          className="refresh-fab"
          style={{ cursor: loading ? 'wait' : 'pointer' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
      </div>

      {/* Grid Layout - Adaptive */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="grid-container">
          {/* LEFT COLUMN: Profile Section */}
          <div className="left-column">
            <ProfileSection
              character={data}
              arcana={mappedEquipment.arcana}
              onArcanaClick={handleItemClick}
              stats={mappedStats}
              equipment={combinedEquipment}
              titles={mappedTitles}
              daevanion={mappedDaevanion}
              equippedTitleId={data.title_id}
              ocrStats={ocrStats || undefined}
            />
          </div>

          {/* CENTER COLUMN: Equipment & Skills */}
          <div className="center-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <DSTabs
                variant="pill"
                fullWidth
                defaultTab="equipment"
                tabs={[
                  {
                    id: 'equipment',
                    label: '장비',
                    content: (
                      <div style={{ marginTop: '1.5rem' }}>
                        <EquipmentGrid
                          equipment={mappedEquipment.equipment}
                          accessories={mappedEquipment.accessories}
                          pets={mappedEquipment.pets}
                          wings={mappedEquipment.wings}
                          onItemClick={handleItemClick}
                          appearance={mappedEquipment.appearance}
                          debugInfo={mappedEquipment.debugInfo}
                        />
                      </div>
                    )
                  },
                  {
                    id: 'skills',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        ✨ 스킬
                      </span>
                    ),
                    content: (
                      <div style={{ marginTop: '1.5rem' }}>
                        {(!mappedSkills || !mappedSkills.skillList || mappedSkills.skillList.length === 0) ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '4rem 2rem',
                            color: '#6B7280',
                            background: '#1F2937',
                            borderRadius: '12px',
                            border: '1px solid #374151',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                          }}>
                            <div style={{ fontSize: '3rem', opacity: 0.5 }}>📚</div>
                            <div style={{ fontSize: '1.125rem' }}>스킬 정보가 없습니다.</div>
                          </div>
                        ) : (
                          <SkillSection skills={mappedSkills} />
                        )}
                      </div>
                    )
                  },
                  {
                    id: 'stats',
                    label: '능력치',
                    content: (
                      <div style={{ marginTop: '1.5rem' }}>
                        <StatsSummaryView
                          stats={mappedStats}
                          equipment={combinedEquipment}
                          daevanion={mappedDaevanion}
                          titles={mappedTitles}
                          equippedTitleId={data.title_id}
                          ocrStats={ocrStats || undefined}
                        />
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Stats Only */}
          <div className="right-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 1. Title Card (Always Visible) */}
            <TitleCard titles={mappedTitles} />

            {/* 2. Ranking Info - Replaces MainStats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <RankingCard rankings={mappedRankings} />
            </div>

            {/* 3. Daevanion Card (Bottom Fixed) */}
            <DaevanionCard daevanion={mappedDaevanion} />
          </div>

          {/* Item Detail Modal (Global) */}
          {selectedItem && (
            <ItemDetailModal
              item={selectedItem}
              onClose={handleCloseModal}
              isMobile={isMobile}
            />
          )}

          {/* DETAILED VIEW SECTION */}
          <div className="detail-section">
            <DetailedViewSection
              daevanion={mappedDaevanion}
              characterId={apiCharacterId}
              serverId={apiServerId}
              race={data?.race}
              characterClass={data?.class}
              boardList={mappedDaevanion?.boardList}
              equipment={mappedEquipment.equipment}
              accessories={mappedEquipment.accessories}
              arcana={mappedEquipment.arcana}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
