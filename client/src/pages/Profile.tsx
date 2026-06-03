import { useEffect } from 'react'
import {
  PersonIcon,
  ArchiveIcon,
  UploadIcon,
  DownloadIcon,
  GearIcon,
  ChevronRightIcon,
} from '../components/ui/Icons'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useCourseStore } from '../stores/courseStore'

const Profile = () => {
  const { courses, fetchCourses } = useCourseStore()
  const activeCount = courses.filter((c) => c.status === 'active' || c.status === 'completed').length
  const completedCount = courses.filter((c) => c.status === 'completed').length

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

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

      {/* 学习数据 — iOS 分组卡片 */}
      <div className="page-container mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
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
      </div>

      {/* 周学习趋势 */}
      <div className="page-container mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wide">周学习趋势</h2>
          <div className="flex items-end justify-between h-28 gap-1.5 px-1">
            {[
              { day: '周一', value: 0.45 },
              { day: '周二', value: 0.60 },
              { day: '周三', value: 0.30 },
              { day: '周四', value: 0.90 },
              { day: '周五', value: 0.40 },
              { day: '周六', value: 0.75 },
              { day: '周日', value: 0.55 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md"
                  style={{ height: `${item.value * 100}%`, minHeight: 4 }}
                />
                <span className="text-[11px] text-gray-400 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 功能列表 — iOS grouped tableview 风格 */}
      <div className="page-container mt-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          <FunctionItem icon={<ArchiveIcon className="w-5 h-5" />} label="课程归档" />
          <FunctionItem icon={<UploadIcon className="w-5 h-5" />} label="资料上传历史" />
          <FunctionItem icon={<DownloadIcon className="w-5 h-5" />} label="数据导出" />
          <FunctionItem icon={<GearIcon className="w-5 h-5" />} label="设置" />
        </div>
      </div>
    </div>
  )
}

const FunctionItem = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
    <span className="text-blue-500 w-6 flex justify-center">{icon}</span>
    <span className="flex-1 text-left text-gray-900 dark:text-white text-[15px]">{label}</span>
    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
  </button>
)

export default Profile
