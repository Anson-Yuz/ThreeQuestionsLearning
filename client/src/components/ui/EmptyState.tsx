import { memo } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: string
  onAction?: () => void
  loading?: boolean
}

/**
 * 极简空状态 / 错误状态组件
 *
 * 间距系统（iOS HIG + Anthropic 参考）：
 *   title ↔ description : 8pt   — 同一信息组，紧密耦合
 *   description ↔ action: 24pt  — 信息组 → 行动组，明确分隔
 */
const EmptyState = memo(({ title, description, action, onAction, loading }: EmptyStateProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
        <span className="text-[15px] text-gray-400 dark:text-gray-500">载入中…</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{ minHeight: '40vh', paddingTop: '10vh' }}
    >
      <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white text-center leading-tight">
        {title}
      </h2>

      {description && (
        <p
          className="text-[15px] text-gray-400 dark:text-gray-500 text-center max-w-xs"
          style={{ marginTop: 8, lineHeight: 1.4 }}
        >
          {description}
        </p>
      )}

      {action && onAction && (
        <button
          onClick={onAction}
          className="text-[15px] text-blue-500 active:text-blue-700 dark:text-blue-400 dark:active:text-blue-300 min-h-[44px] px-2"
          style={{ marginTop: description ? 24 : 16 }}
        >
          {action}
        </button>
      )}
    </div>
  )
})

EmptyState.displayName = 'EmptyState'
export default EmptyState
