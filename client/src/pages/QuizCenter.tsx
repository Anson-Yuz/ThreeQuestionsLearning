import { memo, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import QuizPlayer from '../components/business/QuizPlayer'
import RadarChart from '../components/business/RadarChart'
import { CheckCircleIcon, ArrowRightIcon } from '../components/ui/Icons'
import { threeAskApi } from '../api/threeAsk'

interface QuizItem {
  id: string
  dimension: string
  bloom_level: string
  difficulty: number
  question_type: string
  question: string
  options?: string[]
  correct_answer: string
  explanation?: string
}

const QuizCenter = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [submittingAll, setSubmittingAll] = useState(false)

  useEffect(() => {
    if (!courseId) return
    setLoading(true)
    threeAskApi.generateQuiz(courseId)
      .then((res) => setQuestions(res.quizzes as unknown as QuizItem[]))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [courseId])

  const handleBack = () => navigate(`/learning/${courseId}`)

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // 提交所有答案
      setSubmittingAll(true)
      try {
        const answerList = Object.entries(answers).map(([qid, ans]) => {
          const q = questions.find((q) => q.id === qid)
          return {
            questionId: qid,
            userAnswer: ans,
            correctAnswer: q?.correct_answer || '',
            isCorrect: ans === q?.correct_answer,
            dimension: q?.dimension || '',
            content: q?.question || '',
            explanation: q?.explanation || '',
            timeSpent: 0,
          }
        })

        const correct = answerList.filter((a) => a.isCorrect).length
        const dimScores: Record<string, number[]> = {}
        answerList.forEach((a) => {
          if (!dimScores[a.dimension]) dimScores[a.dimension] = []
          dimScores[a.dimension].push(a.isCorrect ? 100 : 0)
        })
        const abilityScores: Record<string, number> = {}
        Object.entries(dimScores).forEach(([dim, scores]) => {
          abilityScores[dim] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        })

        setSubmitted(true)
        setResults({
          correct,
          total: questions.length,
          radar: {
            dimensions: Object.keys(abilityScores).map((name) => ({ name, max: 100 })),
            values: Object.values(abilityScores),
            average: correct / questions.length * 100,
            strongest: '',
            weakest: '',
          },
        })
      } finally {
        setSubmittingAll(false)
      }
    }
  }, [currentIndex, questions, answers])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">暂无测评题目</p>
        <button onClick={handleBack} className="text-blue-500 underline">返回学习空间</button>
      </div>
    )
  }

  if (submitted && results) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col page-container">
        <NavBar title="测评结果" showBack onLeftClick={handleBack} />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">测评完成</h2>
              <p className="text-3xl font-bold text-blue-500">{results.correct}/{results.total}</p>
              <p className="text-sm text-gray-500">正确率 {Math.round((results.correct / results.total) * 100)}%</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">能力雷达图</h3>
            <RadarChart data={results.radar} size="large" />
          </div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col page-container">
      <NavBar title="测评中心" showBack onLeftClick={handleBack} rightText={`${currentIndex + 1}/${questions.length}`} />
      <div className="flex-1 overflow-y-auto">
        <QuizPlayer
          questions={questions}
          currentIndex={currentIndex}
          onAnswer={handleAnswer}
          onNext={submittingAll ? async () => {} : handleNext}
        />
      </div>
    </div>
  )
}

export default QuizCenter
