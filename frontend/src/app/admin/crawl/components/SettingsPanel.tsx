'use client'

import { CrawlSettings } from '../types'
import DSCard from '../../../components/design-system/DSCard'

interface SettingSliderProps {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (value: number) => void
    disabled?: boolean
}

function SettingSlider({ label, value, min, max, step = 1, unit = '', onChange, disabled }: SettingSliderProps) {
    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
                fontSize: '0.75rem'
            }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ color: 'var(--brand-red-main)', fontWeight: 600, fontFamily: 'monospace' }}>
                    {value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                disabled={disabled}
                style={{
                    width: '100%',
                    accentColor: 'var(--brand-red-main)',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
            />
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.6rem',
                color: 'var(--text-disabled)'
            }}>
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    )
}

interface SettingToggleProps {
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
}

function SettingToggle({ label, description, checked, onChange, disabled }: SettingToggleProps) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '0.5rem',
            background: checked ? 'rgba(217, 43, 75, 0.1)' : 'transparent',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: disabled ? 0.5 : 1
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                disabled={disabled}
                style={{
                    accentColor: 'var(--brand-red-main)',
                    marginTop: '2px'
                }}
            />
            <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>{label}</div>
                {description && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-disabled)', marginTop: '2px' }}>
                        {description}
                    </div>
                )}
            </div>
        </label>
    )
}

interface SettingSelectProps {
    label: string
    value: number | string
    options: { value: number | string; label: string }[]
    onChange: (value: any) => void
    disabled?: boolean
}

function SettingSelect({ label, value, options, onChange, disabled }: SettingSelectProps) {
    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
                display: 'block',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.25rem'
            }}>
                {label}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: '#0D0F14',
                    border: '1px solid var(--brand-red-muted)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.8rem',
                    cursor: disabled ? 'not-allowed' : 'pointer'
                }}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    )
}

interface SettingsPanelProps {
    settings: CrawlSettings
    onChange: (settings: CrawlSettings) => void
    disabled?: boolean
}

export default function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
    const updateSpeed = (key: keyof CrawlSettings['speed'], value: number) => {
        onChange({ ...settings, speed: { ...settings.speed, [key]: value } })
    }

    const updateSmart = (key: keyof CrawlSettings['smart'], value: any) => {
        onChange({ ...settings, smart: { ...settings.smart, [key]: value } })
    }

    const updateSchedule = (key: keyof CrawlSettings['schedule'], value: any) => {
        onChange({ ...settings, schedule: { ...settings.schedule, [key]: value } })
    }

    const updateSafety = (key: keyof CrawlSettings['safety'], value: any) => {
        onChange({ ...settings, safety: { ...settings.safety, [key]: value } })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Speed Control */}
            <DSCard title="⚡ 속도 제어" hoverEffect={false} style={{ padding: '1rem' }}>
                <SettingSlider
                    label="요청 간격"
                    value={settings.speed.requestDelay}
                    min={500}
                    max={5000}
                    step={100}
                    unit="ms"
                    onChange={v => updateSpeed('requestDelay', v)}
                    disabled={disabled}
                />
                <SettingSlider
                    label="배치 크기"
                    value={settings.speed.batchSize}
                    min={1}
                    max={10}
                    unit="개"
                    onChange={v => updateSpeed('batchSize', v)}
                    disabled={disabled}
                />
                <SettingSlider
                    label="컨텐츠 간 쿨다운"
                    value={settings.speed.contentCooldown}
                    min={1000}
                    max={10000}
                    step={500}
                    unit="ms"
                    onChange={v => updateSpeed('contentCooldown', v)}
                    disabled={disabled}
                />
            </DSCard>

            {/* Smart Features */}
            <DSCard title="🧠 스마트 기능" hoverEffect={false} style={{ padding: '1rem' }}>
                <SettingToggle
                    label="자동 속도 조절"
                    description="에러 발생 시 자동으로 요청 간격 증가"
                    checked={settings.smart.autoSlowdown}
                    onChange={v => updateSmart('autoSlowdown', v)}
                    disabled={disabled}
                />
                <SettingSlider
                    label="재시도 횟수"
                    value={settings.smart.retryCount}
                    min={0}
                    max={5}
                    unit="회"
                    onChange={v => updateSmart('retryCount', v)}
                    disabled={disabled}
                />
                <SettingSlider
                    label="최근 업데이트 스킵"
                    value={settings.smart.skipRecentHours}
                    min={0}
                    max={72}
                    unit="시간"
                    onChange={v => updateSmart('skipRecentHours', v)}
                    disabled={disabled}
                />
                <SettingToggle
                    label="중단점 저장"
                    description="중단 시 진행 상황 저장, 이어서 재개 가능"
                    checked={settings.smart.resumeEnabled}
                    onChange={v => updateSmart('resumeEnabled', v)}
                    disabled={disabled}
                />
            </DSCard>

            {/* Scheduling */}
            <DSCard title="📅 스케줄링" hoverEffect={false} style={{ padding: '1rem' }}>
                <SettingToggle
                    label="자동 실행"
                    description="설정된 간격으로 자동 크롤링 실행"
                    checked={settings.schedule.autoRunEnabled}
                    onChange={v => updateSchedule('autoRunEnabled', v)}
                    disabled={disabled}
                />
                {settings.schedule.autoRunEnabled && (
                    <SettingSelect
                        label="자동 실행 간격"
                        value={settings.schedule.autoRunInterval}
                        options={[
                            { value: 5, label: '5분' },
                            { value: 10, label: '10분' },
                            { value: 30, label: '30분' },
                            { value: 60, label: '1시간' },
                            { value: 180, label: '3시간' },
                            { value: 360, label: '6시간' },
                            { value: 720, label: '12시간' },
                            { value: 1440, label: '24시간' },
                        ]}
                        onChange={v => updateSchedule('autoRunInterval', Number(v))}
                        disabled={disabled}
                    />
                )}
                <SettingToggle
                    label="예약 실행"
                    description="특정 시간에 자동으로 크롤링 시작"
                    checked={settings.schedule.repeatEnabled}
                    onChange={v => updateSchedule('repeatEnabled', v)}
                    disabled={disabled}
                />
                {settings.schedule.repeatEnabled && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.25rem'
                        }}>
                            예약 시간
                        </label>
                        <input
                            type="time"
                            value={settings.schedule.scheduledTime}
                            onChange={e => updateSchedule('scheduledTime', e.target.value)}
                            disabled={disabled}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                background: '#0D0F14',
                                border: '1px solid var(--brand-red-muted)',
                                borderRadius: '6px',
                                color: 'var(--text-main)',
                                fontSize: '0.8rem'
                            }}
                        />
                    </div>
                )}
            </DSCard>

            {/* Safety */}
            <DSCard title="🛡️ 안전장치" hoverEffect={false} style={{ padding: '1rem' }}>
                <SettingSlider
                    label="최대 연속 에러"
                    value={settings.safety.maxConsecutiveErrors}
                    min={3}
                    max={20}
                    unit="회"
                    onChange={v => updateSafety('maxConsecutiveErrors', v)}
                    disabled={disabled}
                />
                <SettingSelect
                    label="일일 요청 한도"
                    value={settings.safety.dailyRequestLimit}
                    options={[
                        { value: 0, label: '무제한' },
                        { value: 1000, label: '1,000회' },
                        { value: 5000, label: '5,000회' },
                        { value: 10000, label: '10,000회' },
                        { value: 20000, label: '20,000회' },
                    ]}
                    onChange={v => updateSafety('dailyRequestLimit', Number(v))}
                    disabled={disabled}
                />
                <SettingToggle
                    label="에러 시 일시정지"
                    description="에러 발생 시 자동 중지 대신 일시정지"
                    checked={settings.safety.pauseOnError}
                    onChange={v => updateSafety('pauseOnError', v)}
                    disabled={disabled}
                />
                <SettingToggle
                    label="긴급 중지 버튼"
                    description="헤더에 긴급 중지 버튼 표시"
                    checked={settings.safety.emergencyStopEnabled}
                    onChange={v => updateSafety('emergencyStopEnabled', v)}
                    disabled={disabled}
                />
            </DSCard>
        </div>
    )
}
