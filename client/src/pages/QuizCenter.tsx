import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import QuizPlayer from '../components/business/QuizPlayer'
import RadarChart from '../components/business/RadarChart'
import EmptyState from '../components/ui/EmptyState'
import { CheckCircleIcon, ArrowRightIcon } from '../components/ui/Icons'
import { coursesApi } from '../api/courses'

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
  const [errorMsg, setErrorMsg] = useState('')
  const [quizSource, setQuizSource] = useState<'cache' | 'quick' | 'llm'>('quick')

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // 缓存优先 + SSE 深度题替换
  const loadQuiz = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setErrorMsg('')

    // 1. 优先读取缓存
    try {
      const cacheRes = await coursesApi.getCachedQuizzes(courseId)
      if (cacheRes.status === 'ready' && cacheRes.data?.length > 0) {
        if (mountedRef.current) {
          setQuestions(cacheRes.data as unknown as QuizItem[])
          setQuizSource('cache')
          setLoading(false)
          return
        }
      }
    } catch (e) {
      console.error('读取缓存失败', e)
    }

    // 2. 无缓存，请求快速题作为占位
    try {
      const quickRes = await coursesApi.getQuickQuiz(courseId)
      if (quickRes.questions?.length > 0 && mountedRef.current) {
        setQuestions(quickRes.questions as unknown as QuizItem[])
        setQuizSource('quick')
        setLoading(false)
      } else {
        setErrorMsg('暂无资料，请先上传文档')
        setLoading(false)
        return
      }
    } catch (e) {
      console.error('快速题请求失败', e)
      setErrorMsg('加载失败，请重试')
      setLoading(false)
      return
    }

    // 3. 建立 SSE，等待深度题生成后替换
    const es = new EventSource(`/api/sse/stream/${courseId}`)
    es.addEventListener('quiz_ready', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        if (payload?.quizzes?.length > 0 && mountedRef.current) {
          setQuestions(payload.quizzes as unknown as QuizItem[])
          setQuizSource('llm')
          setLoading(false)
          es.close()
        }
      } catch {}
    })

    // 60秒超时兜底
    const timer = setTimeout(() => {
      es.close()
      if (mountedRef.current && loading) {
        setLoading(false)
      }
    }, 60000)

    return () => {
      clearTimeout(timer)
      es.close()
    }
  }, [courseId])

  useEffect(() => {
    loadQuiz()
  }, [loadQuiz])

  const handleBack = () => navigate(`/learning/${courseId}`)

  const handleAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleNext = useCallback(async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
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

        // 调用后端 API 提交测评
        let reportData = null
        try {
          reportData = await coursesApi.completeQuiz(courseId!, answerList)
          console.log('[QuizCenter] 后端报告:', reportData)
        } catch (e) {
          console.warn('[QuizCenter] 后端提交失败，使用本地计算:', e)
        }

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
          correct: reportData?.correctCount ?? correct,
          total: reportData?.totalQuestions ?? questions.length,
          radar: {
            dimensions: Object.keys(reportData?.abilityScores ?? abilityScores).map((name) => ({ name, max: 100 })),
            values: Object.values(reportData?.abilityScores ?? abilityScores),
            average: (reportData?.accuracy ?? (correct / questions.length * 100)),
            strongest: '',
            weakest: '',
          },
        })
      } finally {
        setSubmittingAll(false)
      }
    }
  }, [currentIndex, questions, answers, courseId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
        <NavBar title="测评中心" showBack onLeftClick={handleBack} />
        <EmptyState title="载入中…" loading />
      </div>
    )
  }

  if (questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
        <NavBar title="测评中心" showBack onLeftClick={handleBack} />
        <EmptyState
          title={errorMsg || "暂无测评"}
          description={errorMsg ? "请检查网络或稍后重试" : "先学习相关课程，测评将自动生成"}
          action="重试"
          onAction={loadQuiz}
        />
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
