import { memo } from 'react'

interface Action {
  title: string
  icon: string
  action: () => void
  destructive?: boolean
}

interface ActionSheetProps {
  visible: boolean
  onClose: () => void
  actions: Action[]
  title?: string
}

const iconMap: Record<string, React.ReactNode> = {
  upload: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  export: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  archive: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  delete: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
}

export const ActionSheet = memo(({ visible, onClose, actions, title }: ActionSheetProps) => {
  if (!visible) return null

  const handleAction = (action: Action) => {
    action.action()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Action Sheet 面板 */}
      <div className="relative w-full max-w-lg mx-4 mb-8 animate-slide-up">
        {title && (
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl px-4 py-3 text-center border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">{title}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                handleAction(action)
              }}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                transition-colors active:bg-gray-100 dark:active:bg-gray-700
                ${idx !== actions.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
                ${action.destructive ? 'text-red-500' : 'text-gray-900 dark:text-white'}
              `}
            >
              <span className={action.destructive ? 'text-red-500' : 'text-gray-500'}>
                {iconMap[action.icon] || <span className="w-5 h-5" />}
              </span>
              <span className="flex-1 text-left">{action.title}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-3 bg-white dark:bg-gray-800 rounded-2xl font-medium text-blue-500 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
})

ActionSheet.displayName = 'ActionSheet'

export default ActionSheet