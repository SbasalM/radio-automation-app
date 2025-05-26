import { Component } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-64 p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Component Error
          </h2>
          <p className="text-red-600 dark:text-red-300 text-center mb-4">
            Something went wrong while rendering this component.
          </p>
          {this.state.error && (
            <details className="max-w-full">
              <summary className="text-sm text-red-700 dark:text-red-300 cursor-pointer mb-2">
                Show Error Details
              </summary>
              <pre className="text-xs text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 p-3 rounded overflow-auto max-w-full">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
} 