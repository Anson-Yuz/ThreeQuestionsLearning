import { memo, useState, useCallback, useEffect } from 'react'
import { CheckCircleIcon, XIcon } from '../ui/Icons'

interface QuizPlayerProps {
  questions: any[]
  currentIndex: number
  onAnswer: (questionId: string, answer: string, isCorrect: boolean) => void
  onNext: () => void
}

const dimensionColors: Record<string, string> = {
  记忆: 'bg-purple-500',
  理解: 'bg-blue-500',
  应用: 'bg-green-500',
  分析: 'bg-orange-500',
  评价: 'bg-red-500',
  创造: 'bg-pink-500',
}

const QuizPlayer = memo(({ questions, currentIndex, onAnswer, onNext }: QuizPlayerProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [showFeedback, setShowFeedback] = useState(false)
  const question = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  // 题目切换时立即重置答题状态
  useEffect(() => {
    setSelectedIndex(-1)
    setShowFeedback(false)
  }, [currentIndex])

  // 从题目对象直接取 correctIndex（已在前端 normalizeQuiz规范化为数字）
  const correctIndex = Number(question.correctIndex ?? question.correct_index ?? 0)
  const correctAnswer = String.fromCharCode(65 + correctIndex) // "A", "B", "C", "D"
  const isCorrect = selectedIndex === correctIndex

  const handleSelectAnswer = useCallback((option: string, index: number) => {
    if (showFeedback) return
    const letter = String.fromCharCode(65 + index)
    const isCorrectAnswer = index === correctIndex
    console.log('[QuizPlayer] 选择:', {
      option,
      index,
      letter,
      correctIndex,
      correctAnswer,
      isCorrect: isCorrectAnswer,
      questionId: question.id,
    })
    setSelectedIndex(index)
    setShowFeedback(true)
    //传入 isCorrect，让父组件直接使用
    onAnswer(question.id, letter, isCorrectAnswer)
  }, [question.id, onAnswer, showFeedback, correctIndex, correctAnswer])

  const handleNext = useCallback(() => {
    setSelectedIndex(-1)
    setShowFeedback(false)
    onNext()
  }, [onNext])

  const getOptionClass = (index: number) => {
    if (!showFeedback) {
      return selectedIndex === index
        ? 'bg-blue-100 border-2 border-blue-500 dark:bg-blue-900/30'
        : 'bg-gray-50 border-2 border-transparent dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
    }
    if (index === correctIndex) {
      return 'bg-green-100 border-2 border-green-500 dark:bg-green-900/30'
    }
    if (selectedIndex === index && index !== correctIndex) {
      return 'bg-red-100 border-2 border-red-500 dark:bg-red-900/30'
    }
    return 'bg-gray-50 border-2 border-transparent dark:bg-gray-700 opacity-60'
  }

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
        <span className={`${dimensionColors[question.dimension] || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded`}>
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
              const letter = String.fromCharCode(65 + index)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option, index)}
                  disabled={showFeedback}
                  className={`w-full p-4 rounded-xl text-left transition-all ${getOptionClass(index)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      showFeedback
                        ? index === correctIndex
                          ? 'bg-green-500 text-white'
                          : index === selectedIndex
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        : selectedIndex === index
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {letter}
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
            placeholder="请输入你的答案..."
            className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 resize-none focus:border-blue-500 focus:outline-none"
            rows={6}
          />
        )}

        {/* 即时反馈区域 */}
        {showFeedback && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">回答正确！</span>
                </>
              ) : (
                <>
                  <XIcon className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">回答错误</span>
                </>
              )}
            </div>
            {question.explanation && (
              <p className="text-sm text-gray-600 dark:text-gray-300">{question.explanation}</p>
            )}
          </div>
        )}
      </div>

      {/* 下一题按钮 */}
      <button
        onClick={handleNext}
        disabled={!showFeedback}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all"
      >
        {currentIndex === questions.length - 1 ? '提交测评' : '下一题'}
      </button>
    </div>
  )
})

QuizPlayer.displayName = 'QuizPlayer'

export default QuizPlayer