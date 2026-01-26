'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Share, PlusSquare } from 'lucide-react'

const STORAGE_KEY = 'app_download_popup_dismissed'

// APK 다운로드 URL (GitHub Releases)
const APK_DOWNLOAD_URL = 'https://github.com/shshajek-cpu/sugo-gg/releases/latest/download/app-release.apk'

export default function AppDownloadPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 이미 닫았거나 앱 내 웹뷰면 표시하지 않음
    const dismissed = localStorage.getItem(STORAGE_KEY)
    const isInApp = window.navigator.userAgent.includes('SUGO-App')

    // iOS standalone 모드 (홈 화면에서 실행) 감지
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true

    if (dismissed || isInApp || isStandalone) return

    // 모바일 OS 감지
    const ua = navigator.userAgent.toLowerCase()
    const android = /android/.test(ua)
    const ios = /iphone|ipad|ipod/.test(ua)

    if (android || ios) {
      setIsAndroid(android)
      setIsIOS(ios)
      // 1초 후 표시 (페이지 로드 완료 후)
      setTimeout(() => setIsVisible(true), 1000)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
  }

  const handleDontShowAgain = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsVisible(false)
  }

  const handleDownload = () => {
    window.location.href = APK_DOWNLOAD_URL
  }

  if (!isVisible) return null

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        {/* 닫기 버튼 */}
        <button onClick={handleClose} style={styles.closeBtn}>
          <X size={20} />
        </button>

        {/* 아이콘 */}
        <div style={styles.iconWrapper}>
          <Smartphone size={48} color="#f59e0b" />
        </div>

        {/* 제목 */}
        <h3 style={styles.title}>
          {isAndroid ? 'SUGO.gg 앱 설치' : '홈 화면에 추가'}
        </h3>

        {/* Android 안내 */}
        {isAndroid && (
          <>
            <p style={styles.description}>
              앱으로 더 빠르고 편리하게!<br />
              홈 화면에서 바로 접속하세요.
            </p>
            <button onClick={handleDownload} style={styles.downloadBtn}>
              <Download size={18} />
              Android 앱 다운로드
            </button>
          </>
        )}

        {/* iOS 안내 */}
        {isIOS && (
          <>
            <p style={styles.description}>
              앱처럼 사용하려면<br />
              홈 화면에 추가하세요!
            </p>
            <div style={styles.iosSteps}>
              <div style={styles.iosStep}>
                <div style={styles.iosStepNumber}>1</div>
                <div style={styles.iosStepContent}>
                  <Share size={16} color="#f59e0b" />
                  <span>하단의 <strong>공유</strong> 버튼 탭</span>
                </div>
              </div>
              <div style={styles.iosStep}>
                <div style={styles.iosStepNumber}>2</div>
                <div style={styles.iosStepContent}>
                  <PlusSquare size={16} color="#f59e0b" />
                  <span><strong>홈 화면에 추가</strong> 선택</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 다시 보지 않기 */}
        <button onClick={handleDontShowAgain} style={styles.dontShowBtn}>
          다시 보지 않기
        </button>
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  popup: {
    backgroundColor: '#111',
    borderRadius: '16px',
    padding: '32px 24px',
    maxWidth: '320px',
    width: '100%',
    textAlign: 'center',
    position: 'relative',
    border: '1px solid #333',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
  },
  iconWrapper: {
    marginBottom: '16px',
  },
  title: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  description: {
    color: '#9CA3AF',
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  downloadBtn: {
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#f59e0b',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  downloadBtnDisabled: {
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#333',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'not-allowed',
    marginBottom: '12px',
  },
  dontShowBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  iosSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
    textAlign: 'left',
  },
  iosStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
  },
  iosStepNumber: {
    width: '24px',
    height: '24px',
    backgroundColor: '#f59e0b',
    color: '#000',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  iosStepContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#E5E7EB',
    fontSize: '14px',
  },
}
