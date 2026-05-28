import { memo } from 'react'

interface NavBarProps {
  title?: string
  leftText?: string
  rightText?: string
  onLeftClick?: () => void
  onRightClick?: () => void
  showBack?: boolean
}

export const NavBar = memo(({
  title,
  leftText,
  rightText,
  onLeftClick,
  onRightClick,
  showBack = false,
}: NavBarProps) => {
  return (
    <div className="h-11 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4">
      <div className="w-20">
        {(leftText || showBack) && (
          <button onClick={onLeftClick} className="text-blue-500 text-sm">
            {showBack ? '‹ 返回' : leftText}
          </button>
        )}
      </div>

      <h1 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h1>

      <div className="w-20 flex justify-end">
        {rightText && (
          <button onClick={onRightClick} className="text-blue-500 text-sm">
            {rightText}
          </button>
        )}
      </div>
    </div>
  )
})

NavBar.displayName = 'NavBar'