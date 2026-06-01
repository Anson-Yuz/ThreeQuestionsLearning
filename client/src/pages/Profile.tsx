import { memo } from 'react'
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

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* 状态栏占位 */}
      <div className="h-11 bg-white dark:bg-gray-900" />

      {/* 头部 - 与内容区域边距一致 */}
      <div className="bg-white dark:bg-gray-900">
        <div className="page-container py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <PersonIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">学习者</h1>
              <p className="text-sm text-gray-500">学习中 4 个课程</p>
            </div>
          </div>
        </div>
      </div>

      {/* 学习数据 */}
      <div className="mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">学习数据</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">8.5h</div>
              <div className="text-blue-100 text-sm">本周学习</div>
              <div className="text-xs text-blue-200 mt-1">↑ 12%</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">12</div>
              <div className="text-green-100 text-sm">学习次数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 周学习趋势 */}
      <div className="mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">周学习趋势</h2>
          <div className="flex items-end justify-between h-24 gap-1">
            {[
              { day: '周一', hours: 0.75 },
              { day: '周二', hours: 1 },
              { day: '周三', hours: 0.5 },
              { day: '周四', hours: 1.5 },
              { day: '周五', hours: 0.67 },
              { day: '周六', hours: 1.25 },
              { day: '周日', hours: 0.92 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                  style={{ height: `${item.hours * 60}%` }}
                />
                <span className="text-[10px] text-gray-400">{item.day.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <MenuItem icon={<ArchiveIcon className="w-5 h-5" />} title="课程归档" />
          <div className="border-t border-gray-100 dark:border-gray-700" />
          <MenuItem icon={<UploadIcon className="w-5 h-5" />} title="资料上传历史" />
          <div className="border-t border-gray-100 dark:border-gray-700" />
          <MenuItem icon={<DownloadIcon className="w-5 h-5" />} title="数据导出" />
          <div className="border-t border-gray-100 dark:border-gray-700" />
          <MenuItem icon={<GearIcon className="w-5 h-5" />} title="设置" />
        </div>
      </div>

      {/* 能力对比 */}
      <div className="mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">能力对比</h2>
          <div className="space-y-3">
            {[
              { name: '概念理解', value: 80 },
              { name: '批判思维', value: 60 },
              { name: '实践迁移', value: 40 },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <span className="w-10 text-sm text-gray-500 text-right">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const MenuItem = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <button className="w-full px-4 py-3 flex items-center gap-3 active:bg-gray-50 dark:active:bg-gray-700 transition-colors">
    <span className="text-gray-500">{icon}</span>
    <span className="flex-1 text-left text-gray-900 dark:text-white">{title}</span>
    <ChevronRightIcon className="w-5 h-5 text-gray-300" />
  </button>
)

export default Profile