import { useState, useCallback, useRef, useEffect } from 'react';
import { supabaseApi, SERVER_NAME_TO_ID, SERVER_ID_TO_NAME } from '../lib/supabaseApi';
import { MainCharacter, MAIN_CHARACTER_KEY } from './useMainCharacter';
import { aggregateStats } from '../lib/statsAggregator';
import { calculateCombatPowerFromStats } from '../lib/combatPower';
import type { CharacterSpec, CharacterStats } from '../app/components/analysis/PartySpecCard';

export interface PartyMember {
    id: string;
    name: string;
    class: string;
    cp: number;
    gearScore: number;
    server: string;
    isMvp: boolean;
    level?: number;
    isMainCharacter?: boolean;
    profileImage?: string;
    characterId?: string;
    isFromDb?: boolean; // DB에서 조회된 실제 데이터인지 표시
    _ocrName?: string; // OCR로 인식된 원본 이름 (선택 매칭용)
    race?: string; // 종족 (Elyos/Asmodian)
    pvpScore?: number; // PVP 전투력
}

export interface AnalysisResult {
    totalCp: number;
    grade: string;
    members: PartyMember[];
    recognizedCount: number; // OCR로 인식된 수
    foundCount: number; // DB/API에서 찾은 수
    pendingSelections?: PendingServerSelection[]; // 서버 선택 필요한 캐릭터들
}

// 서버 선택이 필요한 캐릭터 정보
export interface PendingServerSelection {
    slotIndex: number;
    name: string;
    abbreviation: string; // OCR로 인식된 서버 약어
    candidates: ServerCandidate[]; // 선택 가능한 서버별 캐릭터 정보
    type?: 'server' | 'name'; // 선택 타입 (서버 선택 or 이름 선택)
    _ocrName?: string; // OCR로 인식된 원본 이름 (매칭용)
}

export interface ServerCandidate {
    server: string;
    serverId: number;
    characterData?: PartyMember; // 검색된 캐릭터 정보 (있으면)
    found: boolean;
    alternativeName?: string; // 대체 이름 (이름 선택용)
}

// 캐릭터 검색 결과 (원본 + 대체 이름 포함)
export interface LookupResult {
    primary: PartyMember | null; // 원본 이름으로 찾은 캐릭터
    alternatives: { name: string; character: PartyMember }[]; // 대체 이름으로 찾은 캐릭터들
}

// OCR 크롭 영역 설정 (다중 영역 지원)
export interface CropRegion {
    id: string;
    name: string;
    startX: number;
    startY: number;
    width: number;
    height: number;
    enabled: boolean;
}

// OCR 모드 타입
export type OcrMode = 'gemini' | 'browser';

export const usePartyScanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [scanBottomOnly, setScanBottomOnly] = useState(true);
    const [croppedPreview, setCroppedPreview] = useState<string | null>(null); // 크롭된 이미지 미리보기
    const [pendingSelections, setPendingSelections] = useState<PendingServerSelection[]>([]); // 서버 선택 대기중
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null); // 분석 결과 저장
    const [debugData, setDebugData] = useState<any[]>([]); // 디버그용 API 응답 데이터

    // OCR 모드 ('gemini' = Gemini Vision API, 'browser' = 브라우저 PP-OCR)
    const [ocrMode, setOcrMode] = useState<OcrMode>('gemini');
    const [browserOcrReady, setBrowserOcrReady] = useState(false);
    const browserOcrIframeRef = useRef<HTMLIFrameElement | null>(null);
    const browserOcrResolveRef = useRef<((text: string) => void) | null>(null);

    // OCR 크롭 설정 - 다중 영역 지원 (1920x1080 기준 픽셀값)
    // 유저 제공 좌표: 420, 681, 936, 1199 (X축 오름차순 정렬)
    const [cropRegions, setCropRegions] = useState<CropRegion[]>([
        { id: 'region-1', name: '영역 1', startX: 420, startY: 966, width: 160, height: 32, enabled: true },
        { id: 'region-2', name: '영역 2', startX: 681, startY: 966, width: 160, height: 32, enabled: true },
        { id: 'region-3', name: '영역 3', startX: 936, startY: 966, width: 160, height: 32, enabled: true },
        { id: 'region-4', name: '영역 4', startX: 1199, startY: 966, width: 160, height: 32, enabled: true },
    ]);

    // 제외 영역 (Masking) - 정밀 크롭 좌표를 사용하므로 마스킹은 잠시 비활성화
    const [blockedRegions, setBlockedRegions] = useState<CropRegion[]>([
        { id: 'mask-1', name: '마스크 1', startX: 604, startY: 950, width: 76, height: 69, enabled: false },
        { id: 'mask-2', name: '마스크 2', startX: 864, startY: 952, width: 76, height: 69, enabled: false },
        { id: 'mask-3', name: '마스크 3', startX: 1121, startY: 952, width: 76, height: 69, enabled: false },
    ]);

    // 단일 영역 모드용 (기존 호환성) - false로 변경하여 다중 영역 크롭 사용
    const [useSingleRegion, setUseSingleRegion] = useState(false);
    const [singleCropSettings, setSingleCropSettings] = useState({
        startX: 413,
        startY: 973,
        width: 940,
        height: 24
    });

    // 브라우저 OCR 메시지 핸들러
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, ...data } = event.data || {};

            switch (type) {
                case 'ready':
                    setBrowserOcrReady(true);
                    console.log('[Browser OCR] Ready');
                    break;
                case 'result':
                    // 브라우저 OCR 결과를 텍스트로 변환
                    if (browserOcrResolveRef.current && data.texts) {
                        const text = data.texts.map((t: any) => t.text).join('\n');
                        browserOcrResolveRef.current(text);
                        browserOcrResolveRef.current = null;
                    }
                    break;
                case 'error':
                    console.error('[Browser OCR] Error:', data.message);
                    if (browserOcrResolveRef.current) {
                        browserOcrResolveRef.current('');
                        browserOcrResolveRef.current = null;
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 브라우저 OCR 초기화
    const initBrowserOcr = useCallback(() => {
        if (browserOcrIframeRef.current) return;

        const iframe = document.createElement('iframe');
        iframe.src = '/ocr-worker/index.html';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        browserOcrIframeRef.current = iframe;
        console.log('[Browser OCR] Iframe created');
    }, []);

    // 브라우저 OCR 실행
    const runBrowserOcr = useCallback(async (imageBase64: string): Promise<string> => {
        if (!browserOcrIframeRef.current || !browserOcrReady) {
            console.warn('[Browser OCR] Not ready');
            return '';
        }

        return new Promise((resolve) => {
            browserOcrResolveRef.current = resolve;

            browserOcrIframeRef.current?.contentWindow?.postMessage({
                type: 'process',
                data: imageBase64
            }, '*');

            // 타임아웃 30초
            setTimeout(() => {
                if (browserOcrResolveRef.current === resolve) {
                    console.warn('[Browser OCR] Timeout');
                    resolve('');
                    browserOcrResolveRef.current = null;
                }
            }, 30000);
        });
    }, [browserOcrReady]);

    // 이미지 전처리 옵션
    interface PreprocessOptions {
        grayscale: boolean;      // 흑백 변환
        threshold: number;       // 이진화 임계값 (0-255)
        invert: boolean;         // 색상 반전 (어두운 배경 → 흰 배경)
        contrast: number;        // 대비 강화 (1.0 = 기본)
        denoise: boolean;        // 노이즈 제거 (3x3 중간값 필터)
    }

    // 기본 전처리 설정 (AION2 파티창 최적화)
    const defaultPreprocessOptions: PreprocessOptions = {
        grayscale: true,
        threshold: 160,      // 더 얇게 만들기 위해 임계값 상향 (150 -> 160)
        invert: true,           // 어두운 배경 → 흰 배경
        contrast: 1.5,          // 대비를 낮춰서 부드럽게 (2.2 -> 1.5)
        denoise: false          // 노이즈 제거 Off
    };

    // 이미지 전처리 함수 (노이즈 제거 + 흑백 + 대비 강화 + 이진화 + 반전)
    const preprocessImage = (ctx: CanvasRenderingContext2D, width: number, height: number, options: PreprocessOptions = defaultPreprocessOptions) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 1. 노이즈 제거 (3x3 중간값 필터) - 먼저 적용
        if (options.denoise) {
            const tempData = new Uint8ClampedArray(data);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    // 3x3 이웃 픽셀의 밝기값 수집
                    const neighbors: number[] = [];
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = ((y + dy) * width + (x + dx)) * 4;
                            const brightness = tempData[nIdx] * 0.299 + tempData[nIdx + 1] * 0.587 + tempData[nIdx + 2] * 0.114;
                            neighbors.push(brightness);
                        }
                    }
                    // 중간값으로 교체
                    neighbors.sort((a, b) => a - b);
                    const median = neighbors[4]; // 9개 중 5번째 (중간값)
                    const currentBrightness = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                    const ratio = currentBrightness > 0 ? median / currentBrightness : 1;
                    data[idx] = Math.min(255, data[idx] * ratio);
                    data[idx + 1] = Math.min(255, data[idx + 1] * ratio);
                    data[idx + 2] = Math.min(255, data[idx + 2] * ratio);
                }
            }
        }

        // 2. 그레이스케일 + 대비 강화 + 이진화 + 반전
        for (let i = 0; i < data.length; i += 4) {
            // 밝기 계산 (그레이스케일)
            let brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

            // 대비 강화
            if (options.contrast !== 1.0) {
                brightness = ((brightness - 128) * options.contrast) + 128;
                brightness = Math.max(0, Math.min(255, brightness));
            }

            // 이진화 (임계값 기준)
            let finalValue = brightness > options.threshold ? 255 : 0;

            // 반전 (어두운 배경 → 흰 배경, 밝은 글자 → 검은 글자)
            if (options.invert) {
                finalValue = 255 - finalValue;
            }

            // 그레이스케일 적용
            if (options.grayscale) {
                data[i] = finalValue;     // R
                data[i + 1] = finalValue; // G
                data[i + 2] = finalValue; // B
            }
            // Alpha 유지 (data[i + 3])
        }

        ctx.putImageData(imageData, 0, 0);
    };

    // 마스킹 적용 함수 (공통)
    const applyMasking = (ctx: CanvasRenderingContext2D, imgScaleX: number, imgScaleY: number, cropX: number, cropY: number, scale: number) => {
        blockedRegions.forEach(mask => {
            if (!mask.enabled) return;

            // 마스크 영역과 현재 크롭 영역의 교차점 계산 (전역 1920x1080 좌표계)
            const regionRight = cropX + (ctx.canvas.width / (scale * imgScaleX)); // 역계산... 복잡하므로 단순화
            // 더 단순하게: 마스크 영역을 현재 캔버스 좌표계로 변환해서 그리기

            // 캔버스는 cropWidth * scale 크기
            // 원본 이미지에서의 현재 크롭 시작점: cropX, cropY

            // 마스크 영역 (원본 좌표)
            const maskX = Math.round(mask.startX * imgScaleX);
            const maskY = Math.round(mask.startY * imgScaleY);
            const maskW = Math.round(mask.width * imgScaleX);
            const maskH = Math.round(mask.height * imgScaleY);

            // 현재 크롭 캔버스 상의 위치
            // CanvasX = (MaskOriginalX - CropOriginalX) * scale
            // CropOriginalX = cropX
            const canvasX = (maskX - cropX) * scale;
            const canvasY = (maskY - cropY) * scale;
            const canvasW = maskW * scale;
            const canvasH = maskH * scale;

            // 검은색으로 칠하기 (전처리 전이므로 원본 이미지 위에 덮어씀)
            // 전처리에서 'invert'가 true이면 검은색 -> 흰색이 됨
            // 배경이 검은색인 게임 화면이라면 검은색으로 칠하는 게 자연스러움
            // 전처리에서 반전되면 흰색 배경이 되므로 텍스트가 없는 것으로 인식됨
            ctx.fillStyle = '#000000';
            ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
        });
    };

    // 단일 영역 크롭 (기존 방식)
    const cropBottomPart = (base64Image: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64Image); return; }

                // 파티바 영역: 이름[서버]만 캡처 (1920x1080 기준 픽셀 고정)
                // 1920x1080 해상도 기준 → 다른 해상도는 비율로 스케일
                const baseWidth = 1920;
                const baseHeight = 1080;
                const scaleX = img.width / baseWidth;
                const scaleY = img.height / baseHeight;

                // singleCropSettings 사용
                const cropWidth = Math.round(singleCropSettings.width * scaleX);
                const cropHeight = Math.round(singleCropSettings.height * scaleY);
                const startX = Math.round(singleCropSettings.startX * scaleX);
                const startY = Math.round(singleCropSettings.startY * scaleY);

                // 4배 확대 (OCR 정확도 극대화)
                const scale = 4;
                canvas.width = cropWidth * scale;
                canvas.height = cropHeight * scale;

                console.log(`[cropBottomPart] Image: ${img.width}x${img.height}, Crop: X=${startX}, Y=${startY}, W=${cropWidth}, H=${cropHeight}, Scale: ${scale}x`);

                // 크롭된 영역을 확대해서 그리기
                ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

                // 마스킹 적용
                applyMasking(ctx, scaleX, scaleY, startX, startY, scale);

                // 전처리 적용 (노이즈 제거 + 흑백 + 대비 강화 + 이진화 + 반전)
                preprocessImage(ctx, canvas.width, canvas.height);
                console.log('[cropBottomPart] 전처리 완료: 흰배경/검은글자');

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(base64Image);
            img.src = base64Image;
        });
    };

    // 다중 영역 크롭 (세로로 합쳐서 하나의 이미지 반환)
    const cropMultipleRegions = (base64Image: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const baseWidth = 1920;
                const baseHeight = 1080;
                const scaleX = img.width / baseWidth;
                const scaleY = img.height / baseHeight;

                const enabledRegions = cropRegions.filter(r => r.enabled);
                const processedCanvases: HTMLCanvasElement[] = [];

                // 1. 각 영역별로 캔버스 생성 및 전처리
                for (const region of enabledRegions) {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    const cropWidth = Math.round(region.width * scaleX);
                    const cropHeight = Math.round(region.height * scaleY);
                    const startX = Math.round(region.startX * scaleX);
                    const startY = Math.round(region.startY * scaleY);

                    // 4배 확대
                    const scale = 4;
                    canvas.width = cropWidth * scale;
                    canvas.height = cropHeight * scale;

                    // 이미지 그리기
                    ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

                    // 마스킹 적용 (각 조각별로 상대 좌표 계산되어 적용됨)
                    applyMasking(ctx, scaleX, scaleY, startX, startY, scale);

                    // 전처리 적용 (흰 배경 검은 글씨로 변환됨)
                    preprocessImage(ctx, canvas.width, canvas.height);

                    processedCanvases.push(canvas);
                }

                if (processedCanvases.length === 0) {
                    resolve(base64Image);
                    return;
                }

                // 2. 세로로 합치기 (Stitching) - OCR이 줄바꿈을 더 잘 인식하도록
                const padding = 30; // 조각 사이 충분한 여백 (픽셀)
                const maxCanvasWidth = Math.max(...processedCanvases.map(c => c.width));
                const totalHeight = processedCanvases.reduce((acc, c) => acc + c.height, 0) + (processedCanvases.length - 1) * padding;

                const stitchedCanvas = document.createElement('canvas');
                stitchedCanvas.width = maxCanvasWidth;
                stitchedCanvas.height = totalHeight;
                const sCtx = stitchedCanvas.getContext('2d');

                if (!sCtx) {
                    resolve(base64Image);
                    return;
                }

                // 배경을 흰색으로 채우기 (전처리 결과가 흰 배경이므로)
                sCtx.fillStyle = '#FFFFFF';
                sCtx.fillRect(0, 0, stitchedCanvas.width, stitchedCanvas.height);

                let currentY = 0;
                processedCanvases.forEach(canvas => {
                    sCtx.drawImage(canvas, 0, currentY);
                    currentY += canvas.height + padding;
                });

                console.log(`[cropMultipleRegions] Stitched ${processedCanvases.length} regions vertically. Total size: ${stitchedCanvas.width}x${stitchedCanvas.height}`);

                resolve(stitchedCanvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(base64Image);
            img.src = base64Image;
        });
    };

    // 크롭 미리보기용 - 모든 영역을 표시한 이미지 생성
    const generatePreviewWithRegions = (base64Image: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64Image); return; }

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const baseWidth = 1920;
                const baseHeight = 1080;
                const scaleX = img.width / baseWidth;
                const scaleY = img.height / baseHeight;

                // 각 영역을 사각형으로 표시
                const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

                if (useSingleRegion) {
                    // 단일 영역 모드
                    const x = Math.round(singleCropSettings.startX * scaleX);
                    const y = Math.round(singleCropSettings.startY * scaleY);
                    const w = Math.round(singleCropSettings.width * scaleX);
                    const h = Math.round(singleCropSettings.height * scaleY);

                    ctx.strokeStyle = '#FACC15';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, w, h);
                    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
                    ctx.fillRect(x, y, w, h);

                    ctx.fillStyle = '#FACC15';
                    ctx.font = 'bold 24px sans-serif';
                    ctx.fillText('전체 영역', x + 10, y - 10);
                } else {
                    // 다중 영역 모드
                    cropRegions.forEach((region, idx) => {
                        if (!region.enabled) return;

                        const x = Math.round(region.startX * scaleX);
                        const y = Math.round(region.startY * scaleY);
                        const w = Math.round(region.width * scaleX);
                        const h = Math.round(region.height * scaleY);

                        ctx.strokeStyle = colors[idx % colors.length];
                        ctx.lineWidth = 3;
                        ctx.strokeRect(x, y, w, h);
                        ctx.fillStyle = colors[idx % colors.length].replace(')', ', 0.2)').replace('rgb', 'rgba');
                        ctx.fillRect(x, y, w, h);

                        ctx.fillStyle = colors[idx % colors.length];
                        ctx.font = 'bold 20px sans-serif';
                        ctx.fillText(region.name, x + 5, y - 5);
                    });

                    // 마스킹 영역 표시 (붉은색 빗금 또는 엑스 표시)
                    blockedRegions.forEach((mask) => {
                        if (!mask.enabled) return;

                        const x = Math.round(mask.startX * scaleX);
                        const y = Math.round(mask.startY * scaleY);
                        const w = Math.round(mask.width * scaleX);
                        const h = Math.round(mask.height * scaleY);

                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // 반투명 빨강
                        ctx.fillRect(x, y, w, h);

                        ctx.strokeStyle = '#FF0000';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, y, w, h);

                        // X 표시
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.moveTo(x + w, y);
                        ctx.lineTo(x, y + h);
                        ctx.stroke();

                        ctx.fillStyle = '#FF0000';
                        ctx.font = 'bold 16px sans-serif';
                        ctx.fillText('MASK', x + 5, y + 20);
                    });
                }

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(base64Image);
            img.src = base64Image;
        });
    };

    // 대표 캐릭터 정보 가져오기 (localStorage에서)
    const getMainCharacter = (): MainCharacter | null => {
        try {
            const saved = localStorage.getItem(MAIN_CHARACTER_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[usePartyScanner] Failed to get main character:', e);
        }
        return null;
    };

    // 중복 약어 → 가능한 서버 목록 (약어가 여러 서버에 해당할 수 있는 경우)
    const ambiguousAbbreviations: Record<string, string[]> = {
        '이스': ['이스라펠', '이스할겐', '이슈타르'],
        '이스라': ['이스라펠'],
        '이스할': ['이스할겐'],
        '이슈': ['이슈타르'],
        '아스': ['아스펠'],
        '아리': ['아리엘'],
        '루미': ['루미엘'],
        '루드': ['루드라'],
        '루터': ['루터스'],
        '네자': ['네자칸'],
        '네몬': ['네몬'],
        '바이': ['바이젤'],
        '바바': ['바바룽'],
        '바카': ['바카르마'],
    };

    // 서버 약어가 여러 서버에 해당하는지 확인
    const getPossibleServers = (ocrServer: string): string[] => {
        // 정확한 중복 약어 매칭
        if (ambiguousAbbreviations[ocrServer]) {
            return ambiguousAbbreviations[ocrServer];
        }
        // 단일 서버로 보정되는 경우
        const corrected = correctServerName(ocrServer);
        return [corrected];
    };

    // OCR 서버명 오타 보정 (최소 2글자 이상만 매칭)
    const correctServerName = (ocrServer: string): string => {
        const corrections: Record<string, string> = {
            // === 천족 서버 (1xxx) ===
            '시엘': '시엘',
            '네자칸': '네자칸', '네자': '네자칸',
            '바이젤': '바이젤', '바이': '바이젤',
            '카이시넬': '카이시넬', '카이시': '카이시넬',
            '유스티엘': '유스티엘', '유스티': '유스티엘',
            '아리엘': '아리엘', '아리': '아리엘',
            '프레기온': '프레기온', '프레기': '프레기온',
            '메스람타에다': '메스람타에다', '메스람': '메스람타에다',
            '히타니에': '히타니에', '히타니': '히타니에',
            '나니아': '나니아', '나니': '나니아',
            '타하바타': '타하바타', '타하바': '타하바타',
            '루터스': '루터스', '루터': '루터스',
            '페르노스': '페르노스', '페르노': '페르노스',
            '다미누': '다미누', '다미': '다미누',
            '카사카': '카사카', '카사': '카사카',
            '바카르마': '바카르마', '바카르': '바카르마',
            '챈가룽': '챈가룽', '챈가': '챈가룽',
            '코치룽': '코치룽', '코치': '코치룽',
            '이슈타르': '이슈타르', '이슈타': '이슈타르',
            '티아마트': '티아마트', '티아마': '티아마트',
            '포에타': '포에타', '포에': '포에타',

            // === 마족 서버 (2xxx) ===
            '이스라펠': '이스라펠', '이스라엘': '이스라펠', '이스라': '이스라펠',
            '지켈': '지켈', '지헬': '지켈', '지겔': '지켈', '지게': '지켈',
            '트리니엘': '트리니엘', '트리니': '트리니엘', '트리': '트리니엘',
            '루미엘': '루미엘', '루미': '루미엘',
            '마르쿠탄': '마르쿠탄', '마르쿠': '마르쿠탄', '마르': '마르쿠탄',
            '아스펠': '아스펠', '아스': '아스펠',
            '에레슈키갈': '에레슈키갈', '에레슈키': '에레슈키갈', '에레슈': '에레슈키갈', '에레': '에레슈키갈',
            '브리트라': '브리트라', '브리트': '브리트라', '브리': '브리트라',
            '네몬': '네몬', '네모': '네몬',
            '하달': '하달',
            '루드라': '루드라', '루드': '루드라',
            '울고른': '울고른', '울고': '울고른',
            '무닌': '무닌',
            '오다르': '오다르', '오다': '오다르',
            '젠카카': '젠카카', '젠카': '젠카카',
            '크로메데': '크로메데', '크로메': '크로메데', '크로': '크로메데',
            '콰이링': '콰이링', '콰이': '콰이링',
            '바바룽': '바바룽', '바바': '바바룽',
            '파프니르': '파프니르', '파프니': '파프니르', '파프': '파프니르',
            '인드나흐': '인드나흐', '인드나': '인드나흐', '인드': '인드나흐',
            '이스할겐': '이스할겐', '이스할': '이스할겐',
        };

        // 정확한 매칭만 사용 (2글자 이상)
        if (ocrServer.length >= 2 && corrections[ocrServer]) {
            console.log(`[correctServerName] Corrected: ${ocrServer} → ${corrections[ocrServer]}`);
            return corrections[ocrServer];
        }

        // 1글자는 서버명으로 인식하지 않음
        if (ocrServer.length < 2) {
            console.log(`[correctServerName] Too short, ignoring: ${ocrServer}`);
            return ocrServer;
        }

        return ocrServer;
    };

    // 파싱된 멤버 정보 (서버가 여러 개일 수 있음)
    interface ParsedMember {
        name: string;
        rawServer: string; // OCR로 인식된 원본 서버명
        possibleServers: string[]; // 가능한 서버 목록
        isMainCharacter?: boolean;
    }

    const smartParse = (rawText: string, addLog: (msg: string) => void): ParsedMember[] => {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const matches: ParsedMember[] = [];
        const seenNames = new Set<string>();
        const mainChar = getMainCharacter();

        console.log('[smartParse] Raw lines:', lines);
        console.log('[smartParse] Main character:', mainChar?.name);
        addLog(`[OCR 원본] ${rawText.substring(0, 200)}...`);
        addLog(`[라인 수] ${lines.length}개`);

        const addMember = (name: string, rawServer: string, possibleServers: string[], isMain: boolean = false) => {
            const cleanName = name.replace(/[^a-zA-Z0-9가-힣]/g, '');
            if (cleanName.length < 1 || seenNames.has(cleanName)) return false; // 1글자 캐릭터도 허용

            matches.push({ name: cleanName, rawServer, possibleServers, isMainCharacter: isMain });
            seenNames.add(cleanName);
            console.log('[smartParse] Added member:', cleanName, possibleServers, isMain);
            if (possibleServers.length > 1) {
                addLog(`[파싱] 멤버 추가: ${cleanName} [${rawServer}] → 서버 후보: ${possibleServers.join(', ')}${isMain ? ' (대표)' : ''}`);
            } else {
                addLog(`[파싱] 멤버 추가: ${cleanName} [${possibleServers[0]}]${isMain ? ' (대표)' : ''}`);
            }
            return true;
        };

        // 1. 대표 캐릭터를 먼저 슬롯 1에 추가 (항상 첫 번째)
        if (mainChar) {
            addLog(`[대표캐릭터] ${mainChar.name} [${mainChar.server}] - 슬롯 1 고정`);
            // 대표 캐릭터는 이미 DB 정보를 알고 있다고 가정할 수도 있지만, 일단 OCR 결과와 합치기 위해 추가
            // 단, OCR에서 중복으로 나오지 않도록 seenNames에 추가
            matches.push({
                name: mainChar.name,
                rawServer: mainChar.server,
                possibleServers: [mainChar.server],
                isMainCharacter: true
            });
            seenNames.add(mainChar.name);
        } else {
            addLog(`[안내] 대표 캐릭터가 설정되지 않았습니다.`);
        }

        // 서버명 있는 패턴: 이름 [서버]
        const serverRegex = /([가-힣a-zA-Z0-9]+)\s*\[([가-힣a-zA-Z0-9]+)\]/;

        // 전체 텍스트에서 한글 이름 추출
        const fullText = rawText.replace(/\n/g, ' ');

        // 2. OCR에서 서버명 패턴 찾기 (이름[서버] 형식)
        addLog(`[패턴 검색] "이름[서버]" 형식 찾는 중...`);
        const serverMatches = Array.from(fullText.matchAll(new RegExp(serverRegex, 'g')));
        let serverMatchCount = 0;

        for (const match of serverMatches) {
            // 이미 3명 추가됨 (대표 1 + OCR 3 = 4명 최대)
            if (matches.length >= 4) {
                addLog(`[패턴 스킵] 최대 4명 도달`);
                break;
            }

            const name = match[1];
            const rawServer = match[2];

            // 숫자만 있는 서버명은 OCR 오류로 스킵
            if (/^\d+$/.test(rawServer)) {
                addLog(`[패턴 스킵] ${name}[${rawServer}] - 숫자만 있는 서버명`);
                continue;
            }

            // 서버명이 2글자 미만이면 스킵
            if (rawServer.length < 2) {
                addLog(`[패턴 스킵] ${name}[${rawServer}] - 서버명이 너무 짧음`);
                continue;
            }

            // 이름이 비어있으면 스킵 (1글자 허용)
            if (name.length < 1) {
                addLog(`[패턴 스킵] ${name}[${rawServer}] - 이름이 비어있음`);
                continue;
            }

            // "서버명" 또는 유효하지 않은 서버명인 경우 대표 캐릭터 서버로 대체
            let possibleServers: string[];
            const isPlaceholder = rawServer === '서버명' || rawServer === '서버' || rawServer === 'server';
            const correctedServer = correctServerName(rawServer);
            const isValidServer = SERVER_NAME_TO_ID[correctedServer] !== undefined;

            if (isPlaceholder || !isValidServer) {
                // 대표 캐릭터 서버로 대체
                if (mainChar) {
                    possibleServers = [mainChar.server];
                    addLog(`[패턴 매칭] ${name}[${rawServer}] → 대표 서버(${mainChar.server})로 대체`);
                } else {
                    addLog(`[패턴 스킵] ${name}[${rawServer}] - 유효하지 않은 서버명, 대표캐릭터 없음`);
                    continue;
                }
            } else {
                possibleServers = getPossibleServers(rawServer);
                if (possibleServers.length > 1) {
                    addLog(`[패턴 매칭] ${name}[${rawServer}] → 서버 후보 ${possibleServers.length}개: ${possibleServers.join(', ')}`);
                } else {
                    addLog(`[패턴 매칭] ${name}[${rawServer}] → ${possibleServers[0]}`);
                }
            }

            // 대표 캐릭터와 같은 이름이면 스킵 (이미 추가됨)
            if (mainChar && name === mainChar.name) {
                addLog(`[패턴 스킵] ${name}[${rawServer}] - 대표 캐릭터와 동일`);
                continue;
            }

            addMember(name, rawServer, possibleServers, false);
            serverMatchCount++;
        }
        addLog(`[패턴 결과] ${serverMatchCount}개 매칭됨 (서버명 있는 캐릭터)`);

        // 3. 서버명 없는 캐릭터도 찾기 (대표 캐릭터 서버로 검색)
        // 대표 캐릭터가 없으면 이 로직은 동작하지 않음 (서버를 알 수 없으므로)
        if (mainChar && matches.length < 4) {
            addLog(`[패턴 검색] 서버명 없는 캐릭터 찾는 중 (대표 서버: ${mainChar.server})...`);

            // 한글 이름 패턴 (1~6글자)
            const nameOnlyRegex = /([가-힣]{1,6})/g;
            const allNames = Array.from(fullText.matchAll(nameOnlyRegex));

            for (const match of allNames) {
                if (matches.length >= 4) break;

                const name = match[1];

                // 이미 추가된 이름이면 스킵
                if (seenNames.has(name)) continue;

                // 대표 캐릭터와 같은 이름이면 스킵
                if (name === mainChar.name) continue;

                // 서버명으로 보이는 단어는 스킵 (서버명 목록에 있는 경우)
                const correctedServer = correctServerName(name);
                if (correctedServer !== name && SERVER_NAME_TO_ID[correctedServer]) continue;

                // "준비", "완료", "중" 등 상태 텍스트 스킵
                if (['준비', '완료', '중', '준비중', '대기'].includes(name)) continue;

                // 이미 서버명과 함께 파싱된 이름인지 확인 (fullText에서 name[서버] 패턴 존재 여부)
                const hasServerPattern = new RegExp(`${name}\\s*\\[[가-힣a-zA-Z0-9]+\\]`).test(fullText);
                if (hasServerPattern) continue;

                // 대표 캐릭터 서버로 추가
                addLog(`[서버없음] ${name} → 대표 서버(${mainChar.server})로 검색`);
                addMember(name, mainChar.server, [mainChar.server], false);
            }
        }

        console.log('[smartParse] Final matches:', matches);
        addLog(`[최종] 대표캐릭터 1명 + OCR ${matches.length - 1}명 = 총 ${matches.length}명`);
        return matches.slice(0, 4); // 파티 총원 4명 제한
    };

    // Next.js API를 통해 캐릭터 상세 정보 조회 (noa_score 계산 포함)
    const fetchCharacterWithNoaScore = async (characterId: string, serverId: number): Promise<any> => {
        try {
            const res = await fetch(`/api/character?characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`);
            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }
            const data = await res.json();

            // item_level 추출 (stats.statList에서)
            let itemLevel = 0;
            if (data.stats?.statList && Array.isArray(data.stats.statList)) {
                const itemLevelStat = data.stats.statList.find((s: any) =>
                    s.name === '아이템레벨' || s.type === 'ItemLevel'
                );
                itemLevel = itemLevelStat?.value || 0;
            }

            console.log(`[fetchCharacterWithNoaScore] Got data for ${characterId}:`,
                'noa_score:', data.profile?.noa_score, 'item_level:', itemLevel);

            // item_level을 데이터에 추가하여 반환
            return { ...data, item_level: itemLevel };
        } catch (err) {
            console.error(`[fetchCharacterWithNoaScore] Error:`, err);
            return null;
        }
    };

    // OCR 모음 혼동 보정 - 대체 이름 생성
    const generateAlternativeNames = (name: string): string[] => {
        const alternatives: string[] = [];

        // 한글 유니코드 분해/조합을 위한 상수
        const HANGUL_START = 0xAC00;
        const HANGUL_END = 0xD7A3;
        const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
        const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

        // OCR에서 자주 혼동되는 모음 쌍 (인덱스 기반)
        // ㅏ(0), ㅐ(1), ㅑ(2), ㅒ(3), ㅓ(4), ㅔ(5), ㅕ(6), ㅖ(7), ㅗ(8), ...
        // ㅜ(13), ㅠ(17), ㅡ(18), ㅢ(19), ㅣ(20)
        const vowelSwaps: [number, number][] = [
            [6, 4],   // ㅕ ↔ ㅓ
            [2, 0],   // ㅑ ↔ ㅏ
            [17, 13], // ㅠ ↔ ㅜ
            [12, 8],  // ㅛ ↔ ㅗ
            [1, 20],  // ㅐ ↔ ㅣ (로캐/로키 혼동)
            [5, 20],  // ㅔ ↔ ㅣ
            [1, 5],   // ㅐ ↔ ㅔ
        ];

        // 각 모음 쌍에 대해 대체 이름 생성
        for (const [v1, v2] of vowelSwaps) {
            let altName = '';
            let hasChange = false;

            for (const char of name) {
                const code = char.charCodeAt(0);

                if (code >= HANGUL_START && code <= HANGUL_END) {
                    const offset = code - HANGUL_START;
                    const choIdx = Math.floor(offset / (21 * 28));
                    const jungIdx = Math.floor((offset % (21 * 28)) / 28);
                    const jongIdx = offset % 28;

                    // 모음 교체
                    let newJungIdx = jungIdx;
                    if (jungIdx === v1) {
                        newJungIdx = v2;
                        hasChange = true;
                    } else if (jungIdx === v2) {
                        newJungIdx = v1;
                        hasChange = true;
                    }

                    const newCode = HANGUL_START + (choIdx * 21 * 28) + (newJungIdx * 28) + jongIdx;
                    altName += String.fromCharCode(newCode);
                } else {
                    altName += char;
                }
            }

            if (hasChange && altName !== name && !alternatives.includes(altName)) {
                alternatives.push(altName);
            }
        }

        return alternatives;
    };

    // OCR 자음 혼동 보정 - 한 글자씩 개별 교체
    // ㅂ(7) ↔ ㅎ(18), ㄷ(3) ↔ ㄸ(4) 등
    const generateDoubleConsonantAlternatives = (name: string): string[] => {
        console.log(`[generateDoubleConsonantAlternatives] 입력: "${name}"`);
        const alternatives: string[] = [];

        const HANGUL_START = 0xAC00;
        const HANGUL_END = 0xD7A3;

        // 초성 혼동 쌍 (인덱스 기반)
        const consonantSwaps: [number, number][] = [
            [7, 18],  // ㅂ(7) ↔ ㅎ(18) - OCR 혼동 (가장 중요!)
            [3, 16],  // ㄷ(3) ↔ ㅌ(16) - OCR 혼동 (테/데)
            [3, 4],   // ㄷ(3) ↔ ㄸ(4)
            [0, 1],   // ㄱ(0) ↔ ㄲ(1)
            [7, 8],   // ㅂ(7) ↔ ㅃ(8)
            [9, 10],  // ㅅ(9) ↔ ㅆ(10)
            [12, 13], // ㅈ(12) ↔ ㅉ(13)
            [6, 2],   // ㅁ(6) ↔ ㄴ(2) - OCR 혼동
        ];

        // 이름을 글자 배열로 분해
        const chars = Array.from(name);
        const charInfos: { char: string; choIdx: number; jungIdx: number; jongIdx: number; isHangul: boolean }[] = [];

        for (const char of chars) {
            const code = char.charCodeAt(0);
            if (code >= HANGUL_START && code <= HANGUL_END) {
                const offset = code - HANGUL_START;
                charInfos.push({
                    char,
                    choIdx: Math.floor(offset / (21 * 28)),
                    jungIdx: Math.floor((offset % (21 * 28)) / 28),
                    jongIdx: offset % 28,
                    isHangul: true
                });
            } else {
                charInfos.push({ char, choIdx: -1, jungIdx: -1, jongIdx: -1, isHangul: false });
            }
        }

        // 각 글자 위치에서 개별적으로 초성 교체
        for (let pos = 0; pos < charInfos.length; pos++) {
            const info = charInfos[pos];
            if (!info.isHangul) continue;

            for (const [c1, c2] of consonantSwaps) {
                let newChoIdx = -1;

                if (info.choIdx === c1) {
                    newChoIdx = c2;
                } else if (info.choIdx === c2) {
                    newChoIdx = c1;
                }

                if (newChoIdx !== -1) {
                    // 해당 위치의 글자만 교체한 새 이름 생성
                    let altName = '';
                    for (let i = 0; i < charInfos.length; i++) {
                        if (i === pos) {
                            const newCode = HANGUL_START + (newChoIdx * 21 * 28) + (info.jungIdx * 28) + info.jongIdx;
                            altName += String.fromCharCode(newCode);
                        } else {
                            altName += charInfos[i].char;
                        }
                    }

                    if (altName !== name && !alternatives.includes(altName)) {
                        console.log(`[generateDoubleConsonantAlternatives] 변환: "${name}" [${pos}번째] → "${altName}"`);
                        alternatives.push(altName);
                    }
                }
            }
        }

        console.log(`[generateDoubleConsonantAlternatives] 결과: ${alternatives.length}개 -`, alternatives);
        return alternatives;
    };

    // 디버그 로그 추가 헬퍼
    const addSearchLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [...prev, msg]);
    };

    // DB/API에서 캐릭터 정보 조회
    const lookupCharacter = async (name: string, serverName: string): Promise<PartyMember | null> => {
        // 서버명 보정 후 ID 조회
        const correctedServer = correctServerName(serverName);
        const serverId = SERVER_NAME_TO_ID[correctedServer];

        addSearchLog(`🔍 검색 시작: "${name}" [${correctedServer}]`);

        // 유효하지 않은 서버명이면 스킵
        if (!serverId) {
            console.log(`[lookupCharacter] Invalid server name: ${serverName}, skipping`);
            return null;
        }

        // 레벤슈타인 거리 계산 (편집 거리)
        const levenshtein = (a: string, b: string): number => {
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            const matrix = [];
            for (let i = 0; i <= b.length; i++) matrix[i] = [i];
            for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            return matrix[b.length][a.length];
        };

        const findExactMatch = (results: any[], searchName: string, originalLength?: number) => {
            if (results.length === 0) return null;

            // 글자수가 일치하고 이름이 정확히 일치하는 캐릭터만 반환
            const targetLength = originalLength || searchName.length;
            const exact = results.find(r =>
                r.name === searchName && r.name.length === targetLength
            );
            if (exact) return { match: exact, type: 'exact' };

            return null;
        };

        try {
            // 1. 로컬 DB 먼저 검색 (빠름)
            const localResults = await supabaseApi.searchLocalCharacter(name, serverId);
            addSearchLog(`   └ 로컬DB: ${localResults.length}개 결과`);
            if (localResults.length > 0) {
                addSearchLog(`   └ 결과: ${localResults.map((r: any) => r.name).join(', ')}`);
            }
            const localMatch = findExactMatch(localResults, name);

            if (localMatch) {
                addSearchLog(`✅ 로컬DB에서 찾음: "${localMatch.match.name}"`);
                console.log(`[lookupCharacter] Found in local DB:`, localMatch.match.name,
                    'noa_score:', localMatch.match.noa_score, 'item_level:', localMatch.match.item_level);

                // 로컬 검색 결과에 noa_score가 있으면 바로 사용
                if (localMatch.match.noa_score && localMatch.match.noa_score > 0) {
                    console.log(`[lookupCharacter] Using local search result data (has noa_score)`);
                    return {
                        id: localMatch.match.characterId,
                        characterId: localMatch.match.characterId,
                        name: localMatch.match.name,
                        class: localMatch.match.job || 'Unknown',
                        cp: localMatch.match.noa_score,
                        gearScore: localMatch.match.item_level || 0,
                        server: localMatch.match.server,
                        level: localMatch.match.level,
                        profileImage: localMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: localMatch.match.race,
                        pvpScore: localMatch.match.pvp_score
                    };
                }

                // noa_score가 없으면 Next.js API를 통해 상세 조회 (noa_score 계산)
                console.log(`[lookupCharacter] No noa_score in local result, fetching from /api/character...`);
                try {
                    // Next.js API 호출 (noa_score 계산 포함)
                    const detail = await fetchCharacterWithNoaScore(localMatch.match.characterId, serverId);
                    if (detail && detail.profile) {
                        const noaScore = detail.profile.noa_score || 0;
                        const itemLevel = detail.item_level || 0;
                        const className = detail.profile.className || localMatch.match.job || 'Unknown';

                        console.log(`[lookupCharacter] Got data from /api/character - CP: ${noaScore}, GearScore: ${itemLevel}`);

                        return {
                            id: detail.profile.characterId || localMatch.match.characterId,
                            characterId: detail.profile.characterId || localMatch.match.characterId,
                            name: detail.profile.characterName || localMatch.match.name,
                            class: className,
                            cp: noaScore,
                            gearScore: itemLevel,
                            server: detail.profile.serverName || localMatch.match.server,
                            level: detail.profile.characterLevel || localMatch.match.level,
                            profileImage: detail.profile.profileImage || localMatch.match.imageUrl,
                            isMvp: false,
                            isFromDb: true,
                            race: detail.profile.raceName || detail.profile.race || localMatch.match.race,
                            pvpScore: detail.profile.pvp_score || detail.profile.pvpScore || localMatch.match.pvp_score || 0
                        };
                    }

                    // API 실패시 검색 결과 사용
                    console.log(`[lookupCharacter] API returned no data, using search result`);
                    return {
                        id: localMatch.match.characterId,
                        characterId: localMatch.match.characterId,
                        name: localMatch.match.name,
                        class: localMatch.match.job || 'Unknown',
                        cp: localMatch.match.noa_score || 0,
                        gearScore: localMatch.match.item_level || 0,
                        server: localMatch.match.server,
                        level: localMatch.match.level,
                        profileImage: localMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: localMatch.match.race,
                        pvpScore: localMatch.match.pvp_score
                    };
                } catch (detailErr) {
                    console.error(`[lookupCharacter] Failed to get detail, using search result:`, detailErr);
                    return {
                        id: localMatch.match.characterId,
                        characterId: localMatch.match.characterId,
                        name: localMatch.match.name,
                        class: localMatch.match.job || 'Unknown',
                        cp: localMatch.match.noa_score || 0,
                        gearScore: localMatch.match.item_level || 0,
                        server: localMatch.match.server,
                        level: localMatch.match.level,
                        profileImage: localMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: localMatch.match.race,
                        pvpScore: localMatch.match.pvp_score
                    };
                }
            }

            // 2. 로컬 DB에 없으면 라이브 API 검색
            addSearchLog(`   └ 라이브API 검색 중...`);
            const liveResponse = await supabaseApi.searchCharacter(name, serverId);
            const liveResults = liveResponse.list;
            addSearchLog(`   └ 라이브API: ${liveResults.length}개 결과`);
            if (liveResults.length > 0) {
                addSearchLog(`   └ 결과: ${liveResults.map((r: any) => r.name).join(', ')}`);
            }
            const liveMatch = findExactMatch(liveResults, name);

            if (liveMatch) {
                addSearchLog(`✅ 라이브API에서 찾음: "${liveMatch.match.name}"`);
                console.log(`[lookupCharacter] Found in live API:`, liveMatch.match.name,
                    'noa_score:', liveMatch.match.noa_score, 'item_level:', liveMatch.match.item_level);

                // 검색 결과에 noa_score가 있으면 상세 조회 생략 (이미 DB에서 merge됨)
                if (liveMatch.match.noa_score && liveMatch.match.noa_score > 0) {
                    console.log(`[lookupCharacter] Using search result data (has noa_score)`);
                    return {
                        id: liveMatch.match.characterId,
                        characterId: liveMatch.match.characterId,
                        name: liveMatch.match.name,
                        class: liveMatch.match.job || 'Unknown',
                        cp: liveMatch.match.noa_score,
                        gearScore: liveMatch.match.item_level || 0,
                        server: liveMatch.match.server,
                        level: liveMatch.match.level,
                        profileImage: liveMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: liveMatch.match.race,
                        pvpScore: liveMatch.match.pvp_score
                    };
                }

                // noa_score가 없으면 Next.js API를 통해 상세 조회 (noa_score 계산)
                console.log(`[lookupCharacter] No noa_score in search result, fetching from /api/character...`);
                try {
                    // Next.js API 호출 (noa_score 계산 포함)
                    const detail = await fetchCharacterWithNoaScore(liveMatch.match.characterId, serverId);
                    if (detail && detail.profile) {
                        const noaScore = detail.profile.noa_score || 0;
                        const itemLevel = detail.item_level || 0;
                        const className = detail.profile.className || liveMatch.match.job || 'Unknown';

                        console.log(`[lookupCharacter] Got data from /api/character - CP: ${noaScore}, GearScore: ${itemLevel}`);

                        return {
                            id: detail.profile.characterId || liveMatch.match.characterId,
                            characterId: detail.profile.characterId || liveMatch.match.characterId,
                            name: detail.profile.characterName || liveMatch.match.name,
                            class: className,
                            cp: noaScore,
                            gearScore: itemLevel,
                            server: detail.profile.serverName || liveMatch.match.server,
                            level: detail.profile.characterLevel || liveMatch.match.level,
                            profileImage: detail.profile.profileImage || liveMatch.match.imageUrl,
                            isMvp: false,
                            isFromDb: true,
                            race: detail.profile.raceName || detail.profile.race || liveMatch.match.race,
                            pvpScore: detail.profile.pvp_score || detail.profile.pvpScore || liveMatch.match.pvp_score || 0
                        };
                    }

                    // API 실패시 검색 결과 사용
                    console.log(`[lookupCharacter] API returned no data, using search result`);
                    return {
                        id: liveMatch.match.characterId,
                        characterId: liveMatch.match.characterId,
                        name: liveMatch.match.name,
                        class: liveMatch.match.job || 'Unknown',
                        cp: liveMatch.match.noa_score || 0,
                        gearScore: liveMatch.match.item_level || 0,
                        server: liveMatch.match.server,
                        level: liveMatch.match.level,
                        profileImage: liveMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: liveMatch.match.race,
                        pvpScore: liveMatch.match.pvp_score
                    };
                } catch (detailErr) {
                    console.error(`[lookupCharacter] Failed to get detail, using search result:`, detailErr);
                    return {
                        id: liveMatch.match.characterId,
                        characterId: liveMatch.match.characterId,
                        name: liveMatch.match.name,
                        class: liveMatch.match.job || 'Unknown',
                        cp: liveMatch.match.noa_score || 0,
                        gearScore: liveMatch.match.item_level || 0,
                        server: liveMatch.match.server,
                        level: liveMatch.match.level,
                        profileImage: liveMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: liveMatch.match.race,
                        pvpScore: liveMatch.match.pvp_score
                    };
                }
            }

            // 3. 못 찾으면 대체 이름(모음 교체 + 쌍자음 교체)으로 재검색
            addSearchLog(`❌ "${name}" 못 찾음 → 대체 이름 검색 시작`);
            const originalLength = name.length; // 원본 글자수 저장
            const vowelAltNames = generateAlternativeNames(name);
            const consonantAltNames = generateDoubleConsonantAlternatives(name);
            // 글자수가 같은 대체 이름만 사용
            const altNames = [...vowelAltNames, ...consonantAltNames].filter(
                alt => alt.length === originalLength
            );
            addSearchLog(`🔄 대체 이름 ${altNames.length}개 (${originalLength}글자): ${altNames.join(', ')}`);

            for (const altName of altNames) {
                addSearchLog(`   🔍 대체 검색: "${altName}" (${altName.length}글자)`);

                // 로컬 DB 검색 - 글자수 일치 확인
                const altLocalResults = await supabaseApi.searchLocalCharacter(altName, serverId);
                const altLocalMatch = findExactMatch(altLocalResults, altName, originalLength);

                if (altLocalMatch) {
                    addSearchLog(`   ✅ 대체이름 로컬DB: "${altName}" (원본: "${name}")`);
                    // noa_score 유무와 관계없이 찾은 결과 반환
                    return {
                        id: altLocalMatch.match.characterId,
                        characterId: altLocalMatch.match.characterId,
                        name: altLocalMatch.match.name,
                        class: altLocalMatch.match.job || 'Unknown',
                        cp: altLocalMatch.match.noa_score || 0,
                        gearScore: altLocalMatch.match.item_level || 0,
                        server: altLocalMatch.match.server,
                        level: altLocalMatch.match.level,
                        profileImage: altLocalMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: altLocalMatch.match.race,
                        pvpScore: altLocalMatch.match.pvp_score
                    };
                }

                // 라이브 API 검색 - 글자수 일치 확인
                const altLiveResponse = await supabaseApi.searchCharacter(altName, serverId);
                const altLiveResults = altLiveResponse.list;
                const altLiveMatch = findExactMatch(altLiveResults, altName, originalLength);

                if (altLiveMatch) {
                    addSearchLog(`   ✅ 대체이름 라이브API: "${altName}" (원본: "${name}")`);
                    if (altLiveMatch.match.noa_score && altLiveMatch.match.noa_score > 0) {
                        return {
                            id: altLiveMatch.match.characterId,
                            characterId: altLiveMatch.match.characterId,
                            name: altLiveMatch.match.name,
                            class: altLiveMatch.match.job || 'Unknown',
                            cp: altLiveMatch.match.noa_score,
                            gearScore: altLiveMatch.match.item_level || 0,
                            server: altLiveMatch.match.server,
                            level: altLiveMatch.match.level,
                            profileImage: altLiveMatch.match.imageUrl,
                            isMvp: false,
                            isFromDb: true,
                            race: altLiveMatch.match.race,
                            pvpScore: altLiveMatch.match.pvp_score
                        };
                    }

                    // noa_score 없으면 상세 조회
                    try {
                        const detail = await fetchCharacterWithNoaScore(altLiveMatch.match.characterId, serverId);
                        if (detail && detail.profile) {
                            return {
                                id: detail.profile.characterId || altLiveMatch.match.characterId,
                                characterId: detail.profile.characterId || altLiveMatch.match.characterId,
                                name: detail.profile.characterName || altLiveMatch.match.name,
                                class: detail.profile.className || altLiveMatch.match.job || 'Unknown',
                                cp: detail.profile.noa_score || 0,
                                gearScore: detail.item_level || 0,
                                server: detail.profile.serverName || altLiveMatch.match.server,
                                level: detail.profile.characterLevel || altLiveMatch.match.level,
                                profileImage: detail.profile.profileImage || altLiveMatch.match.imageUrl,
                                isMvp: false,
                                isFromDb: true,
                                race: detail.profile.raceName || detail.profile.race || altLiveMatch.match.race,
                                pvpScore: detail.profile.pvp_score || detail.profile.pvpScore || altLiveMatch.match.pvp_score || 0
                            };
                        }
                    } catch (e) {
                        console.error(`[lookupCharacter] Failed to get detail for alt name:`, e);
                    }

                    // 상세 조회 실패해도 찾은 결과 반환
                    addSearchLog(`   ✅ 대체이름 반환: "${altLiveMatch.match.name}"`);
                    return {
                        id: altLiveMatch.match.characterId,
                        characterId: altLiveMatch.match.characterId,
                        name: altLiveMatch.match.name,
                        class: altLiveMatch.match.job || 'Unknown',
                        cp: altLiveMatch.match.noa_score || 0,
                        gearScore: altLiveMatch.match.item_level || 0,
                        server: altLiveMatch.match.server,
                        level: altLiveMatch.match.level,
                        profileImage: altLiveMatch.match.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: altLiveMatch.match.race,
                        pvpScore: altLiveMatch.match.pvp_score
                    };
                }
            }

            addSearchLog(`❌ "${name}" 대체 이름으로도 못 찾음`);
            return null;
        } catch (err) {
            console.error(`[usePartyScanner] Failed to lookup character: ${name}`, err);
            addSearchLog(`❌ "${name}" 검색 오류: ${err}`);
            return null;
        }
    };

    // 원본 이름과 대체 이름 모두 검색하여 반환
    const lookupCharacterWithAlternatives = async (name: string, serverName: string): Promise<LookupResult> => {
        const correctedServer = correctServerName(serverName);
        const serverId = SERVER_NAME_TO_ID[correctedServer];

        if (!serverId) {
            return { primary: null, alternatives: [] };
        }

        const originalLength = name.length;
        const vowelAltNames = generateAlternativeNames(name);
        const consonantAltNames = generateDoubleConsonantAlternatives(name);
        const altNames = [...vowelAltNames, ...consonantAltNames].filter(
            alt => alt.length === originalLength
        );

        addSearchLog(`🔍 "${name}" + 대체이름 ${altNames.length}개 동시 검색 중...`);

        // 원본 이름 검색 (기존 lookupCharacter의 앞부분만 사용)
        const searchPrimary = async (): Promise<PartyMember | null> => {
            const findExactMatch = (results: any[], searchName: string) => {
                if (results.length === 0) return null;
                const exact = results.find(r => r.name === searchName && r.name.length === originalLength);
                return exact || null;
            };

            try {
                // 로컬 DB 검색
                const localResults = await supabaseApi.searchLocalCharacter(name, serverId);
                const localMatch = findExactMatch(localResults, name);

                if (localMatch) {
                    return {
                        id: localMatch.characterId,
                        characterId: localMatch.characterId,
                        name: localMatch.name,
                        class: localMatch.job || 'Unknown',
                        cp: localMatch.noa_score || 0,
                        gearScore: localMatch.item_level || 0,
                        server: localMatch.server,
                        level: localMatch.level,
                        profileImage: localMatch.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: localMatch.race,
                        pvpScore: localMatch.pvp_score
                    };
                }

                // 라이브 API 검색
                const liveResponse = await supabaseApi.searchCharacter(name, serverId);
                const liveResults = liveResponse.list;
                const liveMatch = findExactMatch(liveResults, name);

                if (liveMatch) {
                    return {
                        id: liveMatch.characterId,
                        characterId: liveMatch.characterId,
                        name: liveMatch.name,
                        class: liveMatch.job || 'Unknown',
                        cp: liveMatch.noa_score || 0,
                        gearScore: liveMatch.item_level || 0,
                        server: liveMatch.server,
                        level: liveMatch.level,
                        profileImage: liveMatch.imageUrl,
                        isMvp: false,
                        isFromDb: true,
                        race: liveMatch.race,
                        pvpScore: liveMatch.pvp_score
                    };
                }

                return null;
            } catch {
                return null;
            }
        };

        // 대체 이름 검색
        const searchAlternative = async (altName: string): Promise<{ name: string; character: PartyMember } | null> => {
            const findExactMatch = (results: any[], searchName: string) => {
                if (results.length === 0) return null;
                const exact = results.find(r => r.name === searchName && r.name.length === originalLength);
                return exact || null;
            };

            try {
                // 로컬 DB 검색
                const localResults = await supabaseApi.searchLocalCharacter(altName, serverId);
                const localMatch = findExactMatch(localResults, altName);

                if (localMatch) {
                    return {
                        name: altName,
                        character: {
                            id: localMatch.characterId,
                            characterId: localMatch.characterId,
                            name: localMatch.name,
                            class: localMatch.job || 'Unknown',
                            cp: localMatch.noa_score || 0,
                            gearScore: localMatch.item_level || 0,
                            server: localMatch.server,
                            level: localMatch.level,
                            profileImage: localMatch.imageUrl,
                            isMvp: false,
                            isFromDb: true,
                            race: localMatch.race,
                            pvpScore: localMatch.pvp_score
                        }
                    };
                }

                // 라이브 API 검색
                const liveResponse = await supabaseApi.searchCharacter(altName, serverId);
                const liveResults = liveResponse.list;
                const liveMatch = findExactMatch(liveResults, altName);

                if (liveMatch) {
                    return {
                        name: altName,
                        character: {
                            id: liveMatch.characterId,
                            characterId: liveMatch.characterId,
                            name: liveMatch.name,
                            class: liveMatch.job || 'Unknown',
                            cp: liveMatch.noa_score || 0,
                            gearScore: liveMatch.item_level || 0,
                            server: liveMatch.server,
                            level: liveMatch.level,
                            profileImage: liveMatch.imageUrl,
                            isMvp: false,
                            isFromDb: true,
                            race: liveMatch.race,
                            pvpScore: liveMatch.pvp_score
                        }
                    };
                }

                return null;
            } catch {
                return null;
            }
        };

        // 병렬 검색 실행
        const [primaryResult, ...altResults] = await Promise.all([
            searchPrimary(),
            ...altNames.map(altName => searchAlternative(altName))
        ]);

        // 결과 정리
        const foundAlternatives = altResults.filter((r): r is { name: string; character: PartyMember } => r !== null);

        if (primaryResult) {
            addSearchLog(`✅ 원본 "${name}" 발견`);
        }
        if (foundAlternatives.length > 0) {
            addSearchLog(`✅ 대체이름 발견: ${foundAlternatives.map(a => a.name).join(', ')}`);
        }

        return {
            primary: primaryResult,
            alternatives: foundAlternatives
        };
    };

    // OCR 결과로 캐릭터 정보 조회 및 결과 생성
    const buildAnalysisResult = async (
        parsedMembers: ParsedMember[]
    ): Promise<AnalysisResult> => {
        const recognizedCount = parsedMembers.length;

        if (recognizedCount === 0) {
            return {
                totalCp: 0,
                grade: '-',
                members: [],
                recognizedCount: 0,
                foundCount: 0
            };
        }

        const members: PartyMember[] = [];
        const pendingSelections: PendingServerSelection[] = [];

        // 병렬 검색: 모든 멤버를 동시에 검색 (원본 + 대체 이름)
        console.log(`[buildAnalysisResult] 병렬 검색 시작: ${parsedMembers.length}명`);

        const searchPromises = parsedMembers.map(async (m, idx) => {
            // 서버가 하나만 있는 경우 - 원본+대체 이름 동시 검색
            if (m.possibleServers.length === 1) {
                const result = await lookupCharacterWithAlternatives(m.name, m.possibleServers[0]);
                return { idx, m, result, type: 'single' as const };
            } else {
                // 서버가 여러 개인 경우 - 모든 서버에서 병렬 검색
                console.log(`[buildAnalysisResult] Multiple servers for ${m.name}: ${m.possibleServers.join(', ')}`);

                const serverSearchPromises = m.possibleServers.map(async (serverName) => {
                    const serverId = SERVER_NAME_TO_ID[serverName];
                    if (!serverId) return { serverName, serverId: 0, result: { primary: null, alternatives: [] } as LookupResult };
                    const result = await lookupCharacterWithAlternatives(m.name, serverName);
                    return { serverName, serverId, result };
                });

                const serverResults = await Promise.all(serverSearchPromises);
                return { idx, m, serverResults, type: 'multiple' as const };
            }
        });

        const results = await Promise.all(searchPromises);
        console.log(`[buildAnalysisResult] 병렬 검색 완료`);

        // 결과 처리
        for (const res of results) {
            const { idx, m } = res;

            if (res.type === 'single') {
                const { primary, alternatives } = res.result;

                // 원본을 찾은 경우 → 바로 사용 (선택 UI 없음)
                if (primary) {
                    primary.isMainCharacter = m.isMainCharacter;
                    members.push({ ...primary, id: `member-${idx}`, _ocrName: m.name });
                }
                // 원본 못 찾고, 대체 이름 1개만 찾은 경우 → 바로 사용
                else if (alternatives.length === 1) {
                    const alt = alternatives[0];
                    alt.character.isMainCharacter = m.isMainCharacter;
                    members.push({ ...alt.character, id: `member-${idx}`, _ocrName: m.name });
                }
                // 원본 못 찾고, 대체 이름 여러 개 찾은 경우 → 이름 선택 필요
                else if (alternatives.length > 1) {
                    const nameCandidates: ServerCandidate[] = alternatives.map(alt => ({
                        server: m.possibleServers[0],
                        serverId: SERVER_NAME_TO_ID[m.possibleServers[0]],
                        characterData: alt.character,
                        found: true,
                        alternativeName: alt.name
                    }));

                    pendingSelections.push({
                        slotIndex: idx,
                        name: m.name, // OCR로 인식된 이름
                        abbreviation: m.rawServer,
                        candidates: nameCandidates,
                        type: 'name',
                        _ocrName: m.name // 매칭용
                    });

                    members.push({
                        ...alternatives[0].character,
                        id: `member-${idx}`,
                        isMainCharacter: m.isMainCharacter,
                        _ocrName: m.name // 매칭용
                    });
                }
                // 아무것도 못 찾은 경우
                else {
                    members.push({
                        id: `ocr-member-${idx}`,
                        name: m.name,
                        class: '미확인',
                        cp: 0,
                        gearScore: 0,
                        server: m.possibleServers[0],
                        isMvp: false,
                        isMainCharacter: m.isMainCharacter,
                        isFromDb: false,
                        _ocrName: m.name
                    });
                }
            } else {
                // 서버가 여러 개인 경우 결과 처리
                const candidates: ServerCandidate[] = [];
                let foundCount = 0;
                let foundResult: PartyMember | null = null;
                let foundServer = '';

                for (const sr of res.serverResults) {
                    if (!sr.serverId) continue;
                    const { primary, alternatives } = sr.result;

                    // 원본 또는 대체 이름 중 하나라도 찾으면 추가
                    if (primary) {
                        foundCount++;
                        foundResult = primary;
                        foundServer = sr.serverName;
                        candidates.push({
                            server: sr.serverName,
                            serverId: sr.serverId,
                            characterData: primary,
                            found: true
                        });
                    } else if (alternatives.length > 0) {
                        foundCount++;
                        foundResult = alternatives[0].character;
                        foundServer = sr.serverName;
                        candidates.push({
                            server: sr.serverName,
                            serverId: sr.serverId,
                            characterData: alternatives[0].character,
                            found: true,
                            alternativeName: alternatives[0].name
                        });
                    } else {
                        candidates.push({
                            server: sr.serverName,
                            serverId: sr.serverId,
                            found: false
                        });
                    }
                }

                console.log(`[buildAnalysisResult] Found in ${foundCount} server(s)`);

                if (foundCount === 1 && foundResult) {
                    foundResult.isMainCharacter = m.isMainCharacter;
                    foundResult.server = foundServer;
                    members.push({ ...foundResult, id: `member-${idx}` });
                } else if (foundCount > 1) {
                    pendingSelections.push({
                        slotIndex: idx,
                        name: m.name,
                        abbreviation: m.rawServer,
                        candidates: candidates.filter(c => c.found),
                        type: 'server' // 서버 선택 타입
                    });
                    const firstFound = candidates.find(c => c.found && c.characterData);
                    if (firstFound && firstFound.characterData) {
                        members.push({
                            ...firstFound.characterData,
                            id: `member-${idx}`,
                            isMainCharacter: m.isMainCharacter,
                            server: `${firstFound.server} (선택 필요)`
                        });
                    }
                } else {
                    members.push({
                        id: `ocr-member-${idx}`,
                        name: m.name,
                        class: '미확인',
                        cp: 0,
                        gearScore: 0,
                        server: `${m.rawServer} (미확인)`,
                        isMvp: false,
                        isMainCharacter: m.isMainCharacter,
                        isFromDb: false
                    });
                }
            }
        }

        // 대표 캐릭터 첫 번째, 나머지는 레벨순(내림차순) 정렬
        members.sort((a, b) => {
            // 대표 캐릭터는 항상 첫 번째
            if (a.isMainCharacter && !b.isMainCharacter) return -1;
            if (!a.isMainCharacter && b.isMainCharacter) return 1;
            // 나머지는 레벨순 내림차순 (높은 레벨이 앞으로)
            const levelA = a.level || 0;
            const levelB = b.level || 0;
            return levelB - levelA;
        });

        // MVP 결정 (가장 높은 CP)
        if (members.length > 0) {
            const maxCp = Math.max(...members.map(m => m.cp));
            members.forEach(m => {
                m.isMvp = m.cp === maxCp && m.cp > 0;
            });
        }

        const totalCp = members.reduce((acc, cur) => acc + cur.cp, 0);
        const avgCp = members.length > 0 ? totalCp / members.length : 0;

        // 등급 계산 (평균 CP 기준)
        let grade = '-';
        if (members.length > 0) {
            if (avgCp >= 4500) grade = 'S';
            else if (avgCp >= 3500) grade = 'A';
            else if (avgCp >= 2500) grade = 'B';
            else grade = 'C';
        }

        return {
            totalCp,
            grade,
            members,
            recognizedCount,
            foundCount: members.filter(m => m.isFromDb).length,
            pendingSelections: pendingSelections.length > 0 ? pendingSelections : undefined
        };
    };

    const scanImage = useCallback(async (file: File): Promise<AnalysisResult> => {
        setIsScanning(true);
        const totalStartTime = Date.now();
        setLogs([`⏱ 스캔 시작: ${new Date().toLocaleTimeString()}`]);
        console.log('[usePartyScanner] Starting scan...');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = (err) => {
                console.error('[usePartyScanner] FileReader error:', err);
                setIsScanning(false);
                reject(new Error('Failed to read image file'));
            };

            reader.onload = async (e) => {
                try {
                    console.log('[usePartyScanner] File loaded, starting OCR...');
                    const originalImage = e.target?.result as string;
                    let imageToScan = originalImage;

                    // 이미지 크롭
                    const cropStartTime = Date.now();
                    if (scanBottomOnly) {
                        setLogs(prev => [...prev, '이미지 크롭 중...']);
                        if (useSingleRegion) {
                            imageToScan = await cropBottomPart(originalImage);
                        } else {
                            imageToScan = await cropMultipleRegions(originalImage);
                        }
                        setCroppedPreview(imageToScan);
                        console.log('[usePartyScanner] Image cropped');
                    } else {
                        setCroppedPreview(originalImage);
                    }
                    const cropTime = Date.now() - cropStartTime;
                    setLogs(prev => [...prev, `⏱ 이미지 전처리: ${cropTime}ms`]);

                    // OCR 실행 (모드에 따라 분기)
                    const ocrStartTime = Date.now();
                    let text = '';

                    console.log('[usePartyScanner] OCR Mode:', ocrMode, 'Browser Ready:', browserOcrReady);
                    setLogs(prev => [...prev, `🔍 OCR 모드: ${ocrMode}, 브라우저 준비: ${browserOcrReady}`]);

                    if (ocrMode === 'browser' && browserOcrReady) {
                        // 브라우저 OCR (PP-OCRv5)
                        console.log('[usePartyScanner] Using Browser OCR...');
                        setLogs(prev => [...prev, '브라우저 OCR 실행 중... (PP-OCRv5)']);
                        text = await runBrowserOcr(imageToScan);
                    } else {
                        // Gemini Vision API (기본)
                        console.log('[usePartyScanner] Using Gemini OCR...');
                        setLogs(prev => [...prev, 'Gemini OCR 호출 중...']);

                        const ocrResponse = await fetch('/api/ocr', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: imageToScan })
                        });

                        if (!ocrResponse.ok) {
                            const errorData = await ocrResponse.json();
                            throw new Error(errorData.error || 'OCR failed');
                        }

                        const ocrResult = await ocrResponse.json();
                        text = ocrResult.text || '';
                    }

                    const ocrTime = Date.now() - ocrStartTime;
                    console.log('[usePartyScanner] OCR result:', text);
                    setLogs(prev => [...prev, `⏱ OCR 응답 (${ocrMode}): ${ocrTime}ms`]);

                    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);
                    const parsedMembers = smartParse(text, addLog);
                    console.log('[usePartyScanner] Parsed members:', parsedMembers);
                    addLog(`파싱 완료: ${parsedMembers.length}명 인식됨`);

                    if (parsedMembers.length === 0) {
                        console.log('[usePartyScanner] No members found from OCR');
                        setLogs(prev => [...prev, '❌ 인식된 파티원 없음 (OCR: ' + text.substring(0, 100) + '...)']);
                        setIsScanning(false);
                        resolve({
                            totalCp: 0,
                            grade: '-',
                            members: [],
                            recognizedCount: 0,
                            foundCount: 0
                        });
                        return;
                    }

                    // DB/API에서 캐릭터 정보 조회
                    const searchStartTime = Date.now();
                    console.log('[usePartyScanner] Looking up characters in DB...');
                    setLogs(prev => [...prev, '캐릭터 검색 시작 (병렬)...']);
                    const result = await buildAnalysisResult(parsedMembers);
                    const searchTime = Date.now() - searchStartTime;
                    setLogs(prev => [...prev, `⏱ 캐릭터 검색: ${searchTime}ms`]);

                    console.log('[usePartyScanner] Analysis complete:', result);
                    setLogs(prev => [...prev, `조회 완료: ${result.foundCount}/${result.recognizedCount}명 찾음`]);

                    // 서버 선택이 필요한 경우 상태 저장
                    if (result.pendingSelections && result.pendingSelections.length > 0) {
                        setPendingSelections(result.pendingSelections);
                        setLogs(prev => [...prev, `⚠️ ${result.pendingSelections!.length}명의 캐릭터가 서버 선택이 필요합니다`]);
                    } else {
                        setPendingSelections([]);
                    }

                    // 총 소요 시간
                    const totalTime = Date.now() - totalStartTime;
                    setLogs(prev => [...prev, `⏱ 총 소요 시간: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}초)`]);

                    setAnalysisResult(result);
                    setIsScanning(false);
                    resolve(result);

                } catch (err) {
                    console.error('[usePartyScanner] Error during scan:', err);
                    setLogs(prev => [...prev, `오류 발생: ${err}`]);
                    setIsScanning(false);
                    reject(err);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [scanBottomOnly, ocrMode, browserOcrReady, runBrowserOcr]);

    // 서버 선택 처리 함수
    const selectServer = useCallback((slotIndex: number, selectedServer: string, characterData: PartyMember) => {
        if (!analysisResult) return;

        // 멤버 목록에서 해당 슬롯 업데이트
        const updatedMembers = analysisResult.members.map((member, idx) => {
            if (idx === slotIndex) {
                return {
                    ...characterData,
                    id: member.id,
                    server: selectedServer,
                    isMainCharacter: member.isMainCharacter
                };
            }
            return member;
        });

        // 해당 선택 제거
        const updatedPending = pendingSelections.filter(p => p.slotIndex !== slotIndex);

        // CP 재계산
        const totalCp = updatedMembers.reduce((acc, cur) => acc + cur.cp, 0);
        const avgCp = updatedMembers.length > 0 ? totalCp / updatedMembers.length : 0;

        // MVP 재결정
        const maxCp = Math.max(...updatedMembers.map(m => m.cp));
        updatedMembers.forEach(m => {
            m.isMvp = m.cp === maxCp && m.cp > 0;
        });

        // 등급 재계산
        let grade = '-';
        if (updatedMembers.length > 0) {
            if (avgCp >= 4500) grade = 'S';
            else if (avgCp >= 3500) grade = 'A';
            else if (avgCp >= 2500) grade = 'B';
            else grade = 'C';
        }

        const newResult: AnalysisResult = {
            ...analysisResult,
            totalCp,
            grade,
            members: updatedMembers,
            foundCount: updatedMembers.filter(m => m.isFromDb).length,
            pendingSelections: updatedPending.length > 0 ? updatedPending : undefined
        };

        setAnalysisResult(newResult);
        setPendingSelections(updatedPending);
        setLogs(prev => [...prev, `✅ ${characterData.name} → ${selectedServer} 선택됨`]);
    }, [analysisResult, pendingSelections]);

    // 상세 스펙 상태
    const [detailedSpecs, setDetailedSpecs] = useState<CharacterSpec[]>([]);
    const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);

    // 캐릭터 상세 스펙 조회 함수
    const fetchDetailedSpecs = useCallback(async (members: PartyMember[]) => {
        if (!members || members.length === 0) return;

        setIsLoadingSpecs(true);
        setLogs(prev => [...prev, '상세 스펙 조회 중...']);

        const specs: CharacterSpec[] = [];

        for (const member of members) {
            try {
                // characterId와 서버 정보가 있어야 조회 가능
                if (!member.characterId || !member.server) {
                    // 기본 스펙으로 채움
                    specs.push({
                        name: member.name,
                        server: member.server || '알 수 없음',
                        className: member.class,
                        level: member.level || 0,
                        profileImage: member.profileImage,
                        hitonCP: member.cp,
                        itemLevel: member.gearScore || 0,
                        totalBreakthrough: 0,
                        stats: {
                            attackPower: '-',
                            attackSpeed: 0,
                            weaponDamageAmp: 0,
                            damageAmp: 0,
                            criticalRate: 0,
                            multiHitRate: 0,
                        }
                    });
                    continue;
                }

                // 서버 ID 가져오기
                const serverId = SERVER_NAME_TO_ID[member.server];
                if (!serverId) {
                    specs.push({
                        name: member.name,
                        server: member.server,
                        className: member.class,
                        level: member.level || 0,
                        profileImage: member.profileImage,
                        hitonCP: member.cp,
                        itemLevel: member.gearScore || 0,
                        totalBreakthrough: 0,
                        stats: {
                            attackPower: '-',
                            attackSpeed: 0,
                            weaponDamageAmp: 0,
                            damageAmp: 0,
                            criticalRate: 0,
                            multiHitRate: 0,
                        }
                    });
                    continue;
                }

                console.log(`[fetchDetailedSpecs] Fetching specs for ${member.name} (${member.characterId})`);

                // 캐릭터 상세 API 호출 (API는 id와 server 파라미터를 기대)
                const res = await fetch(`/api/character?id=${encodeURIComponent(member.characterId)}&server=${serverId}`);
                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const data = await res.json();
                console.log(`[fetchDetailedSpecs] Got data for ${member.name}:`, data);

                // statList에서 스탯 추출
                const statList = data.stats?.statList || [];

                // 통합 능력치 계산 (캐릭터 상세 페이지와 동일한 방식)
                const equipment = data.equipment?.equipmentList || data.equipment || [];
                const titles = data.titles || { titleList: [] };
                const daevanion = data.daevanion || { boardList: [] };
                const equippedTitleId = data.profile?.titleId;

                // aggregateStats로 통합 능력치 계산
                const aggregatedStats = aggregateStats(equipment, titles, daevanion, data.stats, equippedTitleId);

                console.log(`[fetchDetailedSpecs] Aggregated stats for ${member.name}:`, aggregatedStats.map(s => `${s.name}: ${s.totalValue} / ${s.totalPercentage}%`));

                // 디버그 데이터에 저장
                setDebugData(prev => [...prev, {
                    name: member.name,
                    rawStats: statList.map((s: any) => ({ name: s.name, value: s.value })),
                    aggregatedStats: aggregatedStats.map(s => ({
                        name: s.name,
                        totalValue: s.totalValue,
                        totalPercentage: s.totalPercentage
                    })),
                    equipment: equipment,
                    profile: data.profile
                }]);

                // 통합 스탯에서 값 찾기
                const getAggregatedStat = (name: string): { value: number, percentage: number } => {
                    const stat = aggregatedStats.find(s => s.name === name);
                    return stat ? { value: stat.totalValue, percentage: stat.totalPercentage } : { value: 0, percentage: 0 };
                };

                // 돌파 총합 계산 (장비의 exceedLevel 합계)
                const actualEquipList = Array.isArray(equipment) ? equipment : [];
                const totalBreakthrough = actualEquipList.reduce((sum: number, item: any) => {
                    return sum + (item.exceedLevel || item.breakthrough || 0);
                }, 0);

                // 아이템 레벨 (기본 statList에서 가져오기)
                const itemLevelStat = statList.find((s: any) =>
                    s.name === '아이템레벨' || s.name?.includes('아이템')
                );
                const itemLevel = itemLevelStat?.value || member.gearScore || 0;

                // HITON 전투력 - 새로운 전투력 계산 시스템 사용
                const combatPowerResult = calculateCombatPowerFromStats(aggregatedStats, data.stats);
                const hitonCP = combatPowerResult.totalScore || data.profile?.noa_score || member.cp;

                // 통합 스탯 추출
                const attackPower = getAggregatedStat('공격력');
                const attackSpeed = getAggregatedStat('전투 속도');
                const weaponDmgAmp = getAggregatedStat('무기 피해 증폭');
                const dmgAmp = getAggregatedStat('피해 증폭');
                const crit = getAggregatedStat('치명타');
                const multiHit = getAggregatedStat('다단 히트 적중');

                // 스탯 값 로깅
                console.log(`[fetchDetailedSpecs] Final stats for ${member.name}:`, {
                    hitonCP,
                    itemLevel,
                    totalBreakthrough,
                    attackPower,
                    attackSpeed,
                    weaponDmgAmp,
                    dmgAmp,
                    crit,
                    multiHit
                });

                specs.push({
                    name: member.name,
                    server: member.server,
                    className: data.profile?.className || member.class,
                    level: data.profile?.characterLevel || member.level || 0,
                    profileImage: data.profile?.profileImage || member.profileImage,
                    hitonCP,
                    itemLevel,
                    totalBreakthrough,
                    stats: {
                        // 공격력: 고정값 표시
                        attackPower: attackPower.value > 0 ? attackPower.value.toLocaleString() : '-',
                        // 퍼센트 스탯들
                        attackSpeed: attackSpeed.value + attackSpeed.percentage,
                        weaponDamageAmp: weaponDmgAmp.value + weaponDmgAmp.percentage,
                        damageAmp: dmgAmp.value + dmgAmp.percentage,
                        criticalRate: crit.value + crit.percentage,
                        multiHitRate: multiHit.value + multiHit.percentage,
                    }
                });

                setLogs(prev => [...prev, `✅ ${member.name} 스펙 조회 완료 (돌파: ${totalBreakthrough})`]);

            } catch (err) {
                console.error(`[fetchDetailedSpecs] Failed to fetch specs for ${member.name}:`, err);
                // 실패 시 기본 데이터 사용
                specs.push({
                    name: member.name,
                    server: member.server || '알 수 없음',
                    className: member.class,
                    level: member.level || 0,
                    profileImage: member.profileImage,
                    hitonCP: member.cp,
                    itemLevel: member.gearScore || 0,
                    totalBreakthrough: 0,
                    stats: {
                        attackPower: '-',
                        attackSpeed: 0,
                        weaponDamageAmp: 0,
                        damageAmp: 0,
                        criticalRate: 0,
                        multiHitRate: 0,
                    }
                });
            }
        }

        setDetailedSpecs(specs);
        setIsLoadingSpecs(false);
        setLogs(prev => [...prev, `📊 상세 스펙 조회 완료: ${specs.length}명`]);
    }, []);

    // 새 스캔 시작시 디버그 데이터 초기화
    const clearDebugData = useCallback(() => {
        setDebugData([]);
    }, []);

    return {
        isScanning,
        logs,
        scanImage,
        scanBottomOnly,
        setScanBottomOnly,
        croppedPreview, // OCR 대상 이미지 미리보기
        pendingSelections, // 서버 선택 대기 목록
        analysisResult, // 현재 분석 결과
        selectServer, // 서버 선택 함수
        // 상세 스펙 관련
        detailedSpecs,
        isLoadingSpecs,
        fetchDetailedSpecs,
        // 디버그
        debugData,
        // OCR 크롭 설정 - 단일 영역 (기존 호환성)
        cropSettings: singleCropSettings,
        setCropSettings: setSingleCropSettings,
        // OCR 크롭 설정 - 다중 영역
        cropRegions,
        setCropRegions,
        useSingleRegion,
        setUseSingleRegion,
        // 미리보기 생성 함수
        generatePreviewWithRegions,
        // OCR 모드 설정
        ocrMode,
        setOcrMode,
        browserOcrReady,
        initBrowserOcr,
    };
};
