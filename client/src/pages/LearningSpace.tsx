import { memo, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import KnowledgeGraph from '../components/business/KnowledgeGraph'
import ControversyPanel from '../components/business/ControversyPanel'
import QuizEntrance from '../components/business/QuizEntrance'
import { RefreshIcon, GlobeIcon, DocumentIcon } from '../components/ui/Icons'
import { coursesApi, Course } from '../api/courses'
import { threeAskApi, KnowledgeGraph as GraphData } from '../api/threeAsk'

const friendlyMsg = (err: unknown): string => {
  if (err instanceof Error) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
      return '网络连接不稳定，请稍后重试'
    if (err.message.includes('404')) return '课程不存在'
    return err.message
  }
  return '加载失败，请重试'
}

const ErrorBlock = ({ msg, onRetry }: { msg: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <p className="text-gray-400 dark:text-gray-500 text-sm">{msg}</p>
    <button onClick={onRetry} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl">重试</button>
  </div>
)

const EmptyBlock = ({ msg, hint }: { msg: string; hint: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-2">
    <p className="text-gray-400 dark:text-gray-500 text-base">{msg}</p>
    <p className="text-gray-300 dark:text-gray-600 text-sm">{hint}</p>
  </div>
)

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

  const handleBack = () => navigate('/home')

  // ====== 初始加载中 ======
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">加载课程中...</p>
        </div>
      </div>
    )
  }

  // ====== 页面级错误 ======
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col page-container">
        <NavBar title="课程" showBack onLeftClick={handleBack} />
        <ErrorBlock msg={pageError} onRetry={() => { if (courseId) coursesApi.get(courseId).then(setCourse).catch(() => {}) }} />
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
              <ErrorBlock msg={graphError} onRetry={handleRefreshGraph} />
            ) : graphLoading ? (
              <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">正在分析知识结构...</p>
                </div>
              </div>
            ) : graphData.nodes.length === 0 ? (
              <EmptyBlock msg="暂无知识图谱数据" hint="上传学习资料后点击刷新生成知识图谱" />
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
              <ErrorBlock msg={controError} onRetry={handleLoadControversy} />
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

      {/* 底部知识库 */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900 dark:text-white">复合知识库</span>
          <button className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
            上传资料
          </button>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <GlobeIcon className="w-4 h-4" />
            <span>AI补充</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <DocumentIcon className="w-4 h-4" />
            <span>我的上传</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearningSpace
