'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CharacterData {
    id: number
    name: string
    server: string
    class: string
    level: number
    power: number
    stats?: any
    rank?: number
}

export default function SpecComparePage() {
    const [characters, setCharacters] = useState<Array<{ server: string, name: string } | null>>([null, null, null])
    const [charData, setCharData] = useState<Array<CharacterData | null>>([null, null, null])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    const updateCharacter = (index: number, value: { server: string, name: string } | null) => {
        const newChars = [...characters]
        newChars[index] = value
        setCharacters(newChars)
    }

    const fetchChar = async (server: string, name: string) => {
        const res = await fetch(`${API_BASE_URL}/api/characters/search?server=${server}&name=${name}`)
        if (!res.ok) throw new Error('캐릭터를 찾을 수 없습니다')
        return res.json()
    }

    const handleCompare = async () => {
        const validChars = characters.filter(c => c !== null && c.name.trim() !== '')
        if (validChars.length < 2) {
            setError('최소 2명의 캐릭터를 입력해주세요')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const promises = characters.map(char =>
                char && char.name.trim() ? fetchChar(char.server, char.name) : Promise.resolve(null)
            )
            const results = await Promise.all(promises)
            setCharData(results)
        } catch (e: any) {
            setError(e.message || '캐릭터 정보를 불러오는 중 오류가 발생했습니다')
            setCharData([null, null, null])
        } finally {
            setLoading(false)
        }
    }

    const validCharData = charData.filter(c => c !== null) as CharacterData[]

    return (
        <div>
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    ⚔️ 스펙 비교
                </h1>

                {/* Beta 안내 */}
                <div style={{
                    background: '#193055',
                    border: '1px solid #234375',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    color: '#93c5fd'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📢</span>
                        <strong style={{ color: 'var(--primary)' }}>검색 가능 캐릭터만 비교 가능</strong>
                    </div>
                    <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        랭킹에 등재된 캐릭터만 검색 및 비교할 수 있습니다. (베타 서비스 제한사항)
                    </p>
                </div>

                {/* Input Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[0, 1, 2].map(index => (
                        <CharacterInput
                            key={index}
                            label={`캐릭터 ${index + 1}${index === 2 ? ' (선택)' : ''}`}
                            onChange={(val) => updateCharacter(index, val)}
                            optional={index === 2}
                        />
                    ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={handleCompare}
                        className="btn"
                        disabled={loading || characters.filter(c => c !== null && c.name.trim()).length < 2}
                        style={{
                            padding: '0.8rem 3rem',
                            fontSize: '1.1rem',
                            opacity: (loading || characters.filter(c => c !== null && c.name.trim()).length < 2) ? 0.5 : 1
                        }}
                    >
                        {loading ? '비교 중...' : '비교하기'}
                    </button>
                </div>

                {error && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Comparison Table */}
            {validCharData.length >= 2 && (
                <div className="card">
                    <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                        비교 결과
                    </h2>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', width: '200px' }}>
                                        항목
                                    </th>
                                    {validCharData.map((char, i) => (
                                        <th key={i} style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                                            <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                                                {char.name}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
                                                {char.server}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* 기본 정보 */}
                                <ComparisonRow
                                    label="직업"
                                    values={validCharData.map(c => c.class)}
                                    type="text"
                                />
                                <ComparisonRow
                                    label="레벨"
                                    values={validCharData.map(c => c.level)}
                                    type="number"
                                    format={(v) => `Lv. ${v}`}
                                />
                                <ComparisonRow
                                    label="전투력"
                                    values={validCharData.map(c => c.power)}
                                    type="number"
                                    format={(v) => v.toLocaleString()}
                                    highlight={true}
                                />
                                {validCharData[0]?.rank && (
                                    <ComparisonRow
                                        label="전체 순위"
                                        values={validCharData.map(c => c.rank || 0)}
                                        type="number-reverse"
                                        format={(v) => v > 0 ? `#${v}` : '-'}
                                    />
                                )}

                                {/* 스탯 정보 */}
                                {validCharData.some(c => c.stats && Object.keys(c.stats).length > 0) && (
                                    <>
                                        <tr style={{ background: 'var(--bg-main)' }}>
                                            <td colSpan={validCharData.length + 1} style={{ padding: '0.8rem 1rem', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.95rem' }}>
                                                주요 스탯
                                            </td>
                                        </tr>
                                        {renderStatRows(validCharData)}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Winner Summary */}
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            최고 전투력
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {validCharData.reduce((max, char) => char.power > max.power ? char : max).name}
                        </div>
                        <div style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginTop: '0.3rem' }}>
                            {validCharData.reduce((max, char) => char.power > max.power ? char : max).power.toLocaleString()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function CharacterInput({ label, onChange, optional = false }: { label: string, onChange: (val: any) => void, optional?: boolean }) {
    const [server, setServer] = useState('Siel')
    const [name, setName] = useState('')

    const handleChange = (s: string, n: string) => {
        setServer(s)
        setName(n)
        if (n.trim()) onChange({ server: s, name: n.trim() })
        else onChange(null)
    }

    return (
        <div className="card" style={{
            padding: '1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            opacity: optional && !name ? 0.7 : 1
        }}>
            <h3 style={{
                margin: '0 0 1rem 0',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
            }}>
                {label}
            </h3>
            <select
                className="input"
                value={server}
                onChange={e => handleChange(e.target.value, name)}
                style={{
                    marginBottom: '0.5rem',
                    width: '100%',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)'
                }}
            >
                <option value="Siel">시엘</option>
                <option value="Israphel">이스라펠</option>
                <option value="Nezakan">네자칸</option>
                <option value="Zikel">지켈</option>
                <option value="Chantra">찬트라</option>
            </select>
            <input
                className="input"
                placeholder={optional ? "캐릭터명 (선택사항)" : "캐릭터명"}
                value={name}
                onChange={e => handleChange(server, e.target.value)}
                style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)'
                }}
            />
        </div>
    )
}

function ComparisonRow({
    label,
    values,
    type = 'text',
    format,
    highlight = false
}: {
    label: string
    values: any[]
    type?: 'text' | 'number' | 'number-reverse'
    format?: (v: any) => string
    highlight?: boolean
}) {
    const getMaxValue = () => {
        if (type === 'text') return null
        if (type === 'number-reverse') return Math.min(...values.filter(v => v > 0))
        return Math.max(...values)
    }

    const maxValue = getMaxValue()

    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{
                padding: '1rem',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                background: 'var(--bg-main)'
            }}>
                {label}
            </td>
            {values.map((value, i) => {
                const isMax = maxValue !== null && value === maxValue && value > 0
                const displayValue = format ? format(value) : value

                return (
                    <td key={i} style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: isMax ? 'bold' : '400',
                        color: isMax ? 'var(--primary)' : 'var(--text-main)',
                        fontSize: highlight ? '1.1rem' : '1rem',
                        background: isMax && highlight ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}>
                        {displayValue}
                        {isMax && highlight && (
                            <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.8rem',
                                color: 'var(--primary)'
                            }}>
                                ★
                            </span>
                        )}
                    </td>
                )
            })}
        </tr>
    )
}

function renderStatRows(charData: CharacterData[]) {
    // Collect all unique stat keys
    const allStatKeys = new Set<string>()
    charData.forEach(char => {
        if (char.stats && typeof char.stats === 'object') {
            Object.keys(char.stats).forEach(key => {
                // Exclude power and level as they're already shown
                if (key !== 'power' && key !== 'level') {
                    allStatKeys.add(key)
                }
            })
        }
    })

    if (allStatKeys.size === 0) {
        return (
            <tr>
                <td colSpan={charData.length + 1} style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--text-disabled)',
                    fontStyle: 'italic'
                }}>
                    상세 스탯 정보가 없습니다
                </td>
            </tr>
        )
    }

    return Array.from(allStatKeys).map(statKey => {
        const values = charData.map(char => {
            if (!char.stats || typeof char.stats !== 'object') return 0
            const value = char.stats[statKey]
            return typeof value === 'number' ? value : 0
        })

        // Only show if at least one character has this stat
        if (values.every(v => v === 0)) return null

        return (
            <ComparisonRow
                key={statKey}
                label={formatStatName(statKey)}
                values={values}
                type="number"
                format={(v) => v > 0 ? v.toLocaleString() : '-'}
            />
        )
    }).filter(Boolean)
}

function formatStatName(key: string): string {
    const nameMap: { [key: string]: string } = {
        'hp': 'HP',
        'mp': 'MP',
        'attack': '공격력',
        'defense': '방어력',
        'magical_attack': '마법 공격력',
        'magical_defense': '마법 방어력',
        'critical': '치명타',
        'accuracy': '명중',
        'evasion': '회피',
        'speed': '이동속도',
        'attack_speed': '공격속도'
    }
    return nameMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
