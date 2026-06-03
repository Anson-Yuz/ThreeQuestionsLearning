import { memo } from 'react'
import { GlobeIcon, DocumentIcon } from '../ui/Icons'
import { Document } from '../../api/knowledge'

interface Props {
  documents: Document[]
  loading: boolean
}

const KnowledgeBase = memo(({ documents, loading }: Props) => {
  const userDocs = documents.filter(
    (d) => (d.source_type || d.source) !== 'web_discover'
  )
  const webDocs = documents.filter(
    (d) => d.source_type === 'web_discover'
  )

  const renderGroup = (
    docs: Document[],
    icon: React.ReactNode,
    label: string
  ) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">
        {icon}
        <span>
          {label} ({docs.length})
        </span>
      </div>
      {docs.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">暂无</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 flex-1">
                  {doc.title}
                </span>
                {(doc.source_url) && (
                  <a
                    href={doc.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline ml-2 flex-shrink-0"
                  >
                    来源
                  </a>
                )}
              </div>
              {(doc.content_preview || doc.contentPreview) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {doc.content_preview || doc.contentPreview}
                </p>
              )}
              <span className="text-[11px] text-gray-400 mt-2 block">
                {new Date(doc.created_at || doc.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">加载中...</div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-gray-400">
        暂无资料，请上传或通过发现功能导入
      </div>
    )
  }

  return (
    <div>
      {renderGroup(webDocs, <GlobeIcon className="w-4 h-4" />, 'AI 补充资料')}
      {renderGroup(userDocs, <DocumentIcon className="w-4 h-4" />, '我的上传')}
    </div>
  )
})

KnowledgeBase.displayName = 'KnowledgeBase'
export default KnowledgeBase
