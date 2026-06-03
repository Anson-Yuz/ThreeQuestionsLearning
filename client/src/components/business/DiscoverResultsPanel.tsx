import { useState } from 'react'
import { XIcon } from '../ui/Icons'
import { DiscoverResult } from '../../api/discover'

interface Props {
  results: DiscoverResult[]
  onImport: (urls: string[]) => void
  onClose: () => void
  loading?: boolean
}

const ScoreBadge = ({ score }: { score: number }) => {
  const stars = Math.round(score / 2)
  return (
    <span className="text-yellow-500 text-xs">
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  )
}

const DiscoverResultsPanel = ({ results, onImport, onClose, loading }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((r) => r.url)))
    }
  }

  const handleImport = () => {
    if (selected.size === 0) return
    setImporting(true)
    onImport(Array.from(selected))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              发现互联网资料
            </span>
            <span className="text-xs text-gray-400">({results.length} 条)</span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 全选 */}
        <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700/50">
          <button onClick={selectAll} className="text-xs text-blue-500">
            {selected.size === results.length ? '取消全选' : '全选'}
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-gray-400">搜索中...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="text-gray-400">未找到相关资料</span>
            </div>
          ) : (
            results.map((item) => (
              <label
                key={item.url}
                className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.url)}
                  onChange={() => toggle(item.url)}
                  className="mt-0.5 w-4 h-4 text-blue-500 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                    >
                      {item.title}
                    </a>
                    <ScoreBadge score={item.score} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.snippet}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
          <button
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl font-medium disabled:opacity-40"
          >
            {importing ? '导入中...' : `导入选中 (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiscoverResultsPanel
