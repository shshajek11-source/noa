'use client'
import { useState, useEffect } from 'react'
import type { DaevanionNode, DaevanionBoardResponse } from '../../types/daevanion'

interface DaevanionBoardProps {
    characterId?: string
    serverId?: string
}

const GODS = [
    { id: 'nezakan', name: '네자칸', boardId: 21, color: '#EF4444', desc: '물리 공격력 및 치명타 강화' },
    { id: 'zikel', name: '지켈', boardId: 22, color: '#FACC15', desc: '방어력 및 생명력 강화' },
    { id: 'baizel', name: '바이젤', boardId: 23, color: '#3B82F6', desc: '이동 속도 및 회피 강화' },
    { id: 'triniel', name: '트리니엘', boardId: 24, color: '#10B981', desc: '상태이상 적중 및 저항' },
    { id: 'ariel', name: '아리엘', boardId: 25, color: '#8B5CF6', desc: '마법 증폭 및 적중' },
    { id: 'asphel', name: '아스펠', boardId: 26, color: '#EC4899', desc: '마법 상쇄 및 저항' }
]

// Grid Constants for 15x15 board
const GRID_SIZE = 15
const CELL_SIZE = 50
const GRID_TOTAL = GRID_SIZE * CELL_SIZE
const PADDING = 40

// Convert API row/col (1-15) to SVG coordinates
const toSvgCoord = (rowOrCol: number) => PADDING + (rowOrCol - 1) * CELL_SIZE + CELL_SIZE / 2

// Grade to color mapping
const gradeColors: Record<string, string> = {
    'Legend': '#F59E0B',
    'Unique': '#8B5CF6',
    'Rare': '#3B82F6',
    'Common': '#374151',
    'None': '#6B7280',
    'Start': '#10B981'
}

export default function DaevanionBoard({ characterId, serverId }: DaevanionBoardProps) {
    const [activeGodIndex, setActiveGodIndex] = useState(0)
    const [hoveredNode, setHoveredNode] = useState<DaevanionNode | null>(null)
    const [boardData, setBoardData] = useState<DaevanionBoardResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const activeGod = GODS[activeGodIndex]

    // Fetch board data when god changes
    useEffect(() => {
        if (!characterId || !serverId) {
            setBoardData(null)
            return
        }

        const fetchBoardData = async () => {
            setLoading(true)
            setError(null)
            try {
                const url = `/api/daevanion?characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&boardId=${activeGod.boardId}`
                const res = await fetch(url)
                if (!res.ok) throw new Error('API 요청 실패')
                const data: DaevanionBoardResponse = await res.json()
                setBoardData(data)
            } catch (err) {
                setError(err instanceof Error ? err.message : '데이터 로드 실패')
                setBoardData(null)
            } finally {
                setLoading(false)
            }
        }

        fetchBoardData()
    }, [characterId, serverId, activeGod.boardId])

    // Calculate stats from API data (matching official site logic)
    // Denominator: Valid nodes (grade !== "None" OR type !== "None") minus Start node
    // Numerator: Active nodes (open === 1)
    const validNodes = boardData?.nodeList.filter(
        (n) => n.grade !== "None" || n.type !== "None"
    ) ?? []
    const validNodesExcludingStart = validNodes.filter((n) => n.type !== "Start")
    const activeNodes = validNodes.filter((n) => n.open === 1).length
    const totalNodes = validNodesExcludingStart.length
    const completionPercent = totalNodes > 0 ? Math.round((activeNodes / totalNodes) * 100) : 0

    return (
        <div style={{
            display: 'flex',
            gap: '1.5rem',
            height: '600px',
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            {/* LEFT: God Selection Sidebar */}
            <div style={{
                width: '260px',
                background: '#0B0D12',
                borderRight: '1px solid #1F2433',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #1F2433',
                    background: '#111318'
                }}>
                    <h3 style={{ margin: 0, color: '#E5E7EB', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        신성력 각인
                    </h3>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                        6명의 주신이 부여하는 권능
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                    {GODS.map((god, idx) => {
                        const isActive = idx === activeGodIndex

                        return (
                            <button
                                key={god.id}
                                onClick={() => setActiveGodIndex(idx)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                    padding: '1rem',
                                    background: isActive ? `linear-gradient(90deg, ${god.color}15, transparent)` : 'transparent',
                                    border: '1px solid transparent',
                                    borderLeft: isActive ? `3px solid ${god.color}` : '3px solid transparent',
                                    borderRadius: '4px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    marginBottom: '0.25rem'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <span style={{
                                        color: isActive ? '#fff' : '#9CA3AF',
                                        fontWeight: isActive ? 'bold' : 'normal',
                                        fontSize: '0.95rem'
                                    }}>
                                        {god.name}
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                    {god.desc}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT: Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: activeGod.color,
                            textShadow: `0 0 20px ${activeGod.color}40`
                        }}>
                            {activeGod.name}
                        </h2>

                        {/* Active Effects Summary */}
                        {boardData && (boardData.openStatEffectList.length > 0 || boardData.openSkillEffectList.length > 0) && (
                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                                marginTop: '0.75rem',
                                maxWidth: '700px'
                            }}>
                                {[...boardData.openStatEffectList, ...boardData.openSkillEffectList].map((effect, i) => (
                                    <span key={i} style={{
                                        padding: '0.25rem 0.75rem',
                                        background: 'rgba(17, 19, 24, 0.6)',
                                        border: `1px solid ${activeGod.color}40`,
                                        borderRadius: '12px',
                                        fontSize: '0.8rem',
                                        color: '#E5E7EB',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {effect.desc}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Progress Stats */}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>진행도</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#E5E7EB' }}>
                            <span style={{ color: activeGod.color }}>{activeNodes}</span> / {totalNodes}
                            <span style={{ fontSize: '0.9rem', color: '#6B7280', marginLeft: '0.5rem' }}>({completionPercent}%)</span>
                        </div>
                    </div>
                </div>

                {/* BOARD VISUALIZATION AREA */}
                <div style={{
                    flex: 1,
                    minHeight: '500px',
                    position: 'relative',
                    background: '#0B0D12',
                    borderRadius: '12px',
                    border: '1px solid #2D3748',
                    marginBottom: '1.5rem',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5)'
                }}>
                    {/* Background Grid Accent */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: `radial-gradient(circle at center, ${activeGod.color}10 0%, transparent 60%)`,
                        zIndex: 1
                    }} />

                    {/* Loading / Error State */}
                    {loading && (
                        <div style={{ color: '#9CA3AF', zIndex: 10 }}>데이터 로딩 중...</div>
                    )}
                    {error && (
                        <div style={{ color: '#EF4444', zIndex: 10 }}>{error}</div>
                    )}
                    {!characterId && (
                        <div style={{ color: '#6B7280', zIndex: 10 }}>캐릭터 정보가 필요합니다</div>
                    )}

                    {/* SVG Node Graph */}
                    {boardData && !loading && (
                        <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
                            <svg
                                width="100%"
                                height="100%"
                                viewBox={`0 0 ${GRID_TOTAL + PADDING * 2} ${GRID_TOTAL + PADDING * 2}`}
                                style={{ overflow: 'visible' }}
                            >
                                <defs>
                                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <filter id="activeGlow" x="-100%" y="-100%" width="300%" height="300%">
                                        <feGaussianBlur stdDeviation="6" result="blur1" />
                                        <feGaussianBlur stdDeviation="3" result="blur2" />
                                        <feMerge>
                                            <feMergeNode in="blur1" />
                                            <feMergeNode in="blur2" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <style>
                                        {`
                                            @keyframes pulse {
                                                0%, 100% { opacity: 0.8; }
                                                50% { opacity: 1; }
                                            }
                                            .active-node {
                                                animation: pulse 2s ease-in-out infinite;
                                            }
                                        `}
                                    </style>
                                </defs>

                                {/* Nodes */}
                                {boardData.nodeList.map((node) => {
                                    const x = toSvgCoord(node.col)
                                    const y = toSvgCoord(node.row)
                                    const isActive = node.open === 1
                                    const isStart = node.type === 'Start'

                                    // Determine stroke color based on grade
                                    let strokeColor = gradeColors[node.grade] || '#374151'
                                    if (isActive) {
                                        strokeColor = activeGod.color
                                    }

                                    return (
                                        <g
                                            key={node.nodeId}
                                            onMouseEnter={() => setHoveredNode(node)}
                                            onMouseLeave={() => setHoveredNode(null)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <title>{node.name}</title>

                                            {/* Outer Frame */}
                                            <rect
                                                x={x - 14} y={y - 14}
                                                width={28} height={28}
                                                fill={isActive ? '#1F2937' : '#0B0D12'}
                                                stroke={strokeColor}
                                                strokeWidth={isActive || node.grade !== 'Common' ? 2 : 1}
                                                rx={4}
                                                opacity={isActive ? 1 : 0.5}
                                            />

                                            {/* Inner Fill - Enhanced for active nodes */}
                                            {isActive && (
                                                <rect
                                                    x={x - 10} y={y - 10}
                                                    width={20} height={20}
                                                    fill={activeGod.color}
                                                    opacity={1}
                                                    rx={2}
                                                    filter="url(#activeGlow)"
                                                    className="active-node"
                                                />
                                            )}

                                            {/* Center Icon for Start */}
                                            {isStart && (
                                                <path
                                                    d={`M${x} ${y - 8} L${x + 8} ${y} L${x} ${y + 8} L${x - 8} ${y} Z`}
                                                    fill="#fff"
                                                />
                                            )}

                                            {/* Legend indicator */}
                                            {!isStart && node.grade === 'Legend' && (
                                                <circle cx={x} cy={y} r={2} fill="#F59E0B" />
                                            )}
                                        </g>
                                    )
                                })}
                            </svg>
                        </div>
                    )}

                    {/* Hover Info Overlay */}
                    {hoveredNode && (
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(0,0,0,0.9)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            padding: '0.5rem 1rem',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            pointerEvents: 'none',
                            zIndex: 20
                        }}>
                            <span style={{ color: activeGod.color, fontWeight: 'bold', marginRight: '0.5rem' }}>
                                {hoveredNode.name}
                            </span>
                            {hoveredNode.effectList.length > 0 && (
                                <span>{hoveredNode.effectList[0].desc}</span>
                            )}
                        </div>
                    )}

                    {/* Bottom Stats Overlay */}
                    {!hoveredNode && boardData && (
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '20px',
                            background: 'rgba(11, 13, 18, 0.85)',
                            border: `1px solid ${activeGod.color}40`,
                            backdropFilter: 'blur(4px)',
                            padding: '1rem',
                            borderRadius: '8px',
                            zIndex: 10,
                            maxWidth: '200px'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#D1D5DB' }}>
                                총 {activeNodes}개 노드 개방됨
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Effects Panel */}
                <div style={{
                    background: '#1A1D29',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #2D3748',
                    minHeight: '100px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    {hoveredNode ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.25rem', color: '#fff' }}>
                                {hoveredNode.name}
                            </p>
                            {hoveredNode.effectList.map((effect, i) => (
                                <p key={i} style={{ color: activeGod.color, fontSize: '0.9rem', margin: '0.25rem 0' }}>
                                    {effect.desc}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#E5E7EB', fontSize: '1rem' }}>활성화된 효과</h4>
                            {boardData && (boardData.openStatEffectList.length > 0 || boardData.openSkillEffectList.length > 0) ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                                    {[...boardData.openStatEffectList, ...boardData.openSkillEffectList].map((effect, i) => (
                                        <div key={i} style={{
                                            padding: '0.75rem',
                                            background: '#111318',
                                            borderRadius: '6px',
                                            borderLeft: `3px solid ${activeGod.color}`,
                                            color: '#D1D5DB',
                                            fontSize: '0.9rem'
                                        }}>
                                            {effect.desc}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.9rem' }}>
                                    활성화된 효과가 없습니다. 노드를 개방하여 효과를 획득하세요.
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}
