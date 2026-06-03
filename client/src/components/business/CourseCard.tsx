import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookIcon, ChevronRightIcon } from '../ui/Icons'

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
}

export const CourseCard = memo(({
  id,
  title,
  keywords,
  progress,
  status,
  threeAskProgress,
  lastAccessedAt,
  onLongPress,
}: CourseCardProps) => {
  const navigate = useNavigate()

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

  const handleClick = () => {
    navigate(`/learning/${id}`)
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm active:bg-gray-50 ${opacity} transition-all`}
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
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${threeAskProgress.question1 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${threeAskProgress.question2 ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className={`w-1.5 h-1.5 rounded-full ${threeAskProgress.question3 ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

CourseCard.displayName = 'CourseCard'

export default CourseCard