import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, UploadIcon } from '../components/ui/Icons'
import CourseCard from '../components/business/CourseCard'
import ActionSheet from '../components/ui/ActionSheet'
import EmptyState from '../components/ui/EmptyState'
import DiscoverResultsPanel from '../components/business/DiscoverResultsPanel'
import { useCourseStore } from '../stores/courseStore'
import { discoverApi, DiscoverResult } from '../api/discover'

const Home = () => {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { courses, loading, error, fetchCourses, deleteCourse, archiveCourse } = useCourseStore()
  const [searchValue, setSearchValue] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // 搜索 & 导入状态
  const [isSearching, setIsSearching] = useState(false)
  const [searchSeconds, setSearchSeconds] = useState(0)
  const [searchResults, setSearchResults] = useState<DiscoverResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // 清理定时器
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setSearchSeconds(0)
  }, [])

  // 单按钮流程：搜索 → 展示结果 → 导入 → 自动跳转
  const handleSearchAndLearn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchValue.trim()
    if (!q || isSearching) return

    setIsSearching(true)
    setSearchSeconds(0)
    timerRef.current = setInterval(() => setSearchSeconds((s) => s + 1), 1000)
    try {
      const res = await discoverApi.syncSearch(q)
      setSearchResults(res.results)
      setShowResults(true)
    } catch {
      setSearchResults([])
      setShowResults(true)
    } finally {
      stopTimer()
      setIsSearching(false)
    }
  }, [searchValue, isSearching, stopTimer])

  const handleCloseResults = useCallback(() => {
    setShowResults(false)
  }, [])

  // 导入选中 → 自动创建课程 → 跳转学习空间
  const handleImportAndGo = useCallback(async (urls: string[]) => {
    const q = searchValue.trim()
    try {
      const result = await discoverApi.importUrls(urls, q)
      setSearchValue('')
      setShowResults(false)
      await fetchCourses()
      navigate(`/learning/${result.course_id}`)
    } catch {
      alert('导入失败，请重试')
    }
  }, [searchValue, fetchCourses, navigate])

  const handleLongPress = useCallback((courseId: string) => {
    setSelectedCourseId(courseId)
    setShowMenu(true)
  }, [])

  const activeCourses = courses.filter((c) => c.status === 'active' || c.status === 'completed')
  const completedCount = courses.filter((c) => c.status === 'completed').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />

      <div className="bg-white dark:bg-gray-900">
        <div className="page-container py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">你好，继续学习</h1>
              <p className="text-sm text-gray-500 mt-1">
                {courses.length > 0 ? `已掌握 ${completedCount} 个课程` : '开始你的第一个学习之旅'}
              </p>
            </div>
            <button className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <UploadIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 搜索区域 */}
          <form onSubmit={handleSearchAndLearn}>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="输入你想学的问题..."
                className="w-full pl-10 pr-20 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!searchValue.trim() || isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-500 text-white text-sm rounded-xl disabled:opacity-40 min-w-[80px]"
              >
                {isSearching ? `搜索中 ${searchSeconds}s` : '搜索'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 课程列表 */}
      <div className="page-container pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">我的课程</h2>
          <span className="text-sm text-gray-400">{activeCourses.length} 个课程</span>
        </div>

        {activeCourses.length === 0 && error && (
          <EmptyState
            title="无法载入"
            loading={loading}
          />
        )}
        {activeCourses.length === 0 && !error && (
          <EmptyState
            title="尚无课程"
            description="搜索问题或浏览推荐，开始学习"
            action="去搜索"
            onAction={() => searchInputRef.current?.focus()}
            loading={loading}
          />
        )}

        <div className="space-y-3">
          {activeCourses.map((course) => (
            <div
              key={course.id}
              onContextMenu={(e) => {
                e.preventDefault()
                handleLongPress(course.id)
              }}
            >
              <CourseCard
                id={course.id}
                title={course.title}
                keywords={course.keywords}
                progress={course.progress}
                status={course.status}
                threeAskProgress={course.threeAskProgress}
                lastAccessedAt={course.lastAccessed}
                onLongPress={() => handleLongPress(course.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 搜索资料结果面板 */}
      {showResults && (
        <DiscoverResultsPanel
          results={searchResults}
          loading={isSearching}
          onImport={handleImportAndGo}
          onClose={handleCloseResults}
        />
      )}

      {showMenu && selectedCourseId && (
        <ActionSheet
          visible={showMenu}
          onClose={() => setShowMenu(false)}
          actions={[
            { title: '上传资料', icon: 'upload', action: () => {} },
            { title: '导出课程', icon: 'export', action: () => {} },
            { title: '归档', icon: 'archive', action: () => { archiveCourse(selectedCourseId); setShowMenu(false) }, destructive: false },
            { title: '删除', icon: 'delete', action: () => { deleteCourse(selectedCourseId); setShowMenu(false) }, destructive: true },
          ]}
        />
      )}
    </div>
  )
}

export default Home
