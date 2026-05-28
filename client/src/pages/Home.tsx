import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, PlusIcon } from '../components/ui/Icons'
import CourseCard from '../components/business/CourseCard'
import ActionSheet from '../components/ui/ActionSheet'

// 模拟数据
const mockCourses = [
  {
    id: '1',
    title: 'JavaScript精通之路',
    keywords: ['JavaScript', 'ES6', '前端'],
    progress: 80,
    status: 'active' as const,
    threeAskProgress: { question1: true, question2: true, question3: false },
    lastAccessedAt: Date.now() - 3600000,
  },
  {
    id: '2',
    title: 'Vue3核心原理',
    keywords: ['Vue3', 'Composition API', '响应式'],
    progress: 60,
    status: 'active' as const,
    threeAskProgress: { question1: true, question2: false, question3: false },
    lastAccessedAt: Date.now() - 86400000,
  },
  {
    id: '3',
    title: '算法与数据结构',
    keywords: ['算法', '数据结构', '面试'],
    progress: 40,
    status: 'active' as const,
    threeAskProgress: { question1: false, question2: false, question3: false },
    lastAccessedAt: Date.now() - 172800000,
  },
  {
    id: '4',
    title: 'Python机器学习',
    keywords: ['Python', 'ML', 'AI'],
    progress: 100,
    status: 'completed' as const,
    threeAskProgress: { question1: true, question2: true, question3: true },
    lastAccessedAt: Date.now() - 604800000,
  },
]

const Home = () => {
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<typeof mockCourses[0] | null>(null)

  const handleSearch = useCallback(() => {
    if (searchValue.trim()) {
      setIsCreating(true)
      // 模拟创建课程
      setTimeout(() => {
        setIsCreating(false)
        navigate('/learning/new')
      }, 1500)
    }
  }, [searchValue, navigate])

  const handleLongPress = useCallback((course: typeof mockCourses[0]) => {
    setSelectedCourse(course)
    setShowMenu(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 状态栏占位 */}
      <div className="h-11 bg-white dark:bg-gray-900" />

      {/* 标题栏 */}
      <div className="bg-white dark:bg-gray-900 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">你好，继续学习</h1>
            <p className="text-sm text-gray-500 mt-1">已掌握 4 个课程</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-lg">👤</span>
          </div>
        </div>

        {/* 搜索区域 */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入你想学的问题..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isCreating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* 课程列表 */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">我的课程</h2>
          <button className="text-sm text-blue-500">查看全部</button>
        </div>

        <div className="space-y-3">
          {mockCourses.map((course) => (
            <div
              key={course.id}
              onContextMenu={(e) => {
                e.preventDefault()
                handleLongPress(course)
              }}
            >
              <CourseCard
                id={course.id}
                title={course.title}
                keywords={course.keywords}
                progress={course.progress}
                status={course.status}
                threeAskProgress={course.threeAskProgress}
                lastAccessedAt={course.lastAccessedAt}
                onLongPress={() => handleLongPress(course)}
              />
            </div>
          ))}
        </div>

        {/* 归档课程 */}
        <div className="pt-4">
          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="text-sm">已归档课程 (1)</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 长按菜单 */}
      {showMenu && selectedCourse && (
        <ActionSheet
          visible={showMenu}
          onClose={() => setShowMenu(false)}
          actions={[
            { title: '上传资料', icon: 'upload', action: () => {} },
            { title: '导出课程', icon: 'export', action: () => {} },
            {
              title: '归档',
              icon: 'archive',
              action: () => {},
              destructive: false
            },
            {
              title: '删除',
              icon: 'delete',
              action: () => {},
              destructive: true
            },
          ]}
        />
      )}
    </div>
  )
}

export default Home