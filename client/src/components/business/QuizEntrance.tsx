import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon, ArrowRightIcon } from '../ui/Icons'

interface QuizEntranceProps {
  courseId: string
}

const QuizEntrance = memo(({ courseId }: QuizEntranceProps) => {
  const navigate = useNavigate()

  const handleStartQuiz = () => {
    navigate(`/quiz/${courseId}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          准备开始测评
        </h3>
        <p className="text-sm text-gray-500">
          基于布鲁姆六维度认知层级，检验你的学习效果
        </p>
      </div>

      {/* 测评说明 */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>记忆层级 - 选择题/填空题</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>理解层级 - 简答题</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>应用层级 - 编程题</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>分析层级 - 案例分析</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>评价层级 - 论述题</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            <span>创造层级 - 项目设计</span>
          </div>
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        onClick={handleStartQuiz}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all active:scale-[0.98]"
      >
        <span>开始测评</span>
        <ArrowRightIcon className="w-5 h-5" />
      </button>

      {/* 提示 */}
      <p className="text-xs text-gray-400 text-center mt-3">
        测评约需5-10分钟，完成后可查看能力雷达图
      </p>
    </div>
  )
})

QuizEntrance.displayName = 'QuizEntrance'

export default QuizEntrance