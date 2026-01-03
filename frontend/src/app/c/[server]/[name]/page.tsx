'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import ProfileSection from '../../../components/ProfileSection'
import TitleCard from '../../../components/TitleCard'
import MainStatsCard from '../../../components/MainStatsCard'
import DaevanionCard from '../../../components/DaevanionCard'
import EquipmentGrid from '../../../components/EquipmentGrid'
import { supabaseApi, CharacterDetail, SERVER_NAME_TO_ID } from '../../../../lib/supabaseApi'
import RankingCard from '../../../components/RankingCard'
import EquipmentDetailList from '../../../components/EquipmentDetailList'
import ItemDetailModal from '../../../components/ItemDetailModal'
import SkillSection from '../../../components/SkillSection'
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

const mapEquipment = (rawEquipment: any): { equipment: any[], accessories: any[], arcana: any[] } => {
  if (!rawEquipment?.equipmentList) return { equipment: [], accessories: [], arcana: [] }

  const equipment: any[] = []
  const accessories: any[] = []
  const arcana: any[] = []

  const list = rawEquipment.equipmentList || []

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
    '귀고리 쪽': '귀걸이1', '귀고리 짝': '귀걸이2', '반지 쪽': '반지1', '반지 짝': '반지2', '목걸이': '목걸이', '날개': '망토', '허리': '허리띠'
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
      else if (searchTarget.includes('날개') || searchTarget.includes('wing')) slotName = '망토'
    }

    // Additional Normalization to ensure strict match
    if (slotName === '상의') slotName = '흉갑'
    if (slotName === '하의') slotName = '각반'
    if (slotName === '어깨') slotName = '견갑'
    if (slotName === '신발') slotName = '장화'
    if (slotName === '다리') slotName = '각반'
    if (slotName === '손') slotName = '장갑'
    if (slotName === '머리') slotName = '투구'
    if (slotName === '날개' || slotName === 'Bird') slotName = '망토'

    // Check if this is an Arcana item (slotPos 41-45 or slotPosName starts with "Arcana")
    const isArcana = (item.slotPos >= 41 && item.slotPos <= 45) || rawSlot?.startsWith('Arcana')

    let isAccessory = false
    let isEquipment = false

    if (accessorySortOrder[slotName]) {
      isAccessory = true
    } else if (equipmentSortOrder[slotName]) {
      isEquipment = true
    } else {
      // Fallback checks
      isAccessory = !isArcana && slotName && (
        slotName.includes('귀걸이') ||
        slotName.includes('목걸이') ||
        slotName.includes('반지') ||
        slotName.includes('팔찌') ||
        slotName.includes('룬') ||
        slotName.includes('아뮬렛') ||
        slotName.includes('부적')
      )
    }

    const mappedItem = {
      slot: slotName,
      name: item.name || item.itemName,
      enhancement: item.enchantLevel > 0 ? `+${item.enchantLevel}` : '',
      tier: gradeMap[item.grade] || item.gradeCode || 3,
      grade: item.grade, // 아이템 등급 (색상 결정용)
      image: item.icon || item.image || item.itemArt,
      category: item.categoryName,
      breakthrough: item.exceedLevel || 0, // 공식 사이트와 동일한 필드명 사용!
      soulEngraving: item.soulEngraving ? { grade: item.soulEngraving.grade, percentage: item.soulEngraving.value } : undefined,
      manastones: item.manastoneList?.map((m: any) => ({ type: m.name, value: m.point })) || [],
      raw: item
    }

    if (isArcana) {
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

  return { equipment, accessories, arcana }
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
  if (!rawDevanion?.boardList) return { boards: {}, totalInvestment: 0, globalRank: 0 }

  // Transform logic if needed, currently passing raw structure or empty
  // Assuming UI can handle or we create a simple structure
  return {
    boards: {}, // Implement complex mapping if structure known
    totalInvestment: 0,
    globalRank: 0
  }
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
  const [activeTab, setActiveTab] = useState('basic')

  // Mapped Data States
  const [mappedEquipment, setMappedEquipment] = useState<{ equipment: any[], accessories: any[], arcana: any[] }>({ equipment: [], accessories: [], arcana: [] })
  const [mappedStats, setMappedStats] = useState<any>({})
  const [mappedTitles, setMappedTitles] = useState<any>({})
  const [mappedDaevanion, setMappedDaevanion] = useState<any>({})
  const [mappedRankings, setMappedRankings] = useState<any>({})
  const [mappedSkills, setMappedSkills] = useState<any>(null)

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

      // Step 1: Search to find ID (Global search to find exact match in any page)
      const searchResults = await supabaseApi.searchCharacter(charName, undefined, raceParam)

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

      // Step 2: Get Detail
      let detail: CharacterDetail
      // Use the server ID directly from the search result if available.
      // Falls back to parsing server name (which likely fails for strings) or defaults to 1.
      const targetServerId = (match as any).server_id || parseInt(match.server) || 1

      if (refresh) {
        detail = await supabaseApi.refreshCharacter(match.characterId, targetServerId)
      } else {
        detail = await supabaseApi.getCharacterDetail(match.characterId, targetServerId)
      }

      console.log('Got detail:', detail)
      setRawData(detail)

      // Step 3: Map to UI Model
      const mapped: CharacterData = {
        id: detail.server_id,
        name: detail.name,
        server: serverName,
        class: detail.class_name,
        level: detail.level,
        power: detail.combat_power || 0,
        power_index: detail.combat_power,
        updated_at: detail.updated_at || new Date().toISOString(),
        race: detail.race_name,
        character_image_url: detail.profile_image,
        tier_rank: 'Unranked', // TODO: Map from ranking info if available
        percentile: 0,
        rank: 0,
        item_level: 0,
        skills: detail.skills
      }

      setData(mapped)

      // Map Sub-Components
      setMappedEquipment(mapEquipment(detail.equipment))
      setMappedStats(detail.stats || {})
      setMappedTitles(detail.titles || {})
      setMappedDaevanion(detail.daevanion || {})
      setMappedRankings(detail.rankings || {})
      setMappedSkills(detail.skills || {})

      saveToHistory(mapped, detail.server_id)

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
          @media (min-width: 1024px) {
            .grid-container {
              display: grid !important;
              grid-template-columns: 280px minmax(400px, 1fr) 450px !important;
              gap: 1.5rem !important;
            }
          }
          @media (max-width: 1023px) {
            .grid-container {
              display: flex !important;
              flex-direction: column !important;
              gap: 1.5rem !important;
            }
          }
        `}</style>
        <div className="grid-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* LEFT COLUMN: Profile Section */}
          <div>
            <ProfileSection character={data} arcana={mappedEquipment.arcana} />
          </div>

          {/* CENTER COLUMN: Equipment */}
          <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1rem',
            // height: '638px', // Fixed height removed to show all items
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              borderBottom: '1px solid #1F2433',
              paddingBottom: '0.5rem',
              flexShrink: 0
            }}>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: 'bold',
                color: '#E5E7EB',
                margin: 0
              }}>
                장비 & 장신구
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                마우스 올리면 상세정보
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <EquipmentGrid equipment={mappedEquipment.equipment} accessories={mappedEquipment.accessories} onItemClick={handleItemClick} />
            </div>
          </div>

          {/* RIGHT COLUMN: MainStats, Title, Daevanion */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <MainStatsCard stats={mappedStats} />
            <RankingCard rankings={mappedRankings} />
            <TitleCard titles={mappedTitles} />
            <DaevanionCard daevanion={mappedDaevanion} />
          </div>
        </div>

        {/* Detailed Equipment List */}
        <EquipmentDetailList equipment={mappedEquipment.equipment} accessories={mappedEquipment.accessories} onItemClick={handleItemClick} />

        {/* SKILL SECTION */}
        <div style={{ width: '100%', marginTop: '1.5rem' }}>
          <SkillSection skills={mappedSkills} />
        </div>

        {/* Item Detail Modal */}
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </div>
  )
}
