'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PartyAnalysisResult from '@/app/components/analysis/PartyAnalysisResult';
import { usePartyScanner } from '@/hooks/usePartyScanner';

export default function AnalysisPage() {
    const { isScanning, scanImage } = usePartyScanner();
    const [analysisData, setAnalysisData] = useState<any>(null);

    const handleScan = useCallback(async (file: File) => {
        try {
            const result = await scanImage(file);
            setAnalysisData(result);
        } catch (e) {
            console.error("Scan failed", e);
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

            <PartyAnalysisResult
                data={analysisData}
                isScanning={isScanning}
                onReset={() => setAnalysisData(null)}
                onManualUpload={handleScan}
            />
        </div>
    );
}
