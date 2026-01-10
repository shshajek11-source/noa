'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PartyAnalysisResult from '@/app/components/analysis/PartyAnalysisResult';
import { usePartyScanner } from '@/hooks/usePartyScanner';

export default function AnalysisPage() {
    const {
        isScanning,
        scanImage,
        croppedPreview,
        pendingSelections,
        analysisResult,
        selectServer,
        detailedSpecs,
        isLoadingSpecs,
        fetchDetailedSpecs,
        logs // 디버그 로그
    } = usePartyScanner();
    const [error, setError] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);

    const handleScan = useCallback(async (file: File) => {
        setError(null);
        try {
            console.log('[AnalysisPage] Starting scan...');
            const result = await scanImage(file);
            console.log('[AnalysisPage] Scan result:', result);
        } catch (e: any) {
            console.error("Scan failed", e);
            setError(e?.message || 'OCR 스캔 중 오류가 발생했습니다.');
        }
    }, [scanImage]);

    // Global Paste Handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            console.log('[PartyAnalysis] Paste event detected');
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    console.log('[PartyAnalysis] Image found in clipboard');
                    const file = item.getAsFile();
                    if (file) {
                        handleScan(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleScan]);

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '2rem 1rem',
            paddingTop: '6rem',
            paddingBottom: '5rem',
            minHeight: '100vh'
        }}>
            <style jsx global>{`
                body {
                    background-color: var(--bg-main);
                    background-image: radial-gradient(circle at 50% 0%, rgba(217, 43, 75, 0.1) 0%, var(--bg-main) 70%);
                    color: var(--text-main);
                }
            `}</style>

            {/* 크롭된 이미지 보기 버튼 */}
            {croppedPreview && (
                <button
                    onClick={() => {
                        const newTab = window.open();
                        if (newTab) {
                            newTab.document.write(`<html><head><title>OCR 스캔 영역</title></head><body style="background:#000;margin:0;padding:20px;"><h3 style="color:#FACC15;">OCR 스캔 영역 (크롭된 이미지)</h3><img src="${croppedPreview}" style="max-width:100%;border:2px solid #FACC15;"/></body></html>`);
                        }
                    }}
                    style={{
                        position: 'fixed',
                        top: '100px',
                        right: '20px',
                        zIndex: 9999,
                        padding: '12px 20px',
                        background: '#FACC15',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    OCR 스캔 영역 보기 (새 탭)
                </button>
            )}

            <PartyAnalysisResult
                data={analysisResult}
                isScanning={isScanning}
                onReset={() => { setError(null); }}
                onManualUpload={handleScan}
                pendingSelections={pendingSelections}
                onSelectServer={selectServer}
                detailedSpecs={detailedSpecs}
                isLoadingSpecs={isLoadingSpecs}
                onFetchDetailedSpecs={fetchDetailedSpecs}
            />

            {/* Error Display */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#EF4444'
                }}>
                    {error}
                </div>
            )}

            {/* 디버그 패널 토글 버튼 */}
            <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    padding: '10px 16px',
                    background: showDebug ? '#EF4444' : '#374151',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '12px',
                }}
            >
                {showDebug ? '디버그 닫기' : '디버그 로그'}
            </button>

            {/* 디버그 패널 */}
            {showDebug && (
                <div style={{
                    position: 'fixed',
                    bottom: '70px',
                    right: '20px',
                    width: '400px',
                    maxHeight: '500px',
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '12px',
                    zIndex: 9998,
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}>
                    <div style={{
                        padding: '12px 16px',
                        background: '#1F2937',
                        borderBottom: '1px solid #374151',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#FACC15',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span>검색 디버그 로그</span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                            {logs.length}개 로그
                        </span>
                    </div>
                    <div style={{
                        padding: '12px',
                        maxHeight: '430px',
                        overflowY: 'auto',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        lineHeight: 1.6,
                    }}>
                        {logs.length === 0 ? (
                            <div style={{ color: '#6B7280', textAlign: 'center', padding: '20px' }}>
                                파티 분석을 시작하면 로그가 표시됩니다
                            </div>
                        ) : (
                            logs.map((log, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '4px 8px',
                                        marginBottom: '4px',
                                        background: log.includes('✅') ? 'rgba(34, 197, 94, 0.1)' :
                                                   log.includes('❌') ? 'rgba(239, 68, 68, 0.1)' :
                                                   log.includes('🔄') ? 'rgba(250, 204, 21, 0.1)' :
                                                   log.includes('🔍') ? 'rgba(59, 130, 246, 0.1)' :
                                                   'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '4px',
                                        color: log.includes('✅') ? '#22C55E' :
                                               log.includes('❌') ? '#EF4444' :
                                               log.includes('🔄') ? '#FACC15' :
                                               log.includes('🔍') ? '#60A5FA' :
                                               '#D1D5DB',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
