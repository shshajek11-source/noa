'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './BottomNavBar.module.css'

interface AnimatedIncomeProps {
  icon: string
  label: string
  amount: number
}

export default function AnimatedIncome({ icon, label, amount }: AnimatedIncomeProps) {
  const [displayAmount, setDisplayAmount] = useState(amount)
  const prevAmountRef = useRef(amount)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const prevAmount = prevAmountRef.current
    const diff = amount - prevAmount

    // 금액 변화가 없으면 애니메이션 안함
    if (diff === 0) return

    // 기존 애니메이션 취소
    if (animationRef.current) {
      clearInterval(animationRef.current)
    }

    const duration = 800 // 0.8초
    const steps = 30 // 30단계로 나눔
    const increment = diff / steps
    const stepTime = duration / steps

    let currentStep = 0

    animationRef.current = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayAmount(amount)
        if (animationRef.current) {
          clearInterval(animationRef.current)
        }
      } else {
        setDisplayAmount(prevAmount + increment * currentStep)
      }
    }, stepTime)

    prevAmountRef.current = amount

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current)
      }
    }
  }, [amount])

  // 증가/감소 상태 판단
  const isIncreasing = displayAmount > prevAmountRef.current
  const isDecreasing = displayAmount < prevAmountRef.current

  return (
    <div className={styles.incomeBox}>
      <div className={styles.incomeLabel}>
        <span className={styles.icon}>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        className={`${styles.incomeAmount} ${
          isIncreasing ? styles.increasing : isDecreasing ? styles.decreasing : ''
        }`}
      >
        {Math.round(displayAmount).toLocaleString()} 키나
      </div>
    </div>
  )
}
