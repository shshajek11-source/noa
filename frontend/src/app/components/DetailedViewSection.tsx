'use client'
import { useState } from 'react'
import GrowthChartView from './GrowthChartView'
import EquipmentDetailView from './EquipmentDetailView'
import DaevanionBoard from './DevanionBoard'
import LegionView from './LegionView'

interface DaevanionBoardItem {
    id: number
    name: string
    totalNodeCount: number
    openNodeCount: number
    icon?: string
    open?: number
}

interface DetailedViewSectionProps {
    daevanion?: any
    characterId?: string
    serverId?: string
    race?: string
    characterClass?: string
    boardList?: DaevanionBoardItem[]
}

export default function DetailedViewSection({ daevanion, characterId, serverId, race, characterClass, boardList }: DetailedViewSectionProps) {
    const [activeTab, setActiveTab] = useState<'growth' | 'equipment' | 'daevanion' | 'legion'>('growth')

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.25rem',
            marginTop: '1.5rem',
            width: '100%'
        }}>
            {/* 탭 버튼 */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #1F2433',
                paddingBottom: '0.75rem'
            }}>
                <TabButton active={activeTab === 'growth'} onClick={() => setActiveTab('growth')}>
                    성장그래프
                </TabButton>
                <TabButton active={activeTab === 'equipment'} onClick={() => setActiveTab('equipment')}>
                    장비상세보기
                </TabButton>
                <TabButton active={activeTab === 'daevanion'} onClick={() => setActiveTab('daevanion')}>
                    데바니온
                </TabButton>
                <TabButton active={activeTab === 'legion'} onClick={() => setActiveTab('legion')}>
                    레기온
                </TabButton>
            </div>

            {/* 탭 콘텐츠 */}
            <div>
                {activeTab === 'growth' && <GrowthChartView />}
                {activeTab === 'equipment' && <EquipmentDetailView />}
                {activeTab === 'daevanion' && <DaevanionBoard characterId={characterId} serverId={serverId} race={race} characterClass={characterClass} boardList={boardList} />}
                {activeTab === 'legion' && <LegionView />}
            </div>
        </div>
    )
}

interface TabButtonProps {
    active: boolean
    onClick: () => void
    children: React.ReactNode
}

function TabButton({ active, onClick, children }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? '#2563EB' : '#0B0D12',
                color: active ? '#FFFFFF' : '#9CA3AF',
                border: active ? '1px solid #3B82F6' : '1px solid #1F2433',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: active ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.background = '#1F2433'
                    e.currentTarget.style.color = '#E5E7EB'
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.background = '#0B0D12'
                    e.currentTarget.style.color = '#9CA3AF'
                }
            }}
        >
            {children}
        </button>
    )
}
