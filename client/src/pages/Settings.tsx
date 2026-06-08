import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'

const Settings = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="h-11 bg-white dark:bg-gray-900" />

      {/* 顶部导航栏 */}
      <div className="bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="page-container h-14 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800 rounded-full transition-colors text-xl"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white ml-1">
            设置
          </h1>
        </div>
      </div>

      {/* 内容区 */}
      <div className="page-container pt-4 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-gray-900 dark:text-white text-[15px]">
              深色模式
            </span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings