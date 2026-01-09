/**
 * 능력치 디버그 컴포넌트
 * 개발 모드에서 능력치 검증 결과를 상세히 표시합니다.
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/components/StatsDebugPanel.tsx
 */

'use client'

import { useState } from 'react'
import { ValidationResult, StatInconsistency } from '../lib/statsValidator'
import { StatDetail } from '../types/stats'

interface StatsDebugPanelProps {
  validationResult: ValidationResult | null
  calculatedStats: StatDetail[]
  characterId?: string
  serverId?: string
  onClose: () => void
}

export default function StatsDebugPanel({
  validationResult,
  calculatedStats,
  characterId,
  serverId,
  onClose
}: StatsDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'inconsistencies' | 'details'>('overview')

  if (!validationResult) return null

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#3B82F6'
      default: return '#6B7280'
    }
  }

  const formatValue = (value: number) => {
    return value.toLocaleString()
  }

  const renderOverview = () => (
    <div style={{ padding: '1rem' }}>
      <h4 style={{ color: '#F3F4F6', marginBottom: '1rem' }}>검증 개요</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ 
          background: validationResult.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          border: `1px solid ${validationResult.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>검증 결과</div>
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold',
            color: validationResult.isValid ? '#10B981' : '#EF4444'
          }}>
            {validationResult.isValid ? '정상' : '불일치'}
          </div>
        </div>

        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>정확도</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#3B82F6' }}>
            {validationResult.accuracy}%
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
          총 능력치: {calculatedStats.length}개
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
          불일치 항목: {validationResult.inconsistencies.length}개
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
          경고 메시지: {validationResult.warnings.length}개
        </div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
          총 차이값: {formatValue(validationResult.totalDifferences)}
        </div>
      </div>

      {characterId && (
        <div style={{ 
          padding: '0.75rem', 
          background: '#1A1D26', 
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#6B7280'
        }}>
          <div>캐릭터 ID: {characterId}</div>
          <div>서버: {serverId}</div>
          <div>검증 시간: {new Date(validationResult.timestamp).toLocaleString('ko-KR')}</div>
        </div>
      )}
    </div>
  )

  const renderInconsistencies = () => (
    <div style={{ padding: '1rem' }}>
      <h4 style={{ color: '#F3F4F6', marginBottom: '1rem' }}>불일치 상세</h4>
      
      {validationResult.inconsistencies.length === 0 ? (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: '#6B7280',
          background: '#1A1D26',
          borderRadius: '8px'
        }}>
          ✅ 불일치가 없습니다. 모든 능력치가 정확하게 계산되었습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {validationResult.inconsistencies.map((inconsistency, index) => (
            <div
              key={index}
              style={{
                background: '#1A1D26',
                padding: '1rem',
                borderRadius: '8px',
                border: `1px solid ${getSeverityColor(inconsistency.severity)}30`,
                borderLeft: `4px solid ${getSeverityColor(inconsistency.severity)}`
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: getSeverityColor(inconsistency.severity),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    background: getSeverityColor(inconsistency.severity),
                    borderRadius: '50%'
                  }} />
                  {inconsistency.statName}
                </span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6B7280',
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(107, 114, 128, 0.2)',
                  borderRadius: '4px'
                }}>
                  {inconsistency.severity.toUpperCase()}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#6B7280' }}>계산: </span>
                  <span style={{ color: '#FCA5A5', fontWeight: 'bold' }}>
                    {formatValue(inconsistency.calculatedValue)}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>실제: </span>
                  <span style={{ color: '#A7F3D0', fontWeight: 'bold' }}>
                    {formatValue(inconsistency.actualValue)}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>차이: </span>
                  <span style={{ 
                    color: inconsistency.actualValue > inconsistency.calculatedValue ? '#FCA5A5' : '#FCA5A5',
                    fontWeight: 'bold'
                  }}>
                    {inconsistency.actualValue > inconsistency.calculatedValue ? '+' : ''}{formatValue(inconsistency.difference)}
                  </span>
                </div>
              </div>
              
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6B7280', 
                marginTop: '0.5rem',
                fontStyle: 'italic'
              }}>
                허용 오차: ±{formatValue(inconsistency.tolerance)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderDetails = () => (
    <div style={{ padding: '1rem' }}>
      <h4 style={{ color: '#F3F4F6', marginBottom: '1rem' }}>계산 상세</h4>
      
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        background: '#1A1D26',
        borderRadius: '8px',
        padding: '0.75rem'
      }}>
        {calculatedStats.map((stat, index) => {
          const inconsistency = validationResult.inconsistencies.find(inc => inc.statName === stat.name)
          
          return (
            <div
              key={index}
              style={{
                padding: '0.5rem',
                borderBottom: index < calculatedStats.length - 1 ? '1px solid #2D3748' : 'none',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.25rem'
              }}>
                <span style={{ 
                  color: inconsistency ? '#FCA5A5' : '#F3F4F6',
                  fontWeight: 'bold'
                }}>
                  {stat.name}
                </span>
                <span style={{ color: stat.color }}>
                  {formatValue(stat.totalValue + stat.totalPercentage)}
                  {stat.totalPercentage > 0 && ` (+${stat.totalPercentage.toFixed(1)}%)`}
                </span>
              </div>
              
              <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                카테고리: {stat.category} | 
                소스 수: {(stat.sources.equipment?.length || 0) + (stat.sources.titles?.length || 0) + (stat.sources.baseStats?.length || 0)}개
              </div>
              
              {inconsistency && (
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#EF4444',
                  marginTop: '0.25rem'
                }}>
                  ⚠️ {inconsistency.message}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '800px',
      height: '80vh',
      maxHeight: '600px',
      background: '#111318',
      border: '1px solid #1F2433',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #1F2433',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#0B0D12'
      }}>
        <h3 style={{ color: '#F3F4F6', margin: 0 }}>능력치 검증 디버그</h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#374151'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ×
        </button>
      </div>

      {/* 탭 */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1F2433',
        background: '#0A0C10'
      }}>
        {[
          { id: 'overview', label: '개요', icon: '📊' },
          { id: 'inconsistencies', label: '불일치', icon: '⚠️' },
          { id: 'details', label: '상세', icon: '🔍' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: activeTab === tab.id 
                ? 'rgba(59, 130, 246, 0.1)' 
                : 'transparent',
              color: activeTab === tab.id ? '#3B82F6' : '#6B7280',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? '600' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : 'none'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 내용 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        background: '#111318'
      }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'inconsistencies' && renderInconsistencies()}
        {activeTab === 'details' && renderDetails()}
      </div>
    </div>
  )
}