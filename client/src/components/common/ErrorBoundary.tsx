import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 组件崩溃:', error.message, info.componentStack?.slice(0, 200))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="w-full h-[400px] bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex flex-col items-center justify-center gap-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">图谱渲染异常</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 text-xs text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
