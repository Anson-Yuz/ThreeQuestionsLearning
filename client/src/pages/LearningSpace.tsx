import { useState, useCallback, useEffect, useRef } from 'react'
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
  const [graphGenerating, setGraphGenerating] = useState(false)
  const [controversies, setControversies] = useState<any[]>([])
  const [controLoading, setControLoading] = useState(false)
  const [controError, setControError] = useState('')
  const [controGenerating, setControGenerating] = useState(false)
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
  }, [courseId])

  const handleRefreshGraph = useCallback(async () => {
    if (!courseId) return
    setGraphLoading(true)
    setGraphError('')
    try {
      // 1) 纯查缓存，不触发生成
      const cached = await coursesApi.getCachedGraph(courseId)
      if (mountedRef.current) {
        if (cached.status === 'ready' && cached.data?.nodes?.length) {
          setGraphData(cached.data as GraphData)
          setGraphLoading(false)
          return
        }
        // 无缓存 → fire-and-forget 触发后台生成
        if (!graphGenerating) {
          setGraphGenerating(true)
          threeAskApi.generateGraph(courseId).catch(() => {
            if (mountedRef.current) setGraphGenerating(false)
          })
        }
        // 保持 loading，等 SSE graph_updated
      }
    } catch (e) {
      if (mountedRef.current) {
        setGraphError(friendlyMsg(e))
        setGraphLoading(false)
      }
    }
  }, [courseId, graphGenerating])

  const handleLoadControversy = useCallback(async () => {
    if (!courseId) return
    setControLoading(true)
    setControError('')
    try {
      // 1. 纯查缓存，不触发生成
      const res = await threeAskApi.getControversies(courseId)
      if (!mountedRef.current) return
      if (res.controversies?.length > 0) {
        setControversies(res.controversies)
        setControLoading(false)
        return
      }
      // 2. 无缓存 → fire-and-forget 触发后台生成，不阻塞
      if (!controGenerating) {
        setControGenerating(true)
        threeAskApi.detectControversy(courseId).catch(() => {
          if (mountedRef.current) setControGenerating(false)
        })
      }
      // 保持 loading 状态，等待 SSE 推送
    } catch (e) {
      if (mountedRef.current) {
        setControError(friendlyMsg(e))
        setControLoading(false)
      }
    }
  }, [courseId, controGenerating])

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

  // SSE 监听：discover_ready / graph_updated / controversy_ready（带断线重连 + 页面可见性恢复）
  const sseRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)
  const courseIdRef = useRef(courseId)
  courseIdRef.current = courseId

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!courseId) return

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    const connect = () => {
      if (stopped || !courseIdRef.current) return
      sseRef.current?.close()
      const es = new EventSource(`/api/sse/stream/${courseIdRef.current}`)
      sseRef.current = es

      es.addEventListener('discover_ready', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          if (data.results?.length > 0 && mountedRef.current) {
            setDiscoverResults(data.results)
            setDiscoverCount(data.results.length)
          }
        } catch {}
      })

      es.addEventListener('graph_updated', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          if (data.nodes && mountedRef.current) {
            setGraphData(data)
            setGraphLoading(false)
            setGraphError('')
            setGraphGenerating(false)
          }
        } catch {}
      })

      es.addEventListener('controversy_ready', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          if (data.controversies && mountedRef.current) {
            setControversies(data.controversies)
            setControError('')
            setControLoading(false)
            setControGenerating(false)
          }
        } catch {}
      })

      es.onerror = () => {
        es.close()
        if (!stopped && courseIdRef.current) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    // 页面可见性变化 → 恢复连接
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const es = sseRef.current
        if (!es || es.readyState === EventSource.CLOSED) {
          connect()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      sseRef.current?.close()
      document.removeEventListener('visibilitychange', onVisible)
    }
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
        <div className="mb-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">复合知识库</span>
        </div>
        <KnowledgeBase documents={docs} loading={docsLoading} />
      </div>
    </div>
  )
}

export default LearningSpace
