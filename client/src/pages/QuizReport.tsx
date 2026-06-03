import { memo, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NavBar } from '../components/layout/NavBar'
import RadarChart from '../components/business/RadarChart'
import { useQuizStore } from '../stores/quizStore'

const dimLabels: Record<string, string> = {
  remember: '记忆', understand: '理解', apply: '应用',
  analyze: '分析', evaluate: '评价', create: '创造',
}

const QuizReport = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { answers, report } = useQuizStore()
  const [generatedReport, setGeneratedReport] = useState<any>(null)

  useEffect(() => {
    // 如果 store 中有 report，直接使用
    if (report) {
      setGeneratedReport(report)
      return
    }

    // 否则根据 answers 生成本地报告
    if (answers.length > 0) {
      const total = answers.length
      const correct = answers.filter((a) => a.isCorrect).length
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

      const dimScores: Record<string, number[]> = {}
      answers.forEach((a) => {
        if (!dimScores[a.dimension]) dimScores[a.dimension] = []
        dimScores[a.dimension].push(a.isCorrect ? 100 : 0)
      })

      const abilityScores: Record<string, number> = {}
      for (const [dim, scores] of Object.entries(dimScores)) {
        abilityScores[dim] = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      }

      const mistakes = answers
        .filter((a) => !a.isCorrect)
        .map((a) => ({
          question: a.question,
          userAnswer: a.userAnswer,
          correctAnswer: a.correctAnswer,
          explanation: a.explanation || '',
        }))

      const weakAreas = Object.entries(abilityScores)
        .filter(([, score]) => score < 60)
        .map(([dim]) => dimLabels[dim] || dim)

      setGeneratedReport({
        accuracy,
        totalQuestions: total,
        correctCount: correct,
        abilityScores,
        mistakes,
        suggestions: {
          weakAreas,
          studyTips: weakAreas.length > 0
            ? `建议加强${weakAreas.join('、')}维度的学习`
            : '整体表现良好，继续保持',
        },
        totalTime: 0,
        averageTime: 0,
      })
    }
  }, [answers, report])

  if (!generatedReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">暂无测评报告</p>
      </div>
    )
  }

  const radarData = {
    dimensions: Object.entries(generatedReport.abilityScores).map(([key]) => ({
      name: dimLabels[key] || key,
      max: 100,
    })),
    values: Object.values(generatedReport.abilityScores) as number[],
    average: generatedReport.accuracy / 100,
    strongest: '',
    weakest: '',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />
      <NavBar
        title="测评报告"
        showBack
        onLeftClick={() => navigate(`/quiz/${courseId}`)}
      />

      <div className="page-container pt-4 pb-24 space-y-4">
        {/* 总览卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">测评结果</h2>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  className="text-blue-500"
                  strokeDasharray={`${(generatedReport.accuracy / 100) * 339.3} 339.3`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{generatedReport.accuracy}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{generatedReport.totalQuestions}</p>
              <p className="text-xs text-gray-500">总题数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{generatedReport.correctCount}</p>
              <p className="text-xs text-gray-500">正确</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{generatedReport.totalQuestions - generatedReport.correctCount}</p>
              <p className="text-xs text-gray-500">错误</p>
            </div>
          </div>
        </div>

        {/* 能力雷达图 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">能力维度</h3>
          <RadarChart data={radarData} />
        </div>

        {/* 学习建议 */}
        {generatedReport.suggestions && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">学习建议</h3>
            <p className="text-sm text-gray-500">{generatedReport.suggestions.studyTips}</p>
            {generatedReport.suggestions.weakAreas?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {generatedReport.suggestions.weakAreas.map((area: string) => (
                  <span key={area} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs">
                    薄弱: {area}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 错题回顾 */}
        {generatedReport.mistakes?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              错题回顾 ({generatedReport.mistakes.length}题)
            </h3>
            <div className="space-y-3">
              {generatedReport.mistakes.map((m: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-sm text-gray-900 dark:text-white mb-1">{m.question}</p>
                  <p className="text-xs text-red-500">你的答案: {m.userAnswer}</p>
                  <p className="text-xs text-green-500">正确答案: {m.correctAnswer}</p>
                  {m.explanation && (
                    <p className="text-xs text-gray-400 mt-1">{m.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate(`/learning/${courseId}`)}
            className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          >
            返回学习
          </button>
          <button
            onClick={() => navigate(`/quiz/${courseId}/play`)}
            className="flex-1 py-3 rounded-xl bg-blue-500 text-white"
          >
            重新测试
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(QuizReport)
