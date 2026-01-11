import React, { useRef, useEffect } from 'react';
import PartyCard, { DetailedSpec } from './PartyCard';
import { Share2, BarChart3, TrendingUp, Sparkles, Upload, Loader2, ScanLine, AlertCircle, RotateCcw } from 'lucide-react';
import { PendingServerSelection, PartyMember } from '@/hooks/usePartyScanner';
import type { CharacterSpec } from './PartySpecCard';

interface PartyAnalysisResultProps {
    data: {
        totalCp: number;
        grade: string;
        members: any[];
        recognizedCount?: number;
        foundCount?: number;
    } | null;
    isScanning?: boolean;
    onReset?: () => void;
    onManualUpload?: (file: File) => void;
    pendingSelections?: PendingServerSelection[];
    onSelectServer?: (slotIndex: number, selectedServer: string, characterData: PartyMember) => void;
    detailedSpecs?: CharacterSpec[];
    isLoadingSpecs?: boolean;
    onFetchDetailedSpecs?: (members: PartyMember[]) => void;
}

export default function PartyAnalysisResult({ data, isScanning, onReset, onManualUpload, pendingSelections, onSelectServer, detailedSpecs, isLoadingSpecs, onFetchDetailedSpecs }: PartyAnalysisResultProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { totalCp, grade, members, recognizedCount = 0, foundCount = 0 } = data || { totalCp: 0, grade: '-', members: [], recognizedCount: 0, foundCount: 0 };
    const isEmpty = !data || (data.members.length === 0);
    const hasPartialMatch = recognizedCount > 0 && foundCount < recognizedCount;
    const hasPendingSelections = pendingSelections && pendingSelections.length > 0;
    const noPendingSelections = !pendingSelections || pendingSelections.length === 0;

    // 분석 완료 & 서버 선택 완료 시 자동으로 상세 스펙 조회
    useEffect(() => {
        if (data && members.length > 0 && noPendingSelections && onFetchDetailedSpecs && (!detailedSpecs || detailedSpecs.length === 0)) {
            onFetchDetailedSpecs(members);
        }
    }, [data, members, noPendingSelections, onFetchDetailedSpecs, detailedSpecs]);

    const handleManualClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onManualUpload?.(e.target.files[0]);
        }
    };

    const getGradeColor = (g: string) => {
        if (g === 'S') return 'linear-gradient(135deg, #FACC15 0%, #B45309 100%)';
        if (g === 'A') return 'linear-gradient(135deg, #C084FC 0%, #7E22CE 100%)';
        if (g === 'B') return 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)';
        return 'linear-gradient(135deg, #4B5563 0%, #1F2937 100%)'; // Empty/Default
    };

    const getGradeGlow = (g: string) => {
        if (g === 'S') return 'rgba(250, 204, 21, 0.4)';
        if (g === 'A') return 'rgba(192, 132, 252, 0.4)';
        if (g === 'B') return 'rgba(96, 165, 250, 0.4)';
        return 'rgba(255, 255, 255, 0.05)';
    };

    const bannerStyle: React.CSSProperties = {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        background: 'rgba(15, 17, 26, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '3rem 2rem',
        textAlign: 'center',
        boxShadow: !isEmpty ? `0 20px 50px -10px ${getGradeGlow(grade)}` : 'none',
        marginBottom: '2rem',
        transition: 'all 0.5s ease'
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
    };

    const btnStyle: React.CSSProperties = {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '0.6rem 1.2rem',
        borderRadius: '999px',
        color: '#E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 500,
        transition: 'all 0.2s',
    };

    return (
        <div style={{
            position: 'relative'
        }}>
            <style>{`
            @keyframes scanLine {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
            .rank-text {
                 background: ${getGradeColor(grade)};
                 -webkit-background-clip: text;
                 -webkit-text-fill-color: transparent;
                 filter: drop-shadow(0 2px 8px ${getGradeGlow(grade)});
            }
            `}</style>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--brand-white)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ScanLine size={20} color="var(--brand-red-main)" />
                    AI Party Analyzer
                </h2>

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        onClick={handleManualClick}
                        className="hover-btn"
                        style={{ ...btnStyle, background: 'rgba(217, 43, 75, 0.1)', borderColor: 'var(--brand-red-main)', color: 'var(--brand-red-main)' }}
                    >
                        <Upload size={16} />
                        이미지 업로드
                    </button>
                    {!isEmpty && (
                        <>
                            <button
                                onClick={onReset}
                                className="hover-btn"
                                style={btnStyle}
                            >
                                <RotateCcw size={16} />
                                초기화
                            </button>
                            <button className="hover-btn" style={btnStyle}>
                                <Share2 size={16} />
                                결과 공유
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Total Power Banner */}
            <div style={bannerStyle}>
                {/* Initial Empty State Prompt */}
                {isEmpty && !isScanning && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)', zIndex: 20
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '1.5rem',
                            borderRadius: '20px',
                            marginBottom: '1rem',
                            border: '1px dashed rgba(255, 255, 255, 0.2)'
                        }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--brand-white)', marginBottom: '0.5rem' }}>
                                파티 스크린샷을 붙여넣으세요 (Ctrl + V)
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                또는 상단 '이미지 업로드' 버튼을 클릭하세요
                            </div>
                        </div>
                    </div>
                )}

                {/* Background Decor */}
                {!isEmpty && (
                    <div style={{
                        position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
                        width: '300px', height: '300px',
                        borderRadius: '50%',
                        background: getGradeColor(grade),
                        filter: 'blur(100px)',
                        opacity: 0.15,
                        pointerEvents: 'none'
                    }} />
                )}

                <div style={{ position: 'relative', zIndex: 10, opacity: isEmpty ? 0.3 : 1, filter: isEmpty ? 'blur(4px)' : 'none', transition: 'all 0.3s' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                        marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', letterSpacing: '0.05em'
                    }}>
                        <BarChart3 size={18} />
                        <span style={{ fontWeight: 600 }}>PARTY TOTAL POWER</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {/* Rank Badge */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            position: 'relative'
                        }}>
                            <span className="rank-text" style={{
                                fontSize: '6rem', fontWeight: 900, lineHeight: 0.9,
                                fontStyle: 'italic'
                            }}>
                                {grade}
                            </span>
                            <span style={{
                                fontSize: '1rem', fontWeight: 700, color: 'var(--brand-white)',
                                marginTop: '0.5rem', opacity: 0.8
                            }}>RANK</span>
                        </div>

                        <div style={{ width: '2px', height: '80px', background: 'rgba(255,255,255,0.1)' }} />

                        {/* Text Score */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>총 전투력 합계</div>
                            <span style={{
                                fontSize: '3.5rem',
                                fontWeight: 700,
                                color: 'var(--brand-white)',
                                fontFamily: 'monospace',
                                letterSpacing: '-0.05em',
                                textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}>
                                {totalCp.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '2rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <TrendingUp size={16} color={!isEmpty ? "#4ADE80" : "var(--text-disabled)"} />
                        <span style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                            {!isEmpty ? (
                                <>DB에서 <strong style={{ color: '#4ADE80' }}>{foundCount}명</strong>의 캐릭터 정보를 조회했습니다.</>
                            ) : (
                                "파티 정보를 분석하여 순위를 확인하세요."
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Partial Match Warning */}
            {hasPartialMatch && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem 1.2rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '1.5rem'
                }}>
                    <AlertCircle size={20} color="#FBBF24" />
                    <div>
                        <div style={{ color: '#FBBF24', fontWeight: 600, fontSize: '0.9rem' }}>
                            일부 캐릭터를 찾지 못했습니다
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                            OCR 인식: {recognizedCount}명 → DB 조회: {foundCount}명 (OCR 정확도 또는 미등록 캐릭터)
                        </div>
                    </div>
                </div>
            )}

            {/* 선택이 필요한 경우 안내 메시지 */}
            {hasPendingSelections && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    padding: '1rem 1.2rem',
                    background: 'rgba(250, 204, 21, 0.08)',
                    border: '1px solid rgba(250, 204, 21, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '1.5rem'
                }}>
                    <AlertCircle size={20} color="#FACC15" />
                    <div>
                        <div style={{ color: '#FACC15', fontWeight: 600, fontSize: '0.9rem' }}>
                            선택이 필요한 캐릭터가 있습니다
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                            아래 카드에서 올바른 {pendingSelections!.some(p => p.type === 'name') ? '캐릭터명' : '서버'}을 선택해주세요.
                        </div>
                    </div>
                </div>
            )}

            {/* Grid */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'var(--brand-red-main)', padding: '6px', borderRadius: '8px' }}>
                        <Sparkles size={20} color="white" />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-white)', margin: 0 }}>파티 구성원</h3>
                    <span style={{
                        padding: '2px 10px', borderRadius: '99px',
                        background: 'rgba(255,255,255,0.1)',
                        fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600
                    }}>
                        {members.length > 0 ? members.length : 0}명
                    </span>
                </div>

                <div style={gridStyle}>
                    {members.length > 0 ? (
                        members.map((member, idx) => {
                            // detailedSpecs에서 해당 멤버의 스펙 찾기 (이름에서 "(선택 필요)" 제거 후 비교)
                            const cleanName = member.name.replace(' (선택 필요)', '');
                            const memberSpec = detailedSpecs?.find(s => s.name === cleanName || s.name === member.name);
                            const spec: DetailedSpec | undefined = memberSpec ? {
                                hitonCP: memberSpec.hitonCP,
                                itemLevel: memberSpec.itemLevel,
                                totalBreakthrough: memberSpec.totalBreakthrough,
                                stats: memberSpec.stats
                            } : undefined;

                            // 해당 멤버의 선택 정보 찾기 (_ocrName으로 매칭)
                            const memberOcrName = member._ocrName;
                            const pending = pendingSelections?.find(p => p._ocrName === memberOcrName || p.name === memberOcrName);
                            const selectionInfo = pending ? {
                                type: pending.type || 'server' as const,
                                ocrName: pending.name,
                                candidates: pending.candidates
                            } : undefined;

                            // 멤버 이름에서 "(선택 필요)" 제거
                            const displayMember = {
                                ...member,
                                name: cleanName,
                                server: member.server.replace(' (선택 필요)', '')
                            };

                            return (
                                <PartyCard
                                    key={idx}
                                    member={displayMember}
                                    index={idx}
                                    spec={spec}
                                    isLoadingSpec={isLoadingSpecs && !spec}
                                    selectionInfo={selectionInfo}
                                    onSelect={(selectedServer, characterData) => {
                                        if (onSelectServer && pending) {
                                            onSelectServer(pending.slotIndex, selectedServer, characterData);
                                        }
                                    }}
                                />
                            );
                        })
                    ) : (
                        // Empty Skeleton Slots (4명 파티)
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{
                                height: '80px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(255,255,255,0.1)'
                            }}>
                                {i + 1}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 스펙은 이제 각 PartyCard 내에 통합되어 표시됨 */}

            {/* Scanning Overlay (Toast/Indicator) */}
            {isScanning && (
                <div style={{
                    position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--primary)',
                    padding: '1rem 2rem',
                    borderRadius: '999px',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    zIndex: 100,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <Loader2 size={24} color="var(--primary)" className="spin-slow" />
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--brand-white)' }}>Analyzing Party Data...</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Please wait a moment</div>
                    </div>
                    <style>{`
                        .spin-slow { animation: spin 2s linear infinite; }
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            )}
        </div>
    );
}
