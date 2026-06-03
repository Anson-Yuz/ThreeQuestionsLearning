import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import KnowledgeGraph from '../components/business/KnowledgeGraph'
import ControversyPanel from '../components/business/ControversyPanel'
import QuizEntrance from '../components/business/QuizEntrance'
import EmptyState from '../components/ui/EmptyState'
import DiscoverResultsPanel from '../components/business/DiscoverResultsPanel'
import KnowledgeBase from '../components/business/KnowledgeBase'
import { RefreshIcon, SparklesIcon } from '../components/ui/Icons'
import { coursesApi, Course } from '../api/courses'
import { threeAskApi, KnowledgeGraph as GraphData } from '../api/threeAsk'
import { discoverApi, DiscoverResult } from '../api/discover'
import { knowledgeApi, Document } from '../api/knowledge'

const friendlyMsg = (err: unknown): string => {
  if (err instanceof Error) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
      return '加载失败'
    if (err.message.includes('404')) return '课程不存在'
    return err.message
  }
  return '加载失败'
}

const LearningSpace = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'graph' | 'controversy' | 'quiz'>('graph')
  const [initialLoading, setInitialLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [pageError, setPageError] = useState('')
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState('')
  const [controversies, setControversies] = useState<any[]>([])
  const [controLoading, setControLoading] = useState(false)
  const [controError, setControError] = useState('')
  const [progress, setProgress] = useState(0)
  const [discoverCount, setDiscoverCount] = useState(0)
  const [discoverResults, setDiscoverResults] = useState<DiscoverResult[]>([])
  const [showDiscoverPanel, setShowDiscoverPanel] = useState(false)
  const [docs, setDocs] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // 加载课程信息 — 三态处理
  useEffect(() => {
    if (!courseId) {
      setInitialLoading(false)
      setPageError('无效的课程地址')
      return
    }
    setInitialLoading(true)
    setPageError('')
    coursesApi.get(courseId)
      .then((c) => { setCourse(c); setInitialLoading(false) })
      .catch((e) => { setPageError(friendlyMsg(e)); setInitialLoading(false) })

    threeAskApi.getProgress(courseId)
      .then((p) => setProgress(p.overallProgress))
      .catch(() => {})
  }, [courseId])

  const handleRefreshGraph = useCallback(async () => {
    if (!courseId) return
    setGraphLoading(true)
    setGraphError('')
    try {
      const graph = await threeAskApi.generateGraph(courseId)
      setGraphData(graph)
    } catch (e) {
      setGraphError(friendlyMsg(e))
      setGraphData({ nodes: [], links: [] })
    }
    setGraphLoading(false)
  }, [courseId])

  const handleLoadControversy = useCallback(async () => {
    if (!courseId) return
    setControLoading(true)
    setControError('')
    try {
      const res = await threeAskApi.getControversies(courseId)
      setControversies(res.controversies)
    } catch (e) {
      setControError(friendlyMsg(e))
      setControversies([])
    }
    setControLoading(false)
  }, [courseId])

  // 切换 tab 时加载对应数据
  useEffect(() => {
    if (pageError) return
    if (activeSection === 'graph') handleRefreshGraph()
    if (activeSection === 'controversy') handleLoadControversy()
  }, [activeSection, pageError, handleRefreshGraph, handleLoadControversy])

  // 挂载时自动触发后台异步搜索
  useEffect(() => {
    if (!courseId || !course?.originalQuestion) return
    discoverApi.start(courseId, course.originalQuestion).catch(() => {})
  }, [courseId, course?.originalQuestion])

  // SSE 监听 discover_ready → 浮动提示
  useEffect(() => {
    if (!courseId) return
    const es = new EventSource(`/api/sse/stream/${courseId}`)
    es.addEventListener('discover_ready', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.results?.length > 0) {
          setDiscoverResults(data.results)
          setDiscoverCount(data.results.length)
        }
      } catch {}
    })
    return () => es.close()
  }, [courseId])

  // 加载知识库文档
  useEffect(() => {
    if (!courseId) return
    setDocsLoading(true)
    knowledgeApi.list(courseId)
      .then((res) => setDocs(res.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false))
  }, [courseId, refreshKey])

  const handleImportMore = useCallback(async (urls: string[]) => {
    if (!courseId) return
    try {
      await discoverApi.importUrls(urls, '', courseId)
      setDiscoverCount(0)
      setShowDiscoverPanel(false)
      setRefreshKey((k) => k + 1)
    } catch {
      alert('导入失败')
    }
  }, [courseId])

  const handleBack = () => navigate('/home')

  // ====== 初始加载中 / 页面级错误 ======
  if (initialLoading || pageError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
        <NavBar title="课程" showBack onLeftClick={handleBack} />
        <EmptyState
          title={pageError ? '无法载入' : '载入中…'}
          loading={initialLoading}
        />
      </div>
    )
  }

  // ====== 正常渲染 ======
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col page-container">
      <NavBar
        title={course?.title || '课程'}
        showBack
        onLeftClick={handleBack}
      />

      {/* 进度条 */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex">
          {(['graph', 'controversy', 'quiz'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === section ? 'text-blue-500 border-blue-500' : 'text-gray-500 border-transparent'
              }`}
            >
              {{ graph: '知识图谱', controversy: '学术争议', quiz: '开始测评' }[section]}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'graph' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">第一问：核心心智模型</h2>
                <p className="text-sm text-gray-500 mt-1">基于已上传资料生成</p>
              </div>
              <button onClick={handleRefreshGraph} disabled={graphLoading} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-40">
                <RefreshIcon className="w-5 h-5" />
              </button>
            </div>

            {graphError ? (
              <EmptyState title="无法载入" />
            ) : graphLoading ? (
              <EmptyState title="载入中…" loading />
            ) : graphData.nodes.length === 0 ? (
              <EmptyState title="暂无图谱" description="上传学习资料后点击刷新" action="刷新" onAction={handleRefreshGraph} />
            ) : (
              <KnowledgeGraph data={graphData} loading={false} />
            )}
          </div>
        )}

        {activeSection === 'controversy' && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">第二问：学术分歧挖掘</h2>
              <p className="text-sm text-gray-500 mt-1">AI自动分析资料中的学术争议</p>
            </div>
            {controError ? (
              <EmptyState title="无法载入" />
            ) : (
              <ControversyPanel controversies={controversies} loading={controLoading} />
            )}
          </div>
        )}

        {activeSection === 'quiz' && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">第三问：知识检验</h2>
              <p className="text-sm text-gray-500 mt-1">基于布鲁姆认知层级测评</p>
            </div>
            <QuizEntrance courseId={courseId || ''} />
          </div>
        )}
      </div>

      {/* 浮动发现提示 */}
      {discoverCount > 0 && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={() => setShowDiscoverPanel(true)}
            className="bg-blue-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm animate-bounce"
          >
            <SparklesIcon className="w-4 h-4" />
            发现 {discoverCount} 条新资料
          </button>
        </div>
      )}

      {/* 发现资料面板（浮动非模态） */}
      {showDiscoverPanel && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <DiscoverResultsPanel
            results={discoverResults}
            onImport={handleImportMore}
            onClose={() => setShowDiscoverPanel(false)}
          />
        </div>
      )}

      {/* 底部知识库 */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">复合知识库</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
              上传资料
            </button>
          </div>
        </div>
        <KnowledgeBase documents={docs} loading={docsLoading} />
      </div>
    </div>
  )
}

export default LearningSpace
