import { memo, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import { useQuizStore } from '../stores/quizStore'

const bloomLabels: Record<string, string> = {
  remember: '记忆', understand: '理解', apply: '应用',
  analyze: '分析', evaluate: '评价', create: '创造',
}

const QuizPlay = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { questions, answers, currentIndex, submitAnswer, nextQuestion, prevQuestion, setReport, setCourseId } = useQuizStore()
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (courseId) {
      setCourseId(courseId)
    }
  }, [courseId, setCourseId])

  const currentQuestion = questions[currentIndex]

  const handleSubmit = useCallback(() => {
    if (!selectedOption || !currentQuestion) return
    const isCorrect = selectedOption === currentQuestion.correctAnswer
    submitAnswer({
      questionId: currentQuestion.id,
      question: currentQuestion.content,
      userAnswer: selectedOption,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      dimension: currentQuestion.bloomLevel,
      timeSpent: 0,
      explanation: currentQuestion.explanation,
    })
    setShowResult(true)
  }, [selectedOption, currentQuestion, submitAnswer])

  const handleNext = useCallback(() => {
    setSelectedOption(null)
    setShowResult(false)
    if (currentIndex < questions.length - 1) {
      nextQuestion()
    } else {
      // 完成测评，跳转到报告页
      navigate(`/quiz/${courseId}/report`)
    }
  }, [currentIndex, questions.length, courseId, navigate, nextQuestion])

  const handlePrev = useCallback(() => {
    prevQuestion()
  }, [prevQuestion])

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">暂无题目</p>
          <button
            onClick={() => navigate(`/quiz/${courseId}`)}
            className="text-blue-500 underline"
          >
            返回测评中心
          </button>
        </div>
      </div>
    )
  }

  const dim = currentQuestion.bloomLevel
  const dimLabel = bloomLabels[dim] || dim
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />
      <NavBar
        title="答题"
        showBack
        onLeftClick={() => navigate(`/quiz/${courseId}`)}
      />

      {/* 进度条 */}
      <div className="bg-white dark:bg-gray-900 px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">{currentIndex + 1}/{questions.length}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            {dimLabel}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 题目内容 */}
      <div className="page-container pt-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
          <p className="text-lg text-gray-900 dark:text-white mb-6">
            {currentQuestion.content}
          </p>

          {/* 选项 */}
          <div className="space-y-3">
            {currentQuestion.options?.map((option: string, idx: number) => {
              const letter = String.fromCharCode(65 + idx)
              const isSelected = selectedOption === letter
              const isCorrectAnswer = letter === currentQuestion.correctAnswer

              let optionStyle = 'border-gray-200 dark:border-gray-700'
              if (showResult) {
                if (isCorrectAnswer) {
                  optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                }
              } else if (isSelected) {
                optionStyle = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }

              return (
                <button
                  key={idx}
                  onClick={() => !showResult && setSelectedOption(letter)}
                  disabled={showResult}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${optionStyle}`}
                >
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {letter}
                  </span>
                  <span className="text-gray-900 dark:text-white text-left">{option}</span>
                </button>
              )
            })}
          </div>

          {/* 结果显示 */}
          {showResult && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                {selectedOption === currentQuestion.correctAnswer ? '✅ 回答正确！' : '❌ 回答错误'}
              </p>
              <p className="text-sm text-gray-500">{currentQuestion.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40"
          >
            上一题
          </button>
          {!showResult ? (
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white disabled:opacity-40"
            >
              提交答案
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white"
            >
              {currentIndex < questions.length - 1 ? '下一题' : '查看报告'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(QuizPlay)
