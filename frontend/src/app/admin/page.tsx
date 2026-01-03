'use client'

import { useState } from 'react'
import { SERVERS } from '../constants/servers'

export default function AdminPage() {
    // Shared State
    const [serverId, setServerId] = useState('1001') // Default Siel
    const [type, setType] = useState('1') // Abyss

    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [progress, setProgress] = useState(0)

    // New State for Detail Sync
    const [syncList, setSyncList] = useState<any[]>([])
    const [detailProgress, setDetailProgress] = useState(0)
    const [isDetailSyncing, setIsDetailSyncing] = useState(false)
    const [detailLogs, setDetailLogs] = useState<string[]>([])

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
    }

    const addDetailLog = (msg: string) => {
        setDetailLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
    }

    const handleSync = async () => {
        setLoading(true)
        setProgress(0)
        setLogs([])
        setSyncList([]) // Reset previous list

        try {
            addLog(`Starting sync for Server ID: ${serverId}, Type: ${type}`)

            const res = await fetch(`/api/admin/sync-official?serverId=${serverId}&type=${type}`)
            const json = await res.json()

            if (!res.ok) {
                throw new Error(json.error || 'Sync failed')
            }

            addLog(`Success! Count: ${json.count}`)
            addLog(`Message: ${json.message}`)

            if (json.data && Array.isArray(json.data)) {
                setSyncList(json.data)
                addLog(`Loaded ${json.data.length} characters for Detail Sync.`)
            }

            setProgress(100)
        } catch (error: any) {
            addLog(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDetailSync = async () => {
        if (syncList.length === 0) {
            alert('먼저 랭킹 리스트를 동기화해주세요 (Step 1).')
            return
        }

        if (!confirm(`${syncList.length}명의 캐릭터 정보를 조회합니다. 시간이 다소 소요됩니다. 진행하시겠습니까?`)) return

        setIsDetailSyncing(true)
        setDetailProgress(0)
        setDetailLogs([])

        addDetailLog(`Starting Detail Sync for ${syncList.length} characters...`)

        let successCount = 0
        let failCount = 0

        for (let i = 0; i < syncList.length; i++) {
            const char = syncList[i]
            const progress = Math.round(((i + 1) / syncList.length) * 100)
            setDetailProgress(progress)

            try {
                // Call the existing character detail API which updates DB
                // We use the character_id (official ID) and server_id from the list
                const res = await fetch(`/api/character?id=${char.character_id}&server=${char.server_id}`)

                if (res.ok) {
                    const data = await res.json()
                    const cp = data.stats?.combat_power || 0
                    successCount++
                    addDetailLog(`[${i + 1}/${syncList.length}] Updated: ${char.name} (CP: ${cp})`)
                } else {
                    failCount++
                    addDetailLog(`[${i + 1}/${syncList.length}] Failed: ${char.name} (Status: ${res.status})`)
                }
            } catch (e: any) {
                failCount++
                addDetailLog(`[${i + 1}/${syncList.length}] Error: ${char.name} - ${e.message}`)
            }

            // Small delay to be gentle on the server
            await new Promise(r => setTimeout(r, 200))
        }

        addDetailLog(`Detail Sync Completed. Success: ${successCount}, Failed: ${failCount}`)
        setIsDetailSyncing(false)
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#E5E7EB' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid #374151', paddingBottom: '1rem' }}>
                Admin Dashboard (Commander)
            </h1>

            {/* Section 1: Official List Sync */}
            <div style={{ marginBottom: '3rem', padding: '1.5rem', background: '#1f2937', borderRadius: '8px' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#60a5fa' }}>Step 1: 랭킹 리스트 동기화 (List Fetch)</h2>
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Server</label>
                        <select
                            value={serverId}
                            onChange={e => setServerId(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #4b5563', background: '#374151', color: 'white', minWidth: '150px' }}
                        >
                            {SERVERS.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Type (1=Abyss)</label>
                        <input
                            type="text"
                            value={type}
                            onChange={e => setType(e.target.value)}
                            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #4b5563', background: '#374151', color: 'white', width: '100px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
                        <button
                            onClick={handleSync}
                            disabled={loading}
                            style={{
                                padding: '0.6rem 1.5rem',
                                background: loading ? '#6b7280' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {loading ? '리스트 가져오는 중...' : '1. 리스트 가져오기 (Start)'}
                        </button>
                    </div>
                </div>

                {loading && (
                    <div style={{ width: '100%', height: '4px', background: '#374151', marginTop: '1rem' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
                    </div>
                )}

                <div style={{ marginTop: '1rem', background: '#111827', padding: '1rem', borderRadius: '4px', height: '150px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {logs.map((log, i) => (
                        <div key={i} style={{ marginBottom: '0.25rem', color: '#9ca3af' }}>{log}</div>
                    ))}
                    {logs.length === 0 && <span style={{ color: '#4b5563' }}>대기 중...</span>}
                </div>
            </div>

            {/* Section 2: Combat Power Sync */}
            <div style={{ padding: '1.5rem', background: '#1f2937', borderRadius: '8px', border: '1px solid #d97706' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#facc15' }}>Step 2: 전투력 상세 동기화 (CP Detail Sync)</h2>
                <div style={{ marginBottom: '1rem', color: '#9ca3af', lineHeight: '1.6' }}>
                    <strong>설명:</strong> 1단계에서 가져온 캐릭터들의 상세 페이지를 하나씩 조회하여 <span style={{ color: '#facc15' }}>전투력</span>을 DB에 업데이트합니다.<br />
                    <strong>대상:</strong> {syncList.length > 0 ? <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{syncList.length}명</span> : '없음 (1단계를 먼저 실행하세요)'}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    {isDetailSyncing && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#d97706', fontWeight: 'bold' }}>
                            <span>진행률</span>
                            <span>{detailProgress}%</span>
                        </div>
                    )}
                    <div style={{ width: '100%', height: '8px', background: '#374151', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${detailProgress}%`, height: '100%', background: '#f59e0b', transition: 'width 0.3s' }}></div>
                    </div>
                </div>

                <button
                    onClick={handleDetailSync}
                    disabled={isDetailSyncing || syncList.length === 0}
                    style={{
                        padding: '1rem',
                        background: isDetailSyncing ? '#6b7280' : (syncList.length === 0 ? '#4b5563' : '#d97706'),
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (isDetailSyncing || syncList.length === 0) ? 'not-allowed' : 'pointer',
                        width: '100%',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {isDetailSyncing ? '상세 정보 수집 중입니다... (창을 닫지 마세요)' : '2. 전투력 업데이트 시작 (Batch Process)'}
                </button>

                <div style={{ marginTop: '1.5rem', background: '#111827', padding: '1rem', borderRadius: '4px', height: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.9rem', border: '1px solid #374151' }}>
                    {detailLogs.map((log, i) => (
                        <div key={i} style={{
                            marginBottom: '0.25rem',
                            color: log.includes('Updated') ? '#10b981' : (log.includes('Failed') ? '#ef4444' : '#d1d5db')
                        }}>
                            {log}
                        </div>
                    ))}
                    {detailLogs.length === 0 && <div style={{ color: '#4b5563', textAlign: 'center', marginTop: '130px' }}>로그 대기 중...</div>}
                </div>
            </div>
        </div>
    )
}
