import { memo, useEffect } from 'react'
import {
  PersonIcon,
  ArchiveIcon,
  UploadIcon,
  DownloadIcon,
  GearIcon,
  ChevronRightIcon,
  ClockIcon,
  BookIcon,
} from '../components/ui/Icons'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useCourseStore } from '../stores/courseStore'

const Profile = () => {
  const { courses, fetchCourses } = useCourseStore()
  const activeCount = courses.filter((c) => c.status === 'active' || c.status === 'completed').length

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />

      {/* 头部 */}
      <div className="bg-white dark:bg-gray-900">
        <div className="page-container py-6 flex items-center justify-between">
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

      {/* 学习数据 */}
      <div className="page-container mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">学习数据</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">{activeCount}</div>
              <div className="text-blue-100 text-sm">课程数量</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">{courses.filter((c) => c.status === 'completed').length}</div>
              <div className="text-green-100 text-sm">已完成</div>
            </div>
          </div>
        </div>
      </div>

      {/* 周学习趋势 — 修复"周周周"：完整显示日名称 */}
      <div className="page-container mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">周学习趋势</h2>
          <div className="flex items-end justify-between h-24 gap-1">
            {[
              { day: '周一', value: 0.45 },
              { day: '周二', value: 0.60 },
              { day: '周三', value: 0.30 },
              { day: '周四', value: 0.90 },
              { day: '周五', value: 0.40 },
              { day: '周六', value: 0.75 },
              { day: '周日', value: 0.55 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                  style={{ height: `${item.value * 100}%` }}
                />
                <span className="text-[10px] text-gray-400">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 功能列表 — iOS 风格 */}
      <div className="page-container mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon={<ArchiveIcon className="w-5 h-5" />} title="课程归档" />
          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />
          <MenuItem icon={<UploadIcon className="w-5 h-5" />} title="资料上传历史" />
          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />
          <MenuItem icon={<DownloadIcon className="w-5 h-5" />} title="数据导出" />
          <div className="border-t border-gray-100 dark:border-gray-700 mx-4" />
          <MenuItem icon={<GearIcon className="w-5 h-5" />} title="设置" />
        </div>
      </div>
    </div>
  )
}

const MenuItem = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <button className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
    <span className="text-blue-500">{icon}</span>
    <span className="flex-1 text-left text-gray-900 dark:text-white text-sm">{title}</span>
    <ChevronRightIcon className="w-5 h-5 text-gray-300" />
  </button>
)

export default Profile
