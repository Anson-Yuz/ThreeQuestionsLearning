import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, UploadIcon } from '../components/ui/Icons'
import CourseCard from '../components/business/CourseCard'
import ActionSheet from '../components/ui/ActionSheet'
import EmptyState from '../components/ui/EmptyState'
import DiscoverResultsPanel from '../components/business/DiscoverResultsPanel'
import UploadModal from '../components/business/UploadModal'
import { useCourseStore } from '../stores/courseStore'
import { coursesApi, CourseSearchResult } from '../api/courses'
import { discoverApi, DiscoverResult } from '../api/discover'

const Home = () => {
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { courses, loading, error, fetchCourses, deleteCourse, archiveCourse } = useCourseStore()
  const [searchValue, setSearchValue] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSearchResults, setCourseSearchResults] = useState<CourseSearchResult[]>([])
  const [courseSearching, setCourseSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

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

  // 课程库内搜索（FTS5 后端，< 50ms），输入防抖 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = courseSearch.trim()
    if (q.length < 1) {
      setCourseSearchResults([])
      setCourseSearching(false)
      return
    }
    setCourseSearching(true)
    debounceRef.current = setTimeout(() => {
      coursesApi.search(q, 8)
        .then((res) => setCourseSearchResults(res.results || []))
        .catch(() => setCourseSearchResults([]))
        .finally(() => setCourseSearching(false))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [courseSearch])

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
            <button
              onClick={() => {
                if (courses.length > 0) {
                  setSelectedCourseId(courses[0].id)
                  setShowUpload(true)
                } else {
                  alert('请先创建课程')
                }
              }}
              className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="上传资料"
            >
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
       {/* 课程列表 */}
      <div className="page-container pt-4 space-y-4">
        {/* 标题行 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">我的课程</h2>
          <span className="text-sm text-gray-400">{activeCourses.length} 个课程</span>
        </div>

        {/* 搜索栏 —— 始终固定在标题下方，不受 EmptyState 影响 */}
        <div className="relative mb-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="在课程库中搜索..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {courseSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜索中…</span>
          )}
        </div>

        {/* 搜索结果 —— 只显示首页已有课程 */}
        {courseSearch.trim() && (
          <div className="mb-3 space-y-1.5">
            {courseSearching && courseSearchResults.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-3 text-center">正在搜索...</p>
            )}
            {!courseSearching && courseSearchResults.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-3 text-center">未找到匹配课程</p>
            )}
            {courseSearchResults
              .filter((r) => activeCourses.some((c) => c.id === r.id))
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/learning/${r.id}`)}
                  className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                      {r.title}
                    </span>
                    {r.doc_count !== undefined && (
                      <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                        {r.doc_count} 篇
                      </span>
                    )}
                  </div>
                  {r.snippet && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {r.snippet}
                    </p>
                  )}
                </button>
              ))}
          </div>
        )}

        {/* 课程卡片列表区域 — 包含 EmptyState 或 卡片 */}
        <div className="space-y-3">
          {activeCourses.length > 0 ? (
            activeCourses.map((course) => (
              <div key={course.id}>
                <CourseCard
                  id={course.id}
                  title={course.title}
                  keywords={course.keywords}
                  progress={course.progress}
                  status={course.status}
                  threeAskProgress={course.threeAskProgress}
                  lastAccessedAt={course.lastAccessed}
                  onDelete={(courseId) => {
                    if (window.confirm('确定删除该课程？')) {
                      deleteCourse(courseId)
                    }
                  }}
                />
              </div>
            ))
          ) : error ? (
            <EmptyState title="无法载入" loading={loading} />
          ) : (
            <EmptyState
              title="尚无课程"
              description="搜索问题或浏览推荐，开始学习"
              action="去搜索"
              onAction={() => searchInputRef.current?.focus()}
              loading={loading}
            />
          )}
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
            { title: '上传资料', icon: 'upload', action: () => { setShowMenu(false); setShowUpload(true) } },
            { title: '导出课程', icon: 'export', action: () => {} },
            { title: '归档', icon: 'archive', action: () => { archiveCourse(selectedCourseId); setShowMenu(false) }, destructive: false },
            { title: '删除', icon: 'delete', action: () => { deleteCourse(selectedCourseId); setShowMenu(false) }, destructive: true },
          ]}
        />
      )}

      {showUpload && selectedCourseId && (
        <UploadModal
          courseId={selectedCourseId}
          courseTitle={courses.find(c => c.id === selectedCourseId)?.title}
          onClose={() => setShowUpload(false)}
          onUploaded={() => fetchCourses()}
        />
      )}
    </div>
  )
}

export default Home
