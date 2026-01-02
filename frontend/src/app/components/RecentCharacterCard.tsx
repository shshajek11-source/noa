'use client'

import { RecentCharacter } from '../../types/character'
import { X, Shield } from 'lucide-react'

interface RecentCharacterCardProps {
    character: RecentCharacter
    compact?: boolean
    onClick: (character: RecentCharacter) => void
    onRemove: (id: string, e: React.MouseEvent) => void
}

export default function RecentCharacterCard({ character, compact = true, onClick, onRemove }: RecentCharacterCardProps) {
    // Determine styles based on race
    const raceColor = character.race === 'elyos' ? '#3b82f6' : '#ef4444' // Blue for Elyos, Red for Asmodian

    return (
        <div
            onClick={() => onClick(character)}
            className="group relative flex items-center justify-between w-full transition-all duration-200 cursor-pointer border border-transparent hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.03)]"
            style={{
                height: '60px',
                padding: '0 12px',
                background: '#111318',
                borderBottom: '1px solid #1f2937'
            }}
        >
            {/* Left: Avatar & Badge */}
            <div className="relative flex-shrink-0 mr-3">
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `1px solid ${raceColor}`,
                        background: '#1f2937'
                    }}
                >
                    {character.profileImage ? (
                        <img src={character.profileImage} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                            No Img
                        </div>
                    )}
                </div>
                {/* Level Badge */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: 'rgba(0,0,0,0.85)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        border: '1px solid #fbbf24', // Gold border
                        lineHeight: '1',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}
                >
                    {character.level}
                </div>
            </div>

            {/* Center: Info (Flex Row) */}
            <div className="flex flex-1 items-center overflow-hidden gap-2">
                {/* Name */}
                <span style={{
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                }}>
                    {character.name}
                </span>

                {/* Separator & Details */}
                <div className="flex items-center text-[13px] text-gray-400 gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                    <span className="text-gray-600">|</span>
                    <span>{character.server}</span>
                    <span className="text-gray-600">|</span>
                    <span style={{ color: raceColor }}>
                        {character.race === 'elyos' ? '천족' : '마족'}
                    </span>
                    <span className="text-gray-600">|</span>
                    <span>{character.class}</span>
                </div>
            </div>

            {/* Right: Item Level & Remove Action */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                {/* Item Level */}
                <div className="flex items-center gap-1">
                    <Shield size={12} className="text-yellow-400" />
                    <span style={{
                        color: '#fbbf24', // Yellow 
                        fontWeight: '700',
                        fontSize: '13px'
                    }}>
                        {character.itemLevel.toLocaleString()}
                    </span>
                </div>

                {/* Remove Button (Visible on Hover of the card mainly, but we can make it generic) */}
                <button
                    onClick={(e) => onRemove(character.id, e)}
                    className="p-1 rounded-full text-gray-500 hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors opacity-0 group-hover:opacity-100"
                    title="기록 삭제"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}
