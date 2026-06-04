import { memo, useState, useCallback } from 'react'
import { CheckCircleIcon, ChevronRightIcon } from '../ui/Icons'

interface QuizPlayerProps {
  questions: any[]
  currentIndex: number
  onAnswer: (questionId: string, answer: string) => void
  onNext: () => void
}

const dimensionColors: Record<string, string> = {
  remember: 'bg-purple-500',
  understand: 'bg-blue-500',
  apply: 'bg-green-500',
  analyze: 'bg-orange-500',
  evaluate: 'bg-red-500',
  create: 'bg-pink-500',
}

const QuizPlayer = memo(({ questions, currentIndex, onAnswer, onNext }: QuizPlayerProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const question = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleSelectAnswer = useCallback((answer: string) => {
    setSelectedAnswer(answer)
    onAnswer(question.id, answer)
  }, [question.id, onAnswer])

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>题目 {currentIndex + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 维度标签 */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`${dimensionColors[question.dimension]} text-white text-xs px-2 py-1 rounded`}>
          {question.dimension}
        </span>
        <span className="text-xs text-gray-400">
          难度: {['入门', '简单', '中等', '困难', '挑战'][Math.round(question.difficulty * 4)]}
        </span>
      </div>

      {/* 题目卡片 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {question.question}
        </h3>

        {/* 选择题选项 */}
        {question.options && (
          <div className="space-y-3">
            {question.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === option
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/30'
                      : 'bg-gray-50 border-2 border-transparent dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-gray-700 dark:text-gray-200 break-words min-w-0 flex-1 leading-6 pt-1">
                      {option}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 简答题/编程题 */}
        {!question.options && (
          <textarea
            value={selectedAnswer}
            onChange={(e) => handleSelectAnswer(e.target.value)}
            placeholder="请输入你的答案..."
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 resize-none focus:border-blue-500 focus:outline-none"
            rows={6}
          />
        )}
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={onNext}
        disabled={!selectedAnswer}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
      >
        {currentIndex === questions.length - 1 ? '提交测评' : '下一题'}
      </button>
    </div>
  )
})

QuizPlayer.displayName = 'QuizPlayer'

export default QuizPlayer