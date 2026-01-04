'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ProfileSection from '../../../components/ProfileSection'
import TitleCard from '../../../components/TitleCard'
import MainStatsCard from '../../../components/MainStatsCard'
import DaevanionCard from '../../../components/DaevanionCard'
import EquipmentGrid from '../../../components/EquipmentGrid'
import AccordionCard from '../../../components/AccordionCard'
import { supabaseApi, CharacterDetail, SERVER_NAME_TO_ID, getApiBaseUrl } from '../../../../lib/supabaseApi'
import RankingCard from '../../../components/RankingCard'
import EquipmentDetailList from '../../../components/EquipmentDetailList'
import ItemDetailModal from '../../../components/ItemDetailModal'
import SkillSection from '../../../components/SkillSection'
import DetailedViewSection from '../../../components/DetailedViewSection'
import { RecentCharacter } from '../../../../types/character'

// --- Types mapping to UI components ---
type CharacterData = {
  id: number
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

  console.log('[DEBUG] mappedEquipment - rawPetWings:', rawPetWings)
  console.log('[DEBUG] mappedEquipment - safePetWings:', safePetWings)

  // Check for potential appearance list in rawEquipment
  // Based on debug: keys include 'equipmentList' and 'skinList'
  const skinList = (rawEquipment?.skinList || []).map((item: any) => ({ ...item, _isSkin: true }))
  const appearanceList = rawEquipment?.appearanceList || rawEquipment?.costumeList || []

  // Merge all lists
  const list = [...(rawEquipment?.equipmentList || []), ...safePetWings, ...appearanceList, ...skinList, ...(Array.isArray(rawAppearance) ? rawAppearance : [])]
  console.log('[DEBUG] mappedEquipment - Merged List Length:', list.length)

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
    if (isPet) console.log('[DEBUG] Found Pet:', item.name, item.slotPos)

    // Check if this is Wings (slotPos 52 or contains "날개")
    const isWings = item.slotPos === 52 || slotName?.includes('날개') || slotName?.includes('Wing')
    if (isWings) console.log('[DEBUG] Found Wings:', item.name, item.slotPos)

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
      manastones: item.manastoneList?.map((m: any) => ({ type: m.name, value: m.point })) || [],
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

const mapDevanion = (rawDevanion: any) => {
  // DEBUG: Log raw structure to terminal to identify correct keys
  console.log('[[DEBUG]] mapDevanion raw input:', JSON.stringify(rawDevanion, null, 2));

  const result: any = {
    boards: {},
    totalInvestment: rawDevanion?.totalInvestment || 0,
    globalRank: rawDevanion?.globalRank || 0
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
  const serverName = decodeURIComponent(params.server as string)
  const charName = decodeURIComponent(params.name as string)

  const [data, setData] = useState<CharacterData | null>(null)
  const [rawData, setRawData] = useState<CharacterDetail | null>(null) // Keep full DB response if needed
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('equipment')

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
  const [mappedTitles, setMappedTitles] = useState<any>({})
  const [mappedDaevanion, setMappedDaevanion] = useState<any>({})
  const [mappedRankings, setMappedRankings] = useState<any>({})
  const [mappedSkills, setMappedSkills] = useState<any>(null)

  // API params for DevanionBoard
  const [apiCharacterId, setApiCharacterId] = useState<string | undefined>(undefined)
  const [apiServerId, setApiServerId] = useState<string | undefined>(undefined)

  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
  }

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

      if (isMock) {
        console.log('Using MOCK data')
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

      console.log('Fetching data for:', charName, serverName)

      // Map server name to ID for accurate search
      const targetSearchServerId = SERVER_NAME_TO_ID[serverName]

      // Step 1: Search with Server ID if available, otherwise Global
      const searchResults = await supabaseApi.searchCharacter(charName, targetSearchServerId, raceParam)

      // Filter by server name or ID locally.
      const match = searchResults.find(r => {
        // If we have a verified server ID for the requested server, match strictly by ID
        if (targetSearchServerId && r.server_id) {
          return r.server_id === targetSearchServerId
        }
        // Fallback to name matching
        return r.server === serverName
      })

      if (!match) {
        throw new Error(`'${serverName}' 서버에서 '${charName}' 캐릭터를 찾을 수 없습니다. (ID: ${targetSearchServerId || 'unknown'})`)
      }

      // Step 2: Get Detail from Local API
      const serverId = match.server_id || SERVER_NAME_TO_ID[serverName] || 1
      const res = await fetch(`${getApiBaseUrl()}/api/character?id=${match.characterId}&server=${serverId}`)

      if (!res.ok) {
        throw new Error('Failed to fetch character data')
      }

      const detail = await res.json()

      // Transform logic
      const mappedStats = detail.stats || {}
      const mappedTitles = detail.titles || {}
      console.log('Titles data:', detail.titles)
      console.log('Mapped titles:', mappedTitles)
      const mappedDaevanion = detail.daevanion || {}
      const mappedRankings = detail.rankings || {}

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
        skills: mappedSkills
      })


      setMappedEquipment(mappedEquipment)
      setMappedStats(mappedStats)
      setMappedTitles(mappedTitles)
      setMappedDaevanion(mappedDaevanion)
      setMappedRankings(mappedRankings)
      setMappedRankings(mappedRankings)
      setMappedSkills(mappedSkills)

      // Set API params for DevanionBoard - use detail.profile.characterId for correct character
      setApiCharacterId(detail.profile.characterId)
      setApiServerId(String(serverId))

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
    if (serverName && charName) {
      fetchData()
    }
  }, [serverName, charName, raceParam])

  const handleRefresh = () => {
    if (loading) return
    const confirmRefresh = window.confirm('최신 데이터를 강제로 불러오시겠습니까? 시간이 소요될 수 있습니다.')
    if (confirmRefresh) {
      fetchData(true)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>캐릭터 정보를 불러오는 중...</div>
        <div style={{ fontSize: '0.875rem' }}>AION2 서버와 통신하고 있습니다.</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{
          padding: '2rem',
          background: '#111318',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          color: '#E5E7EB',
          display: 'inline-block'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ef4444' }}>오류 발생</h3>
          <p style={{ color: '#9CA3AF' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.5rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  // --- Dummy Components Data (REMOVED/REPLACED) ---
  const dummyDevanionData = {
    boards: { '네자칸': { progress: '완료', activeNodes: 45, totalNodes: 45, effects: ['물리 공격력 +5%', '치명타 +120'] } },
    totalInvestment: 0,
    globalRank: 0
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '1600px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
      minHeight: '100vh',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      {/* Refresh FAB */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        title="데이터 강제 갱신"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 50,
          background: '#facc15',
          color: '#0f172a',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(250, 204, 21, 0.4)',
          cursor: loading ? 'wait' : 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2v6h-6"></path>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
          <path d="M3 22v-6h6"></path>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
        </svg>
      </button>

      {/* 3-Column Grid Layout - Centered */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        width: '100%',
        gap: '3rem'
      }}>
        {/* Desktop: 3 columns with balanced widths */}
        <style jsx>{`
          .grid-container {
            display: grid !important;
            grid-template-columns: 280px minmax(400px, 1fr) 450px !important;
            gap: 1.5rem !important;
            align-items: stretch !important;
          }
        `}</style>
        <div className="grid-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative'
        }}>
          {/* Extended Background Layer */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            zIndex: 0,
            pointerEvents: 'none'
          }} />

          {/* LEFT COLUMN: Profile Section */}
          <div style={{ minWidth: '280px', position: 'relative', zIndex: 1 }}>
            <ProfileSection
              character={data}
              arcana={mappedEquipment.arcana}
              onArcanaClick={handleItemClick}
              stats={mappedStats}
              equipment={[...mappedEquipment.equipment, ...mappedEquipment.accessories]}
            />
          </div>

          {/* CENTER COLUMN: Equipment & Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, position: 'relative', zIndex: 1, height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
            {/* Tabs - Enhanced 3D Button Style */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              background: '#0B0D12',
              border: '1px solid #1F2433',
              borderRadius: '8px',
              padding: '0.5rem'
            }}>
              {['equipment', 'skills', 'network'].map(tab => {
                const isSkillsTab = tab === 'skills'
                const isActive = activeTab === tab

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      color: isActive ? '#0B0D12' : '#E5E7EB',
                      fontWeight: isActive ? 'bold' : '600',
                      background: isActive
                        ? 'linear-gradient(180deg, #FBBF24 0%, #FACC15 100%)'
                        : 'linear-gradient(180deg, #1F2433 0%, #111318 100%)',
                      border: isActive
                        ? '1px solid #FCD34D'
                        : '1px solid #2D3748',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontSize: '0.875rem',
                      position: 'relative',
                      overflow: 'hidden',
                      // 3D Effect: Active = Pressed, Inactive = Raised
                      boxShadow: isActive
                        ? 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)'
                        : isSkillsTab && !isActive
                          ? '0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05), 0 0 15px rgba(250, 204, 21, 0.15)'
                          : '0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)',
                      transform: isActive ? 'translateY(2px)' : 'translateY(0)',
                      animation: isSkillsTab && !isActive ? 'shimmer 3s ease-in-out infinite' : 'none'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(3px)'
                      e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.4)'
                    }}
                    onMouseUp={(e) => {
                      if (isActive) {
                        e.currentTarget.style.transform = 'translateY(2px)'
                        e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.1)'
                      } else {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)'
                      }
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'linear-gradient(180deg, #2D3748 0%, #1F2433 100%)'
                        e.currentTarget.style.borderColor = '#4B5563'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'linear-gradient(180deg, #1F2433 0%, #111318 100%)'
                        e.currentTarget.style.borderColor = '#2D3748'
                      }
                    }}
                  >
                    {/* Sparkle overlay for skills tab */}
                    {isSkillsTab && !isActive && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.2), transparent)',
                        animation: 'slide 3s ease-in-out infinite',
                        pointerEvents: 'none'
                      }} />
                    )}

                    {tab === 'equipment' ? '장비' : tab === 'skills' ? '✨ 스킬' : '인맥'}
                  </button>
                )
              })}
            </div>


            {/* Sparkle Animation */}
            <style dangerouslySetInnerHTML={{
              __html: `
              @keyframes shimmer {
                0%, 100% {
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05), 0 0 15px rgba(250, 204, 21, 0.15);
                }
                50% {
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05), 0 0 25px rgba(250, 204, 21, 0.3);
                }
              }
              
              @keyframes slide {
                0% {
                  left: -100%;
                }
                100% {
                  left: 200%;
                }
              }
            `}} />

            {/* Tab Content Wrapper with flex: 1 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'equipment' && (
                <EquipmentGrid
                  equipment={mappedEquipment.equipment}
                  accessories={mappedEquipment.accessories}
                  pets={mappedEquipment.pets}
                  wings={mappedEquipment.wings}
                  onItemClick={handleItemClick}
                  appearance={mappedEquipment.appearance}
                  debugInfo={mappedEquipment.debugInfo}
                />
              )}

              {activeTab === 'skills' && (
                <SkillSection skills={mappedSkills} />
              )}

              {activeTab === 'network' && (
                <div style={{ color: '#6B7280', padding: '2rem', textAlign: 'center' }}>
                  인맥 네트워크 기능 준비중...
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Stats Only */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '350px', position: 'relative', zIndex: 1, height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
            {/* 1. Title Card (Always Visible) */}
            <TitleCard titles={mappedTitles} />

            {/* 2. Main Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <MainStatsCard stats={mappedStats} />
            </div>

            {/* 3. Daevanion Card (Bottom Fixed) */}
            <DaevanionCard daevanion={mappedDaevanion} />
          </div>

          {/* Item Detail Modal (Global) */}
          {selectedItem && (
            <ItemDetailModal
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          )}
          {/* BOTTOM SECTION: Ranking Info */}
          <div style={{ width: '100%', position: 'relative', zIndex: 1, gridColumn: '1 / -1' }}>
            <RankingCard rankings={mappedRankings} />
          </div>

          {/* DETAILED VIEW SECTION */}
          <div style={{ width: '100%', position: 'relative', zIndex: 1, gridColumn: '1 / -1' }}>
            <DetailedViewSection daevanion={mappedDaevanion} characterId={apiCharacterId} serverId={apiServerId} />
          </div>
        </div>

      </div>
    </div >
  )
}
