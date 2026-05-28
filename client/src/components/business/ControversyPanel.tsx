import { memo, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, MessageIcon } from '../ui/Icons'

interface Controversy {
  id: string
  topic: string
  pro_view: string
  pro_evidence: string
  con_view: string
  con_evidence: string
  confidence: number
}

interface ControversyPanelProps {
  controversies: Controversy[]
  loading?: boolean
  onDiscussionClick?: (controversy: Controversy) => void
}

export const ControversyPanel = memo(({
  controversies,
  loading,
  onDiscussionClick,
}: ControversyPanelProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!controversies.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <MessageIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-2">暂无学术争议</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          上传更多资料后，AI将自动分析学术分歧点
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {controversies.map((controversy) => (
        <div
          key={controversy.id}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* 头部 */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {controversy.topic}
              </h3>
              <div className="flex items-center gap-2">
                <ConfidenceBadge confidence={controversy.confidence} />
                <button
                  onClick={() => setExpandedItem(
                    expandedItem === controversy.id ? null : controversy.id
                  )}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {expandedItem === controversy.id ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 正反方对比 */}
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
            {/* 正方 */}
            <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  正方观点
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {controversy.pro_view}
              </p>
              {expandedItem === controversy.id && controversy.pro_evidence && (
                <div className="mt-2 p-2 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-green-800 dark:text-green-300">
                    证据：{controversy.pro_evidence}
                  </p>
                </div>
              )}
            </div>

            {/* 反方 */}
            <div className="p-4 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  反方观点
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {controversy.con_view}
              </p>
              {expandedItem === controversy.id && controversy.con_evidence && (
                <div className="mt-2 p-2 bg-red-100/50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-red-800 dark:text-red-300">
                    证据：{controversy.con_evidence}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 讨论按钮 */}
          {onDiscussionClick && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => onDiscussionClick(controversy)}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <MessageIcon className="w-4 h-4" />
                参与讨论 ({(controversy.confidence * 100).toFixed(0)}% 关注度)
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

const ConfidenceBadge = ({ confidence }: { confidence: number }) => {
  const getColor = () => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColor()}`}>
      {(confidence * 100).toFixed(0)}% 置信
    </span>
  )
}

ControversyPanel.displayName = 'ControversyPanel'

export default ControversyPanel