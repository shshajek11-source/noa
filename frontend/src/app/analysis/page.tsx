'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import PartyAnalysisResult from '@/app/components/analysis/PartyAnalysisResult';
import { usePartyScanner, CropRegion, OcrMode } from '@/hooks/usePartyScanner';

// 임시 비활성화 플래그 (메뉴에서만 숨김, 페이지는 접근 가능)
const DISABLED = false;

export default function AnalysisPage() {
    // 페이지 비활성화
    if (DISABLED) {
        return (
            <div style={{
                minHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'linear-gradient(180deg, #0B0D12 0%, #1a1d24 100%)'
            }}>
                <div style={{
                    fontSize: '64px',
                    marginBottom: '24px'
                }}>🔧</div>
                <h1 style={{
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    color: '#E5E7EB',
                    marginBottom: '12px'
                }}>파티 분석 페이지 준비 중</h1>
                <p style={{
                    fontSize: '1rem',
                    color: '#9CA3AF',
                    marginBottom: '32px',
                    lineHeight: 1.6
                }}>
                    더 나은 서비스를 위해 페이지를 개선하고 있습니다.<br />
                    빠른 시일 내에 다시 찾아뵙겠습니다.
                </p>
                <a href="/" style={{
                    padding: '12px 24px',
                    background: '#FACC15',
                    color: '#0B0D12',
                    borderRadius: '8px',
                    fontWeight: 600,
                    textDecoration: 'none'
                }}>메인으로 돌아가기</a>
            </div>
        );
    }
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
        logs, // 디버그 로그
        cropSettings,
        setCropSettings,
        cropRegions,
        setCropRegions,
        useSingleRegion,
        setUseSingleRegion,
        generatePreviewWithRegions,
        // OCR 모드
        ocrMode,
        setOcrMode,
        browserOcrReady,
        initBrowserOcr
    } = usePartyScanner();
    const [error, setError] = useState<string | null>(null);
    const [showCropSettings, setShowCropSettings] = useState(false);
    const [originalImage, setOriginalImage] = useState<string | null>(null); // 원본 이미지 저장
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 미리보기 이미지 업로드 핸들러
    const handlePreviewUpload = useCallback(async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            setOriginalImage(base64); // 원본 이미지 저장
            const preview = await generatePreviewWithRegions(base64);
            setPreviewImage(preview);
        };
        reader.readAsDataURL(file);
    }, [generatePreviewWithRegions]);

    // 영역 설정 변경 시 미리보기 실시간 업데이트
    useEffect(() => {
        if (originalImage) {
            // 설정이 변경되면 미리보기 재생성
            generatePreviewWithRegions(originalImage).then(preview => {
                setPreviewImage(preview);
            });
        }
    }, [originalImage, cropSettings, cropRegions, useSingleRegion, generatePreviewWithRegions]);

    // 영역 추가
    const addRegion = () => {
        const newId = `region-${Date.now()}`;
        const newRegion: CropRegion = {
            id: newId,
            name: `영역 ${cropRegions.length + 1}`,
            startX: 100,
            startY: 950,
            width: 400,
            height: 80,
            enabled: true
        };
        setCropRegions([...cropRegions, newRegion]);
        setSelectedRegionId(newId);
    };

    // 영역 삭제
    const removeRegion = (id: string) => {
        setCropRegions(cropRegions.filter(r => r.id !== id));
        if (selectedRegionId === id) {
            setSelectedRegionId(cropRegions[0]?.id || null);
        }
    };

    // 영역 업데이트
    const updateRegion = (id: string, updates: Partial<CropRegion>) => {
        setCropRegions(cropRegions.map(r =>
            r.id === id ? { ...r, ...updates } : r
        ));
    };

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
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
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

            {/* 하단 버튼들 */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
            }}>
                {/* OCR 모드 표시 */}
                <div style={{
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    border: `1px solid ${ocrMode === 'browser' ? '#22C55E' : '#3B82F6'}`,
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: ocrMode === 'browser' ? '#22C55E' : '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: ocrMode === 'browser'
                            ? (browserOcrReady ? '#22C55E' : '#EF4444')
                            : '#3B82F6',
                        animation: ocrMode === 'browser' && !browserOcrReady ? 'pulse 1s infinite' : 'none'
                    }} />
                    {ocrMode === 'gemini' ? 'Gemini Vision' : (browserOcrReady ? 'Tesseract 준비됨' : 'Tesseract 로딩 중...')}
                </div>

                {/* OCR 모드 전환 버튼 */}
                <button
                    onClick={() => {
                        if (ocrMode === 'gemini') {
                            setOcrMode('browser');
                            if (!browserOcrReady) {
                                initBrowserOcr();
                            }
                        } else {
                            setOcrMode('gemini');
                        }
                    }}
                    style={{
                        padding: '10px 14px',
                        background: ocrMode === 'browser' ? '#22C55E' : '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '11px',
                    }}
                    title={ocrMode === 'gemini' ? '브라우저 OCR로 전환 (무료, 빠름)' : 'Gemini Vision으로 전환 (더 정확함)'}
                >
                    {ocrMode === 'gemini' ? '브라우저 OCR' : 'Gemini OCR'}
                </button>

                {/* OCR 설정 버튼 */}
                <button
                    onClick={() => setShowCropSettings(!showCropSettings)}
                    style={{
                        padding: '10px 16px',
                        background: showCropSettings ? '#FACC15' : '#374151',
                        color: showCropSettings ? '#000' : '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '12px',
                    }}
                >
                    {showCropSettings ? 'OCR 설정 닫기' : 'OCR 영역 설정'}
                </button>
            </div>

            {/* OCR 크롭 설정 패널 - 확장형 */}
            {showCropSettings && (
                <div style={{
                    position: 'fixed',
                    bottom: '70px',
                    left: '20px',
                    width: '380px',
                    maxHeight: 'calc(100vh - 150px)',
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid #FACC15',
                    borderRadius: '12px',
                    zIndex: 9998,
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* 헤더 */}
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
                        <span>OCR 영역 설정 (1920x1080 기준)</span>
                    </div>

                    {/* 모드 선택 탭 */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #374151',
                    }}>
                        <button
                            onClick={() => setUseSingleRegion(true)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: useSingleRegion ? '#FACC15' : 'transparent',
                                color: useSingleRegion ? '#000' : '#9CA3AF',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            단일 영역
                        </button>
                        <button
                            onClick={() => setUseSingleRegion(false)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: !useSingleRegion ? '#FACC15' : 'transparent',
                                color: !useSingleRegion ? '#000' : '#9CA3AF',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            다중 영역 ({cropRegions.length}개)
                        </button>
                    </div>

                    {/* 스크롤 가능한 내용 영역 */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        {useSingleRegion ? (
                            /* 단일 영역 모드 */
                            <>
                                {/* 시작 X */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                                        <span>시작 X</span>
                                        <input
                                            type="number"
                                            value={cropSettings.startX}
                                            onChange={(e) => setCropSettings(prev => ({ ...prev, startX: Number(e.target.value) }))}
                                            style={{ width: '70px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 6px', fontSize: '12px', textAlign: 'right' }}
                                        />
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="800"
                                        value={cropSettings.startX}
                                        onChange={(e) => setCropSettings(prev => ({ ...prev, startX: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                    />
                                </div>

                                {/* 시작 Y */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                                        <span>시작 Y</span>
                                        <input
                                            type="number"
                                            value={cropSettings.startY}
                                            onChange={(e) => setCropSettings(prev => ({ ...prev, startY: Number(e.target.value) }))}
                                            style={{ width: '70px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 6px', fontSize: '12px', textAlign: 'right' }}
                                        />
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1080"
                                        value={cropSettings.startY}
                                        onChange={(e) => setCropSettings(prev => ({ ...prev, startY: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                    />
                                </div>

                                {/* 너비 */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                                        <span>너비</span>
                                        <input
                                            type="number"
                                            value={cropSettings.width}
                                            onChange={(e) => setCropSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                                            style={{ width: '70px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 6px', fontSize: '12px', textAlign: 'right' }}
                                        />
                                    </label>
                                    <input
                                        type="range"
                                        min="100"
                                        max="1920"
                                        value={cropSettings.width}
                                        onChange={(e) => setCropSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                    />
                                </div>

                                {/* 높이 */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#9CA3AF' }}>
                                        <span>높이</span>
                                        <input
                                            type="number"
                                            value={cropSettings.height}
                                            onChange={(e) => setCropSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
                                            style={{ width: '70px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 6px', fontSize: '12px', textAlign: 'right' }}
                                        />
                                    </label>
                                    <input
                                        type="range"
                                        min="20"
                                        max="300"
                                        value={cropSettings.height}
                                        onChange={(e) => setCropSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                    />
                                </div>

                                {/* 현재 설정 표시 */}
                                <div style={{
                                    padding: '10px',
                                    background: 'rgba(250, 204, 21, 0.1)',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    color: '#D1D5DB'
                                }}>
                                    X: {cropSettings.startX}, Y: {cropSettings.startY}<br/>
                                    W: {cropSettings.width}, H: {cropSettings.height}
                                </div>
                            </>
                        ) : (
                            /* 다중 영역 모드 */
                            <>
                                {/* 영역 추가 버튼 */}
                                <button
                                    onClick={addRegion}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#22C55E',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        marginBottom: '12px',
                                    }}
                                >
                                    + 영역 추가
                                </button>

                                {/* 영역 리스트 */}
                                {cropRegions.map((region, idx) => (
                                    <div
                                        key={region.id}
                                        style={{
                                            marginBottom: '12px',
                                            padding: '12px',
                                            background: selectedRegionId === region.id ? 'rgba(250, 204, 21, 0.15)' : 'rgba(255,255,255,0.05)',
                                            border: selectedRegionId === region.id ? '1px solid #FACC15' : '1px solid #374151',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setSelectedRegionId(region.id)}
                                    >
                                        {/* 영역 헤더 */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: selectedRegionId === region.id ? '12px' : '0',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={region.enabled}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        updateRegion(region.id, { enabled: e.target.checked });
                                                    }}
                                                    style={{ accentColor: '#FACC15' }}
                                                />
                                                <input
                                                    type="text"
                                                    value={region.name}
                                                    onChange={(e) => updateRegion(region.id, { name: e.target.value })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: region.enabled ? '#FACC15' : '#6B7280',
                                                        fontWeight: 600,
                                                        fontSize: '13px',
                                                        width: '100px',
                                                    }}
                                                />
                                                <span style={{ fontSize: '10px', color: '#6B7280' }}>
                                                    ({region.startX}, {region.startY})
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeRegion(region.id);
                                                }}
                                                style={{
                                                    background: '#EF4444',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '4px 8px',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                삭제
                                            </button>
                                        </div>

                                        {/* 선택된 영역의 상세 설정 */}
                                        {selectedRegionId === region.id && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                {/* 시작 X */}
                                                <div style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px', color: '#9CA3AF' }}>
                                                        <span>X</span>
                                                        <input
                                                            type="number"
                                                            value={region.startX}
                                                            onChange={(e) => updateRegion(region.id, { startX: Number(e.target.value) })}
                                                            style={{ width: '60px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 4px', fontSize: '11px', textAlign: 'right' }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1600"
                                                        value={region.startX}
                                                        onChange={(e) => updateRegion(region.id, { startX: Number(e.target.value) })}
                                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                                    />
                                                </div>

                                                {/* 시작 Y */}
                                                <div style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px', color: '#9CA3AF' }}>
                                                        <span>Y</span>
                                                        <input
                                                            type="number"
                                                            value={region.startY}
                                                            onChange={(e) => updateRegion(region.id, { startY: Number(e.target.value) })}
                                                            style={{ width: '60px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 4px', fontSize: '11px', textAlign: 'right' }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="1080"
                                                        value={region.startY}
                                                        onChange={(e) => updateRegion(region.id, { startY: Number(e.target.value) })}
                                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                                    />
                                                </div>

                                                {/* 너비 */}
                                                <div style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px', color: '#9CA3AF' }}>
                                                        <span>너비</span>
                                                        <input
                                                            type="number"
                                                            value={region.width}
                                                            onChange={(e) => updateRegion(region.id, { width: Number(e.target.value) })}
                                                            style={{ width: '60px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 4px', fontSize: '11px', textAlign: 'right' }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="50"
                                                        max="800"
                                                        value={region.width}
                                                        onChange={(e) => updateRegion(region.id, { width: Number(e.target.value) })}
                                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                                    />
                                                </div>

                                                {/* 높이 */}
                                                <div style={{ marginBottom: '8px' }}>
                                                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '11px', color: '#9CA3AF' }}>
                                                        <span>높이</span>
                                                        <input
                                                            type="number"
                                                            value={region.height}
                                                            onChange={(e) => updateRegion(region.id, { height: Number(e.target.value) })}
                                                            style={{ width: '60px', background: '#1F2937', border: '1px solid #374151', borderRadius: '4px', color: '#FACC15', padding: '2px 4px', fontSize: '11px', textAlign: 'right' }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="range"
                                                        min="20"
                                                        max="200"
                                                        value={region.height}
                                                        onChange={(e) => updateRegion(region.id, { height: Number(e.target.value) })}
                                                        style={{ width: '100%', accentColor: '#FACC15' }}
                                                    />
                                                </div>

                                                {/* 좌표 요약 */}
                                                <div style={{
                                                    padding: '6px',
                                                    background: 'rgba(250, 204, 21, 0.1)',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontFamily: 'monospace',
                                                    color: '#D1D5DB',
                                                    textAlign: 'center'
                                                }}>
                                                    X:{region.startX} Y:{region.startY} W:{region.width} H:{region.height}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {cropRegions.length === 0 && (
                                    <div style={{
                                        padding: '20px',
                                        textAlign: 'center',
                                        color: '#6B7280',
                                        fontSize: '12px'
                                    }}>
                                        영역이 없습니다. 위 버튼을 눌러 추가하세요.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* 하단 버튼 영역 */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid #374151',
                        background: '#1F2937',
                    }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePreviewUpload(file);
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#3B82F6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                }}
                            >
                                {originalImage ? '이미지 변경' : '이미지 업로드'}
                            </button>
                            {originalImage && (
                                <button
                                    onClick={() => {
                                        setOriginalImage(null);
                                        setPreviewImage(null);
                                    }}
                                    style={{
                                        padding: '10px',
                                        background: '#EF4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    닫기
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 실시간 미리보기 패널 (설정 패널 옆에 표시) */}
            {showCropSettings && previewImage && (
                <div style={{
                    position: 'fixed',
                    bottom: '70px',
                    left: '420px',
                    width: 'calc(100vw - 460px)',
                    maxWidth: '900px',
                    maxHeight: 'calc(100vh - 150px)',
                    background: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid #FACC15',
                    borderRadius: '12px',
                    zIndex: 9997,
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '10px 16px',
                        background: '#1F2937',
                        borderBottom: '1px solid #374151',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span style={{ color: '#FACC15', fontWeight: 600, fontSize: '13px' }}>
                            실시간 미리보기
                        </span>
                        <span style={{ color: '#9CA3AF', fontSize: '11px' }}>
                            {useSingleRegion ? '단일 영역' : `다중 영역 (${cropRegions.filter(r => r.enabled).length}개)`}
                        </span>
                    </div>
                    <div style={{
                        flex: 1,
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'auto',
                    }}>
                        <img
                            src={previewImage}
                            alt="Preview"
                            style={{
                                maxWidth: '100%',
                                maxHeight: 'calc(100vh - 250px)',
                                border: '2px solid #374151',
                                borderRadius: '8px',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
