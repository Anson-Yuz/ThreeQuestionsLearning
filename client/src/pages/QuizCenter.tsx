import { memo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import QuizPlayer from '../components/business/QuizPlayer'
import RadarChart from '../components/business/RadarChart'
import { CheckCircleIcon, ArrowRightIcon } from '../components/ui/Icons'

// 模拟题目数据
const mockQuestions = [
  {
    id: '1',
    dimension: '记忆',
    bloom_level: 'remember',
    difficulty: 0.2,
    question_type: 'multiple_choice',
    question: 'JavaScript的基本数据类型包括哪些？',
    options: ['number, string, boolean', 'array, object', 'function, symbol', 'all of above'],
    correct_answer: 'D',
  },
  {
    id: '2',
    dimension: '理解',
    bloom_level: 'understand',
    difficulty: 0.4,
    question_type: 'short_answer',
    question: '请解释JavaScript闭包的概念，并举例说明其用途。',
    correct_answer: '闭包是指函数能够访问其词法作用域外部的变量...',
  },
  {
    id: '3',
    dimension: '应用',
    bloom_level: 'apply',
    difficulty: 0.6,
    question_type: 'coding',
    question: '请实现一个防抖函数 debounce',
    options: undefined,
    correct_answer: 'function debounce(fn, delay) {...}',
  },
]

const QuizCenter = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleBack = () => {
    navigate(`/learning/${courseId}`)
  }

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleNext = useCallback(() => {
    if (currentIndex < mockQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // 提交
      setSubmitted(true)
      setResults({
        correct: 2,
        total: 3,
        radar: {
          dimensions: [
            { name: '记忆', max: 100 },
            { name: '理解', max: 100 },
            { name: '应用', max: 100 },
            { name: '分析', max: 100 },
            { name: '评价', max: 100 },
            { name: '创造', max: 100 },
          ],
          values: [85, 60, 75, 45, 30, 20],
          average: 52.5,
          strongest: '记忆',
          weakest: '创造',
        },
      })
    }
  }, [currentIndex])

  if (submitted && results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
        <NavBar title="测评结果" showBack onLeftClick={handleBack} />

        <div className="flex-1 overflow-y-auto p-4">
          {/* 结果概览 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                测评完成
              </h2>
              <p className="text-3xl font-bold text-blue-500">
                {results.correct}/{results.total}
              </p>
              <p className="text-sm text-gray-500">
                正确率 {Math.round((results.correct / results.total) * 100)}%
              </p>
            </div>
          </div>

          {/* 能力雷达图 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              能力雷达图
            </h3>
            <RadarChart data={results.radar} size="large" />
          </div>

          {/* 下一步 */}
          <button
            onClick={handleBack}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <span>返回学习空间</span>
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <NavBar
        title="测评中心"
        showBack
        onLeftClick={handleBack}
        rightText="历史"
      />

      <div className="flex-1 overflow-y-auto">
        <QuizPlayer
          questions={mockQuestions}
          currentIndex={currentIndex}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </div>
    </div>
  )
}

export default QuizCenter