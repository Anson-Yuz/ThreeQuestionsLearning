import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookIcon, ChevronRightIcon, MoreHorizontalIcon, PencilIcon, SaveIcon, TrashIcon } from '../ui/Icons'

interface CourseCardProps {
  id: string
  title: string
  keywords: string[]
  progress: number
  status: 'active' | 'completed' | 'archived' | 'deleted'
  threeAskProgress: {
    question1: boolean
    question2: boolean
    question3: boolean
  }
  lastAccessedAt: number
  onLongPress?: () => void
  onSave?: (courseId: string) => void
  onRename?: (courseId: string, newName: string) => void
  onDelete?: (courseId: string) => void
}

export const CourseCard = memo(({
  id,
  title,
  keywords = [],
  progress = 0,
  status,
  threeAskProgress = { question1: false, question2: false, question3: false },
  lastAccessedAt = 0,
  onLongPress,
  onSave,
  onRename,
  onDelete,
}: CourseCardProps) => {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 相对时间显示
  const relativeTime = useMemo(() => {
    const now = Date.now()
    const diff = now - lastAccessedAt
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 30) return `${days}天前`
    return new Date(lastAccessedAt).toLocaleDateString('zh-CN')
  }, [lastAccessedAt])

  const isCompleted = status === 'completed'
  const isArchived = status === 'archived'
  const opacity = isCompleted ? 'opacity-60' : isArchived ? 'opacity-40' : ''

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleCardClick = (e: React.MouseEvent) => {
    // 点击菜单按钮时不跳转
    if ((e.target as HTMLElement).closest('[data-card-menu]')) return
    navigate(`/learning/${id}`)
  }

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen((v) => !v)
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    onSave?.(id)
  }

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    const newName = window.prompt('重命名课程', title)
    if (newName && newName.trim() && newName !== title) {
      onRename?.(id, newName.trim())
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (window.confirm('确定删除此课程？')) {
      onDelete?.(id)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:bg-gray-50 ${opacity} transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* 书籍图标 */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <BookIcon className="w-6 h-6 text-white" />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-2 pr-2">
              {title}
            </h3>
            <ChevronRightIcon className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
          </div>

          {/* 关键词 */}
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.slice(0, 3).map((kw, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
            <span>{relativeTime}</span>
          </div>
        </div>
      </div>

      {/* 右下角三个点按钮 + 弹出菜单 */}
      <div data-card-menu className="absolute bottom-2 right-2">
        <button
          ref={buttonRef}
          onClick={handleMenuToggle}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="操作菜单"
        >
          <MoreHorizontalIcon className="w-5 h-5 text-gray-400" />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            data-card-menu
            className="absolute bottom-full right-0 mb-1 flex flex-col w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 animate-scale-in origin-bottom-right"
          >
            <button
              onClick={handleSave}
              data-card-menu
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
            >
              <SaveIcon className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={handleRename}
              data-card-menu
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              重命名
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 mx-2" />
            <button
              onClick={handleDelete}
              data-card-menu
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl"
            >
              <TrashIcon className="w-4 h-4" />
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

CourseCard.displayName = 'CourseCard'

export default CourseCard
