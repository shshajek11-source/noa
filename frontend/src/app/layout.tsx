import './globals.css'
import Link from 'next/link'
import FloatingAPILoader from './components/FloatingAPILoader'
import FloatingDummyDataGenerator from './components/FloatingDummyDataGenerator'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ko">
            <body>
                <header style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    background: 'rgba(11, 13, 18, 0.95)',
                    borderBottom: '1px solid var(--border)',
                    backdropFilter: 'blur(10px)',
                    marginBottom: '2rem'
                }}>
                    <div className="container" style={{
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 2rem'
                    }}>
                        {/* Text Logo */}
                        <Link href="/" style={{
                            fontSize: '1.5rem',
                            fontWeight: '800',
                            color: 'white',
                            textDecoration: 'none',
                            letterSpacing: '-0.5px'
                        }}>
                            NO<span style={{ color: '#facc15' }}>A</span>
                        </Link>

                        {/* Main Nav */}
                        <nav className="nav" style={{ marginBottom: 0 }}>
                            <Link href="/">홈</Link>
                            <Link href="/ranking">랭킹</Link>
                            <Link href="/tiers">티어</Link>
                            <Link href="/stats">통계</Link>
                            <Link href="/servers">서버</Link>
                            <Link href="/compare">비교</Link>
                        </nav>
                    </div>
                </header>

                <div className="container">
                    {children}
                </div>

                <FloatingAPILoader />
                <FloatingDummyDataGenerator />
            </body>
        </html>
    )
}
