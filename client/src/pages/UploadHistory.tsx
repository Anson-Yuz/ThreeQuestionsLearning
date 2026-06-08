import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UploadRecord {
  id: string
  title: string
  file_path: string
  course_title: string
  created_at: number
}

const UploadHistory = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/user/uploads')
      .then((res) => res.json())
      .then((data) => setUploads(data.uploads || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

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
            资料上传历史
          </h1>
        </div>
      </div>

      {/* 内容区 */}
      <div className="page-container pt-4 pb-8">
        {loading ? (
          <p className="text-center text-gray-400 mt-8">加载中…</p>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">暂无上传记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-white">{item.title || '未命名文档'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  所属课程：{item.course_title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(item.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadHistory