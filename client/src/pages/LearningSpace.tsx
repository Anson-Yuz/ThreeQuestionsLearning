import { memo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import KnowledgeGraph from '../components/business/KnowledgeGraph'
import ControversyPanel from '../components/business/ControversyPanel'
import QuizEntrance from '../components/business/QuizEntrance'
import { ChevronRightIcon, RefreshIcon, UploadIcon, GlobeIcon, DocumentIcon } from '../components/ui/Icons'

// 模拟知识图谱数据
const mockGraphData = {
  nodes: [
    { id: '1', name: 'JavaScript', description: '编程语言基础', bloomLevel: 'understand', difficulty: 0.3, isThresholdConcept: true },
    { id: '2', name: '闭包', description: '函数与作用域', bloomLevel: 'apply', difficulty: 0.6, isThresholdConcept: false },
    { id: '3', name: '原型链', description: '继承机制', bloomLevel: 'analyze', difficulty: 0.7, isThresholdConcept: false },
    { id: '4', name: '异步编程', description: 'Promise与回调', bloomLevel: 'apply', difficulty: 0.6, isThresholdConcept: false },
    { id: '5', name: '事件循环', description: '执行机制', bloomLevel: 'understand', difficulty: 0.5, isThresholdConcept: false },
  ],
  links: [
    { source: '1', target: '2', relation: 'prerequisite', strength: 0.9 },
    { source: '1', target: '3', relation: 'prerequisite', strength: 0.8 },
    { source: '4', target: '5', relation: 'related', strength: 0.7 },
    { source: '2', target: '4', relation: 'related', strength: 0.6 },
  ],
}

// 模拟争议数据
const mockControversies = [
  {
    id: '1',
    topic: '闭包是否应该广泛使用？',
    pro_view: '闭包是JavaScript强大的特性，可以实现私有变量和模块化',
    pro_evidence: 'MDN文档推荐',
    con_view: '闭包会导致内存泄漏和性能问题',
    con_evidence: 'StackOverflow多个案例',
    confidence: 0.85,
  },
]

const LearningSpace = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'graph' | 'controversy' | 'quiz'>('graph')
  const [graphLoading, setGraphLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const handleBack = () => {
    navigate('/home')
  }

  const handleRefreshGraph = () => {
    setGraphLoading(true)
    setTimeout(() => setGraphLoading(false), 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col page-container">
      <NavBar
        title="JavaScript精通之路"
        showBack
        onLeftClick={handleBack}
        rightText="更多"
      />

      {/* 进度条 */}
      <div className="bg-white dark:bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '40%' }} />
          </div>
          <span className="text-sm text-gray-500">40%</span>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveSection('graph')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'graph'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-500 border-transparent'
            }`}
          >
            知识图谱
          </button>
          <button
            onClick={() => setActiveSection('controversy')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'controversy'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-500 border-transparent'
            }`}
          >
            学术争议
          </button>
          <button
            onClick={() => setActiveSection('quiz')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'quiz'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-500 border-transparent'
            }`}
          >
            开始测评
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'graph' && (
          <div className="p-4">
            {/* 第一问标题 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">第一问：核心心智模型</h2>
                <p className="text-sm text-gray-500 mt-1">基于已上传资料生成</p>
              </div>
              <button
                onClick={handleRefreshGraph}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <RefreshIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 知识图谱 */}
            <KnowledgeGraph data={mockGraphData} loading={graphLoading} />
          </div>
        )}

        {activeSection === 'controversy' && (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">第二问：学术分歧挖掘</h2>
              <p className="text-sm text-gray-500 mt-1">AI自动分析资料中的学术争议</p>
            </div>

            <ControversyPanel controversies={mockControversies} loading={false} />
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
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            上传资料
          </button>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <GlobeIcon className="w-4 h-4" />
            <span>AI补充 (3篇)</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <DocumentIcon className="w-4 h-4" />
            <span>我的上传 (2个)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LearningSpace