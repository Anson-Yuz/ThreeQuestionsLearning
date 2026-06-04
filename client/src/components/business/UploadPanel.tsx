import { useState, useRef, useCallback, DragEvent } from 'react'
import { DocumentIcon, XIcon, UploadIcon } from '../ui/Icons'

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.md', '.txt']
const ALLOWED_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/markdown': '.md',
  'text/plain': '.txt',
}
const MAX_SIZE = 20 * 1024 * 1024  // 20MB

interface UploadPanelProps {
  courseId: string
  onUploaded?: () => void
}

export const UploadPanel = ({ courseId, onUploaded }: UploadPanelProps) => {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndAdd = useCallback((incoming: File[]) => {
    setError('')
    const accepted: File[] = []
    for (const f of incoming) {
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase()
      const mimeOk = f.type in ALLOWED_MIME
      const extOk = ALLOWED_EXTS.includes(ext)
      if (!mimeOk && !extOk) {
        setError(`不支持的格式: ${f.name}`)
        continue
      }
      if (f.size > MAX_SIZE) {
        setError(`文件过大 (>20MB): ${f.name}`)
        continue
      }
      accepted.push(f)
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted])
    }
  }, [])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    validateAndAdd(selected)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [validateAndAdd])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files || [])
    validateAndAdd(dropped)
  }, [validateAndAdd])

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const upload = async () => {
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('course_id', courseId)
        formData.append('files', file, file.name)
        const res = await fetch(`/api/knowledge/upload-files?course_id=${courseId}`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || '上传失败')
        }
      }
      setFiles([])
      onUploaded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const openPicker = () => fileInputRef.current?.click()

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-2">
      <div
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.md,.txt"
          onChange={onFileChange}
          className="hidden"
        />
        <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          拖拽文件到此处，或<span className="text-blue-500 ml-1">点击选择</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          支持 PDF / Word / Markdown / TXT，单个 ≤ 20MB
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <DocumentIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{formatSize(f.size)}</p>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="p-1 text-gray-400 hover:text-red-500"
                aria-label="移除"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={upload}
            disabled={uploading}
            className="w-full py-2 bg-blue-500 text-white text-sm rounded-lg font-medium disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {uploading ? '上传中…' : `上传 ${files.length} 个文件`}
          </button>
        </div>
      )}
    </div>
  )
}

export default UploadPanel
