import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

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
}

export interface AnalysisResult {
    totalCp: number;
    grade: string;
    members: PartyMember[];
}

export const usePartyScanner = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [scanBottomOnly, setScanBottomOnly] = useState(true);

    // 이미지 전처리: 그레이스케일 + 대비 강화
    const preprocessImage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // 그레이스케일 변환 + 대비 강화
        const contrastFactor = 1.5; // 대비 강화 계수
        for (let i = 0; i < data.length; i += 4) {
            // 그레이스케일 (가중 평균)
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

            // 대비 강화
            let enhanced = ((gray - 128) * contrastFactor) + 128;
            enhanced = Math.max(0, Math.min(255, enhanced));

            // 이진화에 가깝게 (임계값 기반)
            const threshold = 128;
            const final = enhanced > threshold ? 255 : enhanced < 50 ? 0 : enhanced;

            data[i] = final;     // R
            data[i + 1] = final; // G
            data[i + 2] = final; // B
            // Alpha는 유지
        }

        ctx.putImageData(imageData, 0, 0);
    };

    const cropBottomPart = (base64Image: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64Image); return; }

                // 고정 픽셀 기반 크롭 (해상도별 파티바 높이 계산)
                // 1080p: ~65px, 1440p: ~80px, 4K: ~100px
                const heightRatio = img.height / 1080;
                const baseHeight = 65; // 1080p 기준 파티바 높이
                const cropHeight = Math.max(60, Math.min(120, Math.round(baseHeight * heightRatio)));

                const startY = img.height - cropHeight;

                canvas.width = img.width;
                canvas.height = cropHeight;

                // 크롭된 영역 그리기
                ctx.drawImage(img, 0, startY, img.width, cropHeight, 0, 0, canvas.width, canvas.height);

                // 이미지 전처리 적용 (대비 강화 + 그레이스케일)
                preprocessImage(ctx, canvas.width, canvas.height);

                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(base64Image);
            img.src = base64Image;
        });
    };

    const smartParse = (rawText: string): { name: string, server: string }[] => {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const matches: { name: string, server: string }[] = [];
        const seenNames = new Set<string>();

        const addMember = (name: string, server: string) => {
            const cleanName = name.replace(/[^a-zA-Z0-9가-힣]/g, '');
            if (cleanName.length < 2 || seenNames.has(cleanName)) return;
            matches.push({ name: cleanName, server });
            seenNames.add(cleanName);
        };

        const serverRegex = /([가-힣a-zA-Z0-9]+)\s*\[([가-힣a-zA-Z0-9]+)\]/;
        const statusKeywords = /^(준비 완료|준비 중|LV \d+|Lv \d+)/i;

        lines.forEach((line, idx) => {
            const match = line.match(serverRegex);
            if (match) {
                addMember(match[1], match[2]);
                return;
            }

            // 서버명 [서버]가 없는 경우는 무시 - 정확한 매칭만 허용
        });

        return matches.slice(0, 4); // 파티 총원 4명 제한
    };

    const generateMockData = (membersInput: any[]): AnalysisResult => {
        const roles = ['Gladiator', 'Templar', 'Assassin', 'Ranger', 'Sorcerer', 'Cleric', 'Chanter', 'Spiritmaster'];

        // If input is empty, don't generate mock data, return empty result
        if (membersInput.length === 0) {
            // Optional: Return empty or mock? 
            // Let's mock at least one if really empty to show something, logic says fallback
        }

        const finalMembers = [...membersInput];

        // 서버명이 있는 실제 인식된 파티원만 사용 - Unknown 채우기 제거

        const members = finalMembers.slice(0, 4).map((m, i) => { // 파티 총원 4명 제한
            const name = typeof m === 'string' ? m : m.name;
            const server = typeof m === 'object' && m.server ? m.server : 'Israphel';
            const role = roles[i % roles.length];
            const cp = Math.floor(Math.random() * (3500 - 2000) + 2000);
            return {
                id: `member-${i}`,
                name: name.replace(/[^a-zA-Z0-9가-힣]/g, ''),
                class: role,
                cp: cp,
                gearScore: Math.floor(cp / 10),
                server: server,
                isMvp: false
            };
        });

        const maxCp = Math.max(...members.map(m => m.cp));
        members.forEach(m => {
            if (m.cp === maxCp) m.isMvp = true;
        });

        const totalCp = members.reduce((acc, cur) => acc + cur.cp, 0);

        return {
            totalCp,
            grade: totalCp > 18000 ? 'S' : totalCp > 15000 ? 'A' : 'B',
            members
        };
    };

    const scanImage = useCallback(async (file: File): Promise<AnalysisResult> => {
        setIsScanning(true);
        setLogs(['Image received. Initializing OCR...']);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const originalImage = e.target?.result as string;
                    let imageToScan = originalImage;

                    if (scanBottomOnly) {
                        setLogs(prev => [...prev, 'Cropping party bar + applying preprocessing...']);
                        imageToScan = await cropBottomPart(originalImage);
                    }

                    const worker = await createWorker('kor+eng');
                    setLogs(prev => [...prev, 'Language loaded. Scanning...']);

                    const ret = await worker.recognize(imageToScan);
                    const text = ret.data.text;
                    setLogs(prev => [...prev, 'Analyzing text patterns...']);

                    await worker.terminate();

                    const parsedMembers = smartParse(text);

                    // 서버명이 있는 파싱된 멤버만 사용 (Unknown fallback 제거)
                    const finalMembers = parsedMembers;

                    setLogs(prev => [...prev, 'Generating analysis...']);

                    // Artificial delay for UX
                    setTimeout(() => {
                        const result = generateMockData(finalMembers);
                        setIsScanning(false);
                        resolve(result);
                    }, 800);

                } catch (err) {
                    console.error(err);
                    setIsScanning(false);
                    reject(err);
                }
            };
            reader.readAsDataURL(file);
        });
    }, [scanBottomOnly]);

    return {
        isScanning,
        logs,
        scanImage,
        scanBottomOnly,
        setScanBottomOnly
    };
};
