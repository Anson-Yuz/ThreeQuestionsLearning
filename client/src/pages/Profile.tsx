import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PersonIcon,
  UploadIcon,
  DownloadIcon,
  GearIcon,
  ChevronRightIcon,
} from '../components/ui/Icons'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useCourseStore } from '../stores/courseStore'
import toast from 'react-hot-toast'

const Profile = () => {
  const { courses, fetchCourses } = useCourseStore()
  const navigate = useNavigate()
  const activeCount = courses.filter((c) => c.status === 'active' || c.status === 'completed').length
  const completedCount = courses.filter((c) => c.status === 'completed').length
  const [weeklyTrend, setWeeklyTrend] = useState<{ day: string; value: number }[]>([])

  useEffect(() => {
    fetchCourses()
    fetchWeeklyTrend()
  }, [])

  const fetchWeeklyTrend = async () => {
    try {
      const res = await fetch('/api/user/weekly-trend')
      const data = await res.json()
      setWeeklyTrend(data.trend || [])
    } catch {
      console.error('获取周趋势失败')
    }
  }

  // 资料上传历史
  const handleUploadHistory = () => {
    navigate('/upload-history')
  }

  // 数据导出
  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) throw new Error('导出失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `learning_data_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('数据已导出')
    } catch {
      toast.error('数据导出功能暂不可用')
    }
  }

  // 设置
  const handleSettings = () => {
    navigate('/settings')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />

      {/* 头部 */}
      <div className="bg-white dark:bg-gray-900">
        <div className="page-container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <PersonIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">学习者</h1>
                <p className="text-sm text-gray-500">
                  {activeCount > 0 ? `学习中 ${activeCount} 个课程` : '开始你的第一个课程吧'}
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* 内容区 — 统一留白，卡片间距一致 */}
      <div className="page-container pt-6 pb-8 space-y-4">

        {/* 学习数据 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">学习数据</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeCount}</div>
              <div className="text-blue-500/60 dark:text-blue-400/60 text-sm mt-1">课程数量</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
              <div className="text-green-500/60 dark:text-green-400/60 text-sm mt-1">已完成</div>
            </div>
          </div>
        </div>

        {/* 周学习趋势 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">周学习趋势</h2>
           <div className="flex items-end justify-between h-28 gap-1.5 px-1">
            {weeklyTrend.length > 0 && weeklyTrend.some(item => item.value > 0) ? (
              weeklyTrend.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md"
                    style={{ height: `${item.value * 100}%`, minHeight: 4 }}
                  />
                  <span className="text-[11px] text-gray-400 font-medium">{item.day}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 self-center w-full text-center">暂无学习记录</p>
            )}
          </div>
        </div>

        {/* 功能列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          <FunctionItem icon={<UploadIcon className="w-5 h-5" />} label="资料上传历史" onClick={handleUploadHistory} />
          <FunctionItem icon={<DownloadIcon className="w-5 h-5" />} label="数据导出" onClick={handleExportData} />
          <FunctionItem icon={<GearIcon className="w-5 h-5" />} label="设置" onClick={handleSettings} />
        </div>
      </div>
    </div>
  )
}

const FunctionItem = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button onClick={onClick} className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
    <span className="text-blue-500 w-6 flex justify-center">{icon}</span>
    <span className="flex-1 text-left text-gray-900 dark:text-white text-[15px]">{label}</span>
    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
  </button>
)

export default Profile