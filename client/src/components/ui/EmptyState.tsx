import { memo } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: string
  onAction?: () => void
  error?: string
  loading?: boolean
}

const EmptyState = memo(({ title, description, action, onAction, error, loading }: EmptyStateProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '40vh' }}>
        <span className="text-[15px] text-gray-400 dark:text-gray-500">载入中…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center px-4" style={{ minHeight: '40vh', paddingTop: '10vh' }}>
      <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white text-center">
        {title}
      </h2>

      {description && (
        <p className="text-[15px] text-gray-400 dark:text-gray-500 text-center mt-2 max-w-xs leading-relaxed">
          {description}
        </p>
      )}

      {error && (
        <p className="text-[13px] text-red-500 dark:text-red-400 text-center mt-2">
          {error}
        </p>
      )}

      {action && onAction && (
        <button
          onClick={onAction}
          className="mt-4 text-[15px] text-blue-500 active:text-blue-700 dark:text-blue-400 dark:active:text-blue-300 min-h-[44px] px-2"
        >
          {action}
        </button>
      )}
    </div>
  )
})

EmptyState.displayName = 'EmptyState'
export default EmptyState
