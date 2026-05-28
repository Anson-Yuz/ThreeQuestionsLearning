import { memo, useEffect, useState } from 'react'

interface SafeAreaProps {
  children: React.ReactNode
  className?: string
  top?: boolean
  bottom?: boolean
}

export const SafeArea = memo(({ children, className = '', top = true, bottom = true }: SafeAreaProps) => {
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0 })

  useEffect(() => {
    const computedStyle = () => {
      const topVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')) || 0
      const bottomVal = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom')) || 0
      setSafeArea({ top: topVal, bottom: bottomVal })
    }

    computedStyle()
    window.addEventListener('resize', computedStyle)
    return () => window.removeEventListener('resize', computedStyle)
  }, [])

  return (
    <div
      className={className}
      style={{
        paddingTop: top ? safeArea.top : 0,
        paddingBottom: bottom ? safeArea.bottom : 0,
      }}
    >
      {children}
    </div>
  )
})

SafeArea.displayName = 'SafeArea'