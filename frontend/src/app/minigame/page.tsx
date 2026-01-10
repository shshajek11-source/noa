import EnhanceGame from '@/app/components/minigame/EnhanceGame'

export default function MinigamePage() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    color: '#e5e7eb', // Text main
                    background: 'linear-gradient(to right, #60a5fa, #a855f7)', // Blue to Purple
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px'
                }}>
                    강화 시뮬레이터
                </h1>
                <p style={{ color: '#9ca3af' }}>
                    이미지와 동일한 UI로 구성된 마석 강화 미니게임입니다.
                </p>
            </div>

            <EnhanceGame />

            <div style={{ marginTop: '80px', fontSize: '0.75rem', color: '#4b5563' }}>
                Developed by AION 2 Info Hub Team
            </div>
        </div>
    )
}
