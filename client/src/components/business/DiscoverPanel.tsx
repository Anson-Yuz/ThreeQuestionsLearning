import { useState, useCallback } from 'react'
import { SearchIcon, UploadIcon, XIcon } from '../ui/Icons'
import { discoverApi, DiscoverResult } from '../../api/discover'

interface DiscoverPanelProps {
  courseId: string
  results: DiscoverResult[]
  visible: boolean
  onClose: () => void
  onImportComplete: () => void
  onReSearch: () => void
}

const ScoreBadge = ({ score }: { score: number }) => {
  const stars = Math.round(score / 2)
  return (
    <span className="text-yellow-500 text-xs">
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  )
}

const DiscoverPanel = ({
  courseId,
  results,
  visible,
  onClose,
  onImportComplete,
  onReSearch,
}: DiscoverPanelProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState('')

  const toggle = useCallback((url: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }, [])

  const selectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((r) => r.url)))
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    setImportStatus('导入中...')
    try {
      const urls = Array.from(selected)
      const res = await discoverApi.importUrls(urls, '', courseId)
      setImportStatus(`成功 ${res.imported}，失败 ${res.failed}`)
      setSelected(new Set())
      onImportComplete()
    } catch {
      setImportStatus('导入失败，请重试')
    }
    setImporting(false)
  }

  if (!visible) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-900 overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SearchIcon className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            发现互联网资料
          </span>
          <span className="text-xs text-gray-400">({results.length} 条)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReSearch}
            className="text-xs text-blue-500 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            重新搜索
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 全选 */}
      <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700/50">
        <button
          onClick={selectAll}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          {selected.size === results.length ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 结果列表 */}
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
        {results.map((item) => (
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
        ))}
      </div>

      {/* 导入按钮 */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={handleImport}
          disabled={selected.size === 0 || importing}
          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-xl font-medium disabled:opacity-40 flex items-center gap-2"
        >
          <UploadIcon className="w-4 h-4" />
          {importing ? '导入中...' : `导入选中 (${selected.size})`}
        </button>
        {importStatus && (
          <span className="text-xs text-gray-500">{importStatus}</span>
        )}
      </div>
    </div>
  )
}

export default DiscoverPanel
