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
  const { courses, loading, error, fetchCourses, createCourse, deleteCourse, archiveCourse } = useCourseStore()
  const [searchValue, setSearchValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  // 搜索资料状态
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<DiscoverResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [importedCourseId, setImportedCourseId] = useState('')

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // 用 form onSubmit 代替 onKeyDown，避免中文输入法IME导致Enter误触发
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchValue.trim()
    if (!q || isCreating) return

    setIsCreating(true)
    // 10 秒超时保护，防止请求挂起导致按钮永久"创建中..."
    const timeout = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), 10000)
    )
    try {
      const course = await Promise.race([createCourse(q), timeout])
      if (course) {
        setSearchValue('')
        navigate(`/learning/${course.id}`)
        discoverApi.start(course.id, q).catch(() => {})
      }
    } catch {
      // 超时或网络错误，静默处理
    } finally {
      setIsCreating(false)
    }
  }, [searchValue, isCreating, createCourse, navigate])

  // 搜索资料（不创建课程，同步返回结果）
  const handleSearchOnly = useCallback(async () => {
    const q = searchValue.trim()
    if (!q || isSearching) return
    setIsSearching(true)
    setImportedCourseId('')
    try {
      const res = await discoverApi.syncSearch(q)
      setSearchResults(res.results)
      setShowResults(true)
    } catch {
      setSearchResults([])
      setShowResults(true)
    } finally {
      setIsSearching(false)
    }
  }, [searchValue, isSearching])

  // 导入选中 URL（自动创建课程）
  const handleImportSelected = useCallback(async (urls: string[]) => {
    const q = searchValue.trim()
    try {
      const result = await discoverApi.importUrls(urls, q)
      setImportedCourseId(result.course_id)
      await fetchCourses()
      setShowResults(false)
    } catch {
      alert('导入失败，请重试')
    }
  }, [searchValue, fetchCourses])

  const handleEnterCourse = () => {
    if (importedCourseId) {
      navigate(`/learning/${importedCourseId}`)
    }
  }

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

          {/* 搜索区域 - 用 form 包裹，避免IME冲突 */}
          <form onSubmit={handleSearchSubmit}>
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
                className="w-full pl-10 pr-24 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSearchOnly}
                  disabled={!searchValue.trim() || isSearching}
                  className="px-3 py-1 text-blue-500 text-sm rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40"
                >
                  {isSearching ? '搜索中...' : '找资料'}
                </button>
                <button
                  type="submit"
                  disabled={!searchValue.trim() || isCreating}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-xl disabled:opacity-40"
                >
                  {isCreating ? '创建中...' : '开始'}
                </button>
              </div>
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
          onImport={handleImportSelected}
          onClose={() => setShowResults(false)}
        />
      )}

      {/* 导入成功提示 */}
      {importedCourseId && (
        <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center">
          <div className="bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <span className="text-sm">资料导入成功！</span>
            <button
              onClick={handleEnterCourse}
              className="px-3 py-1 bg-white text-green-600 text-sm rounded-lg font-medium"
            >
              进入课程
            </button>
            <button
              onClick={() => setImportedCourseId('')}
              className="text-white/80 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
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
