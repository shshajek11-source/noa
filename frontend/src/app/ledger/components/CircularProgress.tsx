'use client'

interface CircularProgressProps {
  current: number
  max: number
  color: string
  size?: number
  strokeWidth?: number
}

export default function CircularProgress({
  current,
  max,
  color,
  size = 100,
  strokeWidth = 6
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(current / max, 1)
  const offset = circumference * (1 - progress)

  // Generate unique gradient ID based on color
  const gradientId = `grad-${color.replace('#', '')}`

  return (
    <div className="circular-progress-wrapper" style={{ width: size, height: size, position: 'relative' }}>
      <svg
        className="circular-progress-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
          <filter id={`glow-${color.replace('#', '')}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `url(#glow-${color.replace('#', '')})`
          }}
        />
      </svg>

      {/* Center text */}
      <div
        className="circular-progress-text"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: size * 0.24,
          fontWeight: 700,
          color: color,
          textShadow: `0 0 10px ${color}`,
          fontFamily: "'Rajdhani', sans-serif",
          letterSpacing: '0.5px'
        }}
      >
        {current}/{max}
      </div>

      {/* Complete badge */}
      {current >= max && (
        <div
          className="complete-badge"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}40, transparent)`,
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
