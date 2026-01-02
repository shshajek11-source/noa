'use client'

import { CharacterSearchResult } from '../../lib/supabaseApi'
import { Loader2 } from 'lucide-react'

interface SearchAutocompleteProps {
    results: CharacterSearchResult[]
    isVisible: boolean
    isLoading: boolean
    onSelect: (character: CharacterSearchResult) => void
}

export default function SearchAutocomplete({ results, isVisible, isLoading, onSelect }: SearchAutocompleteProps) {
    if (!isVisible && !isLoading) return null
    if (!isVisible && isLoading && results.length === 0) return null

    return (
        <div
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                background: '#111318',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 50,
                overflow: 'hidden',
                maxHeight: '500px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#9ca3af',
                background: '#0f1115',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>검색 결과</span>
                {isLoading && (
                    <div className="flex items-center gap-2 text-yellow-500">
                        <Loader2 className="animate-spin" size={12} />
                        <span>검색 중...</span>
                    </div>
                )}
            </div>

            {/* Results Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)', // 4-column grid
                gap: '8px',
                padding: '12px',
                overflowY: 'auto'
            }}>
                {results.map((char) => {
                    // Debug Log
                    if (results.length < 5) console.log('Autocomplete Char:', char.name, char.imageUrl)

                    return (
                        <div
                            key={`${char.server}_${char.name}`}
                            onClick={() => onSelect(char)}
                            className="group cursor-pointer transition-all duration-200"
                            style={{
                                background: '#1f2937',
                                border: '1px solid transparent',
                                borderRadius: '6px',
                                padding: '8px', // Reduced padding
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                gap: '6px' // Reduced gap
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#28303f'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#1f2937'
                                e.currentTarget.style.borderColor = 'transparent'
                                e.currentTarget.style.transform = 'none'
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '36px', // Reduced size
                                height: '36px', // Reduced size
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: `2px solid ${char.race === 'Elyos' || char.race === '천족' ? '#3b82f6' : '#ef4444'}`,
                                background: '#111318',
                                position: 'relative'
                            }}>
                                {char.imageUrl ? (
                                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 bg-gray-900">
                                        No Img
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ width: '100%' }}>
                                <div
                                    style={{
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: '12px', // Reduced font
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: char.name.replace(/<strong>/g, '<span style="color: #fbbf24;">').replace(/<\/strong>/g, '</span>')
                                    }}
                                />
                                <div style={{
                                    color: '#9ca3af',
                                    fontSize: '10px', // Reduced font
                                    marginTop: '2px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    <span>{char.server}</span>
                                    <span className="text-gray-600">|</span>
                                    <span style={{ color: char.race === 'Elyos' || char.race === '천족' ? '#60a5fa' : '#f87171' }}>
                                        {char.race === 'Elyos' || char.race === '천족' ? '천족' : '마족'}
                                    </span>
                                </div>
                                <div style={{
                                    color: '#fbbf24',
                                    fontSize: '10px', // Reduced font
                                    marginTop: '1px'
                                }}>
                                    Lv.{char.level} {char.job && char.job !== 'Unknown' && `• ${char.job}`}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {results.length === 0 && !isLoading && (
                    <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>
        </div>
    )
}
