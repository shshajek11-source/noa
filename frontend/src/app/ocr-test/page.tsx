'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
    ChevronDown, ChevronUp, RefreshCw, ZoomIn, Sun, Type, Sliders, ChevronRight,
    Upload, FileText, Image as ImageIcon, Database, Play, Eraser, Check, Loader2, Copy,
    Crop as CropIcon, RotateCcw
} from 'lucide-react'
import styles from './ocr-test.module.css'

// --- Types & Constants ---

type TabType = 'tune' | 'ocr' | 'data' | 'logs'

interface OcrOptions {
    grayscale: boolean
    threshold: number
    invert: boolean
    contrast: number
    denoise: boolean
    brightness: number
    scale: number
    sharpness: boolean
    psm: string
    lang: string
    // Advanced
    adaptiveThreshold: boolean
    adaptiveWindow: number
    adaptiveC: number
    morphology: 'none' | 'erode' | 'dilate' | 'open' | 'close'
    morphologyKernel: number
}

const DEFAULT_OPTIONS: OcrOptions = {
    grayscale: true,
    threshold: 160,
    invert: true,
    contrast: 1.5,
    denoise: false,
    brightness: 0,
    scale: 1.5,
    sharpness: false,
    psm: '6',
    lang: 'kor+eng',
    // Advanced Default
    adaptiveThreshold: false,
    adaptiveWindow: 10,
    adaptiveC: 5,
    morphology: 'none',
    morphologyKernel: 1
}

const PSM_MODES = [
    { value: '3', label: '3 - Fully Automatic (Default)' },
    { value: '4', label: '4 - Single Column' },
    { value: '6', label: '6 - Assume Single Block' },
    { value: '7', label: '7 - Treat as Single Line' },
    { value: '11', label: '11 - Sparse Text (Find text)' },
    { value: '12', label: '12 - Sparse Text with OSD' },
]

// --- Image Processing Helpers ---

function applyAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number, windowSize: number, constantC: number) {
    const integral = new Int32Array(width * height)

    // 1. Calculate Integral Image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4
            const val = data[i] // Assuming grayscale

            let sum = val
            if (x > 0) sum += integral[y * width + (x - 1)]
            if (y > 0) sum += integral[(y - 1) * width + x]
            if (x > 0 && y > 0) sum -= integral[(y - 1) * width + (x - 1)]

            integral[y * width + x] = sum
        }
    }

    // 2. Apply Threshold
    const s2 = Math.floor(windowSize / 2)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const x1 = Math.max(0, x - s2)
            const y1 = Math.max(0, y - s2)
            const x2 = Math.min(width - 1, x + s2)
            const y2 = Math.min(height - 1, y + s2)

            const count = (x2 - x1 + 1) * (y2 - y1 + 1)

            let sum = integral[y2 * width + x2]
            if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)]
            if (y1 > 0) sum -= integral[(y1 - 1) * width + x2]
            if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)]

            const mean = sum / count
            const i = (y * width + x) * 4
            const val = data[i]

            // If pixel is significantly darker than background (mean), it's text (0)
            // Otherwise background (255)
            // Note: Since we might invert LATER, or we want standard logic:
            // Standard: Text is Dark (0), BG is Light (255). 
            // Threshold: val < mean - C ? 0 : 255

            const bin = val < (mean - constantC) ? 0 : 255

            data[i] = data[i + 1] = data[i + 2] = bin
        }
    }
}

function applyMorphology(data: Uint8ClampedArray, width: number, height: number, type: 'erode' | 'dilate', radius: number) {
    // Erode: Minimum in kernel (Thins white regions, expands black)
    // Dilate: Maximum in kernel (Expands white regions, shrinks black)
    // Note: If text is BLACK (0), Erode will EXPAND text (because MIN(255, 0) = 0). 
    // Wait, Erode usually means "Erode Foreground". If Foreground is White (255), Erode shrinks it.
    // If we assume Text is Black (0) and BG is White (255):
    // Erode (Min) will find 0s and spread them -> Makes text BOLDER.
    // Dilate (Max) will find 255s and spread them -> Makes text THINNER.

    const output = new Uint8ClampedArray(data)
    // We only process one channel since it's grayscale

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let min = 255
            let max = 0

            const yStart = Math.max(0, y - radius)
            const yEnd = Math.min(height - 1, y + radius)
            const xStart = Math.max(0, x - radius)
            const xEnd = Math.min(width - 1, x + radius)

            // Kernel Loop
            for (let ky = yStart; ky <= yEnd; ky++) {
                for (let kx = xStart; kx <= xEnd; kx++) {
                    const val = data[(ky * width + kx) * 4]
                    if (val < min) min = val
                    if (val > max) max = val
                }
            }

            const i = (y * width + x) * 4
            const newVal = type === 'erode' ? min : max

            output[i] = output[i + 1] = output[i + 2] = newVal
        }
    }

    // Copy back
    data.set(output)
}

export default function OcrTestPage() {
    // --- State ---
    const [activeTab, setActiveTab] = useState<TabType>('tune')

    // Data
    const [rawResults, setRawResults] = useState<any[]>([])
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [processedImageSrc, setProcessedImageSrc] = useState<string | null>(null)
    const [result, setResult] = useState<string>('')
    const [logs, setLogs] = useState<string[]>([])

    // System
    const [isReady, setIsReady] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [previewMode, setPreviewMode] = useState<'original' | 'processed'>('processed')

    // Options
    const [options, setOptions] = useState<OcrOptions>(DEFAULT_OPTIONS)

    // ROI / Crop
    const [isCropMode, setIsCropMode] = useState(false)
    const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null)
    const [cropRect, setCropRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
    const previewContainerRef = useRef<HTMLDivElement>(null)

    const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])

    // --- Effects ---

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) return
            const { type, data } = event.data

            switch (type) {
                case 'ready':
                    setIsReady(true)
                    addLog('Tesseract Worker Ready')
                    break
                case 'status':
                    // We can show progress here if needed
                    break
                case 'result':
                    setIsProcessing(false)
                    addLog(`Result received (${Math.round(data.processingTime)}ms)`)

                    const texts = Array.isArray(data.texts) ? data.texts : []
                    // Filter confident results if needed, but for sandbox we show all
                    const rawText = texts.map((t: any) => t.text).join('\n')
                    const finalText = rawText.trim().length > 0 ? rawText : '--- No text detected ---'

                    setResult(finalText)
                    setRawResults(texts)
                    setActiveTab('data') // Auto switch to results
                    break
                case 'error':
                    setIsProcessing(false)
                    addLog(`Error: ${data.message}`)
                    break
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    useEffect(() => {
        if (imageSrc) {
            processImage()
        }
    }, [imageSrc, options, cropRect]) // Re-process when options OR crop changes

    // --- Handlers ---

    const processImage = async () => {
        if (!imageSrc) return

        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.src = imageSrc

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) return

                // Scaling logic
                const scaledWidth = img.width * options.scale
                const scaledHeight = img.height * options.scale

                canvas.width = scaledWidth
                canvas.height = scaledHeight
                ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

                // Get Image Data
                let imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight)
                let data = imageData.data

                // 2. Adjust Brightness & Contrast & Grayscale & Invert
                // Note: We process basic filters first
                const contrastFactor = (259 * (options.contrast * 255 + 255)) / (255 * (259 - options.contrast * 255))

                for (let i = 0; i < data.length; i += 4) {
                    // Brightness
                    let r = data[i] + options.brightness
                    let g = data[i + 1] + options.brightness
                    let b = data[i + 2] + options.brightness

                    // Contrast
                    r = contrastFactor * (r - 128) + 128
                    g = contrastFactor * (g - 128) + 128
                    b = contrastFactor * (b - 128) + 128

                    // Clamp
                    r = Math.max(0, Math.min(255, r))
                    g = Math.max(0, Math.min(255, g))
                    b = Math.max(0, Math.min(255, b))

                    // Grayscale (Required for Adaptive or just option)
                    // If Adaptive is ON, we force effective grayscale storage
                    if (options.grayscale || options.adaptiveThreshold) {
                        const avg = (r + g + b) / 3
                        r = g = b = avg
                    }

                    // Invert (Before Thresholding)
                    if (options.invert) {
                        r = 255 - r
                        g = 255 - g
                        b = 255 - b
                    }

                    data[i] = r
                    data[i + 1] = g
                    data[i + 2] = b
                }

                // 3. Thresholding
                if (options.adaptiveThreshold) {
                    applyAdaptiveThreshold(data, scaledWidth, scaledHeight, options.adaptiveWindow, options.adaptiveC)
                } else if (options.grayscale) {
                    // Standard Global Threshold
                    for (let i = 0; i < data.length; i += 4) {
                        const v = data[i]
                        const bin = v > options.threshold ? 255 : 0
                        data[i] = data[i + 1] = data[i + 2] = bin
                    }
                }

                // 4. Morphology
                if (options.morphology !== 'none') {
                    if (options.morphology === 'erode') applyMorphology(data, scaledWidth, scaledHeight, 'erode', options.morphologyKernel)
                    if (options.morphology === 'dilate') applyMorphology(data, scaledWidth, scaledHeight, 'dilate', options.morphologyKernel)
                    if (options.morphology === 'open') {
                        applyMorphology(data, scaledWidth, scaledHeight, 'erode', options.morphologyKernel)
                        applyMorphology(data, scaledWidth, scaledHeight, 'dilate', options.morphologyKernel)
                    }
                    if (options.morphology === 'close') {
                        applyMorphology(data, scaledWidth, scaledHeight, 'dilate', options.morphologyKernel)
                        applyMorphology(data, scaledWidth, scaledHeight, 'erode', options.morphologyKernel)
                    }
                }

                ctx.putImageData(imageData, 0, 0)
                setProcessedImageSrc(canvas.toDataURL('image/png'))

            } catch (e) {
                console.error(e)
                addLog('Image processing failed')
            }
        }
    }

    const runOcr = () => {
        if (!processedImageSrc || !isReady || !iframeRef.current) return

        setIsProcessing(true)
        addLog(`Starting OCR... (PSM: ${options.psm}, Lang: ${options.lang})`)

        iframeRef.current.contentWindow?.postMessage({
            type: 'process',
            data: {
                // Return cropped image if available? For now full processed image.
                image: processedImageSrc,
                psm: options.psm,
                lang: options.lang
            }
        }, '*')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (e) => {
            setImageSrc(e.target?.result as string)
            setCropRect(null) // Reset crop
        }
        reader.readAsDataURL(file)
    }

    const handlePaste = async () => {
        try {
            const items = await navigator.clipboard.read()
            for (const item of items) {
                if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                    const blob = await item.getType(item.types[0])
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        setImageSrc(e.target?.result as string)
                        setCropRect(null) // Reset crop
                    }
                    reader.readAsDataURL(blob)
                    addLog('Image pasted from clipboard')
                    return
                }
            }
            addLog('No image found in clipboard')
        } catch (err) {
            console.error(err)
            addLog('Paste failed (See console)')
        }
    }

    const handleResetOption = (key: keyof OcrOptions) => {
        setOptions(prev => ({ ...prev, [key]: DEFAULT_OPTIONS[key] }))
    }

    // --- Crop Mouse Handlers (Placeholder for UI interaction) ---
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isCropMode || !previewContainerRef.current) return
        const rect = previewContainerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setCropStart({ x, y })
        setCropRect({ x, y, w: 0, h: 0 })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isCropMode || !cropStart || !previewContainerRef.current) return
        const rect = previewContainerRef.current.getBoundingClientRect()
        const currentX = e.clientX - rect.left
        const currentY = e.clientY - rect.top

        const w = Math.abs(currentX - cropStart.x)
        const h = Math.abs(currentY - cropStart.y)
        const x = Math.min(currentX, cropStart.x)
        const y = Math.min(currentY, cropStart.y)

        setCropRect({ x, y, w, h })
    }

    const handleMouseUp = () => {
        setCropStart(null)
    }


    // --- Render ---

    return (
        <div className={styles.container}>

            {/* LEFT: Preview Area */}
            <div className={styles.leftPanel}>

                {/* Top Toolbar */}
                <div className={styles.toolbar}>
                    <div className={styles.title}>
                        <span className={styles.brandRed}>AION 2</span> <span className={styles.subtitle}>OCR LAB</span>
                    </div>

                    <div className={styles.toolbarActions}>
                        <button
                            onClick={() => setIsCropMode(!isCropMode)}
                            className={`${styles.pasteBtn} ${isCropMode ? '!border-[var(--brand-orange)] !text-[var(--brand-orange)]' : ''}`}
                        >
                            <CropIcon className="w-4 h-4" /> {isCropMode ? 'CROP ACTIVE' : 'CROP'}
                        </button>

                        <button onClick={handlePaste} className={styles.pasteBtn}>
                            <span className="opacity-70">Ctrl+V</span> PASTE
                        </button>
                        <label className={styles.uploadLabel}>
                            <Upload className="w-4 h-4" /> UPLOAD
                            <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*" />
                        </label>
                    </div>
                </div>

                {/* Canvas Area */}
                <div
                    className={styles.canvasArea}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {imageSrc ? (
                        <div ref={previewContainerRef} className={styles.previewImageContainer}>
                            <img
                                src={previewMode === 'original' ? imageSrc : (processedImageSrc || imageSrc)}
                                alt="Preview"
                                className={styles.previewImage}
                                draggable={false}
                            />

                            {/* Overlay Info */}
                            <div className={styles.overlayInfo}>
                                <span>Scale: <b>{Math.round(options.scale * 100)}%</b></span>
                                <span>Thresh: <b>{options.threshold}</b></span>
                                {cropRect && (
                                    <span>Crop: <b>{Math.round(cropRect.w)}x{Math.round(cropRect.h)}</b></span>
                                )}
                            </div>

                            {/* Crop Rect UI */}
                            {cropRect && isCropMode && (
                                <div
                                    className={styles.cropOverlay}
                                    style={{
                                        left: cropRect.x,
                                        top: cropRect.y,
                                        width: cropRect.w,
                                        height: cropRect.h
                                    }}
                                >
                                    <div className={`${styles.cropHandle} top-0 left-0`} />
                                    <div className={`${styles.cropHandle} top-0 right-0`} />
                                    <div className={`${styles.cropHandle} bottom-0 left-0`} />
                                    <div className={`${styles.cropHandle} bottom-0 right-0`} />
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <ImageIcon className={styles.emptyStateIcon} />
                            <p>Upload or Paste an image to begin</p>
                        </div>
                    )}

                    {/* View Toggle */}
                    {imageSrc && (
                        <div className={styles.viewToggle}>
                            <button
                                onClick={() => setPreviewMode('original')}
                                className={`${styles.toggleBtn} ${previewMode === 'original' ? styles.activeOriginal : ''}`}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setPreviewMode('processed')}
                                className={`${styles.toggleBtn} ${previewMode === 'processed' ? styles.active : ''}`}
                            >
                                Processed
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Dashboard Sidebar */}
            <div className={styles.rightPanel}>

                {/* Tabs Header */}
                <div className={styles.tabsHeader}>
                    <button onClick={() => setActiveTab('tune')} className={`${styles.tabBtn} ${activeTab === 'tune' ? styles.active : ''}`}>Tune</button>
                    <button onClick={() => setActiveTab('ocr')} className={`${styles.tabBtn} ${activeTab === 'ocr' ? styles.active : ''}`}>OCR</button>
                    <button onClick={() => setActiveTab('data')} className={`${styles.tabBtn} ${activeTab === 'data' ? styles.active : ''}`}>Data</button>
                    <button onClick={() => setActiveTab('logs')} className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.active : ''}`}>Logs</button>
                </div>

                {/* Scrollable Content */}
                <div className={styles.tabContent}>

                    {/* --- TAB: TUNE --- */}
                    {activeTab === 'tune' && (
                        <div className="space-y-6 animate-fadeIn pb-10">
                            {/* Basic Controls Group */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Basic Adjustments</h3>

                                {/* Scale */}
                                <div className={styles.controlGroup}>
                                    <div className={styles.controlHeader}>
                                        <div className={styles.controlLabel}><ZoomIn className="w-3 h-3 text-[var(--brand-orange)]" /> PRE-SCALE</div>
                                        <div className={styles.controlActions}>
                                            <span className={styles.controlValue}>{options.scale}x</span>
                                            <button onClick={() => handleResetOption('scale')} className={styles.resetBtn}><RotateCcw className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <div className={styles.rangeContainer}>
                                        <input
                                            type="range" min="0.5" max="4.0" step="0.1"
                                            value={options.scale}
                                            onChange={e => setOptions({ ...options, scale: Number(e.target.value) })}
                                            className={styles.rangeInput}
                                        />
                                    </div>
                                </div>

                                {/* Brightness */}
                                <div className={styles.controlGroup}>
                                    <div className={styles.controlHeader}>
                                        <div className={styles.controlLabel}><Sun className="w-3 h-3 text-[var(--brand-orange)]" /> BRIGHTNESS</div>
                                        <div className={styles.controlActions}>
                                            <span className={styles.controlValue}>{options.brightness}</span>
                                            <button onClick={() => handleResetOption('brightness')} className={styles.resetBtn}><RotateCcw className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <div className={styles.rangeContainer}>
                                        <input
                                            type="range" min="-100" max="100" step="5"
                                            value={options.brightness}
                                            onChange={e => setOptions({ ...options, brightness: Number(e.target.value) })}
                                            className={styles.rangeInput}
                                        />
                                    </div>
                                </div>

                                {/* Contrast */}
                                <div className={styles.controlGroup}>
                                    <div className={styles.controlHeader}>
                                        <div className={styles.controlLabel}>CONTRAST</div>
                                        <div className={styles.controlActions}>
                                            <span className={styles.controlValue}>{options.contrast}</span>
                                            <button onClick={() => handleResetOption('contrast')} className={styles.resetBtn}><RotateCcw className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                    <div className={styles.rangeContainer}>
                                        <input
                                            type="range" min="0.5" max="4.0" step="0.1"
                                            value={options.contrast}
                                            onChange={e => setOptions({ ...options, contrast: Number(e.target.value) })}
                                            className={styles.rangeInput}
                                        />
                                    </div>
                                </div>

                                {/* Global Threshold (Shown only if Adaptive is OFF) */}
                                {!options.adaptiveThreshold && (
                                    <div className={styles.controlGroup}>
                                        <div className={styles.controlHeader}>
                                            <div className={styles.controlLabel}><Sliders className="w-3 h-3 text-[var(--brand-orange)]" /> THRESHOLD</div>
                                            <div className={styles.controlActions}>
                                                <span className={styles.controlValue}>{options.threshold}</span>
                                                <button onClick={() => handleResetOption('threshold')} className={styles.resetBtn}><RotateCcw className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                        <div className={styles.rangeContainer}>
                                            <input
                                                type="range" min="0" max="255"
                                                value={options.threshold}
                                                onChange={e => setOptions({ ...options, threshold: Number(e.target.value) })}
                                                className={styles.rangeInput}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Toggles */}
                            <div className={styles.toggleGrid}>
                                <button
                                    onClick={() => setOptions({ ...options, grayscale: !options.grayscale })}
                                    className={`${styles.toggleCard} ${options.grayscale ? styles.active : ''}`}
                                >
                                    <div className="text-[10px] uppercase font-bold mb-1">Grayscale</div>
                                    <div className="text-xs opacity-70">{options.grayscale ? 'On' : 'Off'}</div>
                                </button>
                                <button
                                    onClick={() => setOptions({ ...options, invert: !options.invert })}
                                    className={`${styles.toggleCard} ${options.invert ? styles.active : ''}`}
                                >
                                    <div className="text-[10px] uppercase font-bold mb-1">Invert</div>
                                    <div className="text-xs opacity-70">{options.invert ? 'On' : 'Off'}</div>
                                </button>
                            </div>

                            <div className="border-t border-[var(--border)] my-4"></div>

                            {/* Advanced Controls Group */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-[var(--brand-orange)] uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Sliders className="w-3 h-3" /> Advanced Filters
                                </h3>

                                {/* Adaptive Threshold Toggle */}
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-[var(--border)]">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-200">Adaptive Threshold</span>
                                        <span className="text-[10px] text-gray-500">Local binarization for shadows</span>
                                    </div>
                                    <button
                                        onClick={() => setOptions({ ...options, adaptiveThreshold: !options.adaptiveThreshold })}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${options.adaptiveThreshold ? 'bg-[var(--primary)]' : 'bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${options.adaptiveThreshold ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                {/* Adaptive Params */}
                                {options.adaptiveThreshold && (
                                    <div className="space-y-3 pl-2 border-l-2 border-[var(--primary)] animate-fadeIn">
                                        {/* Window */}
                                        <div className={styles.controlGroup}>
                                            <div className={styles.controlHeader}>
                                                <div className={styles.controlLabel}>WINDOW SIZE</div>
                                                <span className={styles.controlValue}>{options.adaptiveWindow}px</span>
                                            </div>
                                            <div className={styles.rangeContainer}>
                                                <input
                                                    type="range" min="3" max="50" step="1"
                                                    value={options.adaptiveWindow}
                                                    onChange={e => setOptions({ ...options, adaptiveWindow: Number(e.target.value) })}
                                                    className={styles.rangeInput}
                                                />
                                            </div>
                                        </div>
                                        {/* Constant C */}
                                        <div className={styles.controlGroup}>
                                            <div className={styles.controlHeader}>
                                                <div className={styles.controlLabel}>CONSTANT (C)</div>
                                                <span className={styles.controlValue}>{options.adaptiveC}</span>
                                            </div>
                                            <div className={styles.rangeContainer}>
                                                <input
                                                    type="range" min="0" max="50" step="1"
                                                    value={options.adaptiveC}
                                                    onChange={e => setOptions({ ...options, adaptiveC: Number(e.target.value) })}
                                                    className={styles.rangeInput}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Morphology */}
                                <div className={styles.controlGroup}>
                                    <div className={styles.controlHeader}>
                                        <div className={styles.controlLabel}>MORPHOLOGY</div>
                                        <select
                                            value={options.morphology}
                                            onChange={(e: any) => setOptions({ ...options, morphology: e.target.value })}
                                            className="bg-black/40 border border-[var(--border)] rounded text-[10px] px-2 py-1 outline-none text-gray-300"
                                        >
                                            <option value="none">None</option>
                                            <option value="erode">Erode (Thicken)</option>
                                            <option value="dilate">Dilate (Thin)</option>
                                            <option value="open">Open (Clean)</option>
                                            <option value="close">Close (Fill)</option>
                                        </select>
                                    </div>

                                    {options.morphology !== 'none' && (
                                        <div className="mt-2">
                                            <div className={`${styles.controlHeader} mb-1`}>
                                                <div className="text-[9px] text-gray-500">KERNEL SIZE</div>
                                                <span className="text-[9px] text-gray-400">{options.morphologyKernel}px</span>
                                            </div>
                                            <div className={styles.rangeContainer}>
                                                <input
                                                    type="range" min="1" max="5" step="1"
                                                    value={options.morphologyKernel}
                                                    onChange={e => setOptions({ ...options, morphologyKernel: Number(e.target.value) })}
                                                    className={styles.rangeInput}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}

                    {/* --- TAB: OCR --- */}
                    {activeTab === 'ocr' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Seg Mode (PSM)</label>
                                <select
                                    className="w-full bg-[#161618] border border-[var(--border)] rounded p-2.5 text-sm text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                                    value={options.psm}
                                    onChange={(e) => setOptions({ ...options, psm: e.target.value })}
                                >
                                    {PSM_MODES.map(mode => (
                                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">Language</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['kor', 'eng', 'kor+eng'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => setOptions({ ...options, lang })}
                                            className={`py-2 text-xs font-bold uppercase rounded border transition-all ${options.lang === lang ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-white' : 'bg-transparent border-[var(--border)] text-gray-500 hover:border-gray-500'}`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: DATA --- */}
                    {activeTab === 'data' && (
                        <div className="h-full flex flex-col gap-4">
                            <div className={styles.resultBox}>
                                <div className={styles.resultHeaderAction}>
                                    <span className="text-xs font-bold text-green-500 flex items-center gap-2">
                                        <Check className="w-3 h-3" /> SUCCESS
                                    </span>
                                    <button onClick={() => navigator.clipboard.writeText(result)} className="text-[10px] opacity-70 hover:opacity-100 flex items-center gap-1">
                                        <Copy className="w-3 h-3" /> COPY
                                    </button>
                                </div>
                                <textarea
                                    className={styles.resultTextarea}
                                    value={result}
                                    readOnly
                                />
                            </div>

                            <div className="space-y-1">
                                {rawResults.slice(0, 10).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-white/5 rounded">
                                        <span className="text-gray-300 truncate max-w-[200px]">{item.text}</span>
                                        <span className={`confidenceBadge ${item.confidence > 90 ? styles.confidenceHigh : styles.confidenceMed}`}>
                                            {Math.round(item.confidence)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: LOGS --- */}
                    {activeTab === 'logs' && (
                        <div className={styles.logsContainer}>
                            <div className={styles.logsContent}>
                                {logs.map((log, i) => (
                                    <div key={i} className={styles.logEntry}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 border-t border-[var(--border)] text-right">
                                <button onClick={() => setLogs([])} className="text-[10px] text-red-500 font-bold uppercase hover:text-red-400">Clear</button>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Action */}
                <div className={styles.footer}>
                    <button
                        onClick={runOcr}
                        disabled={!processedImageSrc || !isReady || isProcessing}
                        className={styles.runBtn}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> PROCESSING...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" /> RUN ANALYSIS
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Worker (Hidden) */}
            <iframe
                ref={iframeRef}
                src="/ocr-worker/index.html"
                className="hidden"
                title="OCR Worker"
            />
        </div>
    )
}
