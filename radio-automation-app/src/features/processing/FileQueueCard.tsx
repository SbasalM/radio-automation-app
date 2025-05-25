import { RefreshCw, Trash2, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileStatus } from '@/types/file'
import { useShowStore } from '@/store/show-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { watchService } from '@/services/watch-service'
import type { QueuedFile } from '@/types/file'

interface FileQueueCardProps {
  title: string
  status: FileStatus
  files: QueuedFile[]
  emptyMessage: string
}

export function FileQueueCard({ title, status, files, emptyMessage }: FileQueueCardProps) {
  const { getShow } = useShowStore()
  const { removeFile } = useFileQueueStore()

  const getStatusColor = () => {
    switch (status) {
      case FileStatus.PENDING:
        return 'border-yellow-200 dark:border-yellow-800'
      case FileStatus.PROCESSING:
        return 'border-blue-200 dark:border-blue-800'
      case FileStatus.COMPLETED:
        return 'border-green-200 dark:border-green-800'
      case FileStatus.FAILED:
        return 'border-red-200 dark:border-red-800'
      default:
        return 'border-gray-200 dark:border-gray-800'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case FileStatus.PENDING:
        return <Clock className="h-4 w-4 text-yellow-500" />
      case FileStatus.PROCESSING:
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />
      case FileStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case FileStatus.FAILED:
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${seconds}s`
  }

  const handleRetry = (fileId: string) => {
    watchService.retryFile(fileId)
  }

  const handleRemove = (fileId: string) => {
    if (confirm('Are you sure you want to remove this file from the queue?')) {
      removeFile(fileId)
    }
  }

  return (
    <Card className={`${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          {getStatusIcon()}
          <span>{title}</span>
          <span className="ml-auto bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
            {files.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {files.map((file) => {
              const show = getShow(file.showId)
              return (
                <div
                  key={file.id}
                  className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {file.filename}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {show?.name || 'Unknown Show'}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <span>Added: {formatTime(file.addedAt)}</span>
                        {file.processedAt && (
                          <span>
                            {status === FileStatus.COMPLETED ? 'Completed' : 'Failed'}: {formatTime(file.processedAt)}
                          </span>
                        )}
                        {file.processingTimeMs && (
                          <span>Duration: {formatDuration(file.processingTimeMs)}</span>
                        )}
                      </div>
                      {file.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                          {file.error}
                        </div>
                      )}
                      {file.outputPath && status === FileStatus.COMPLETED && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
                          → {file.outputPath}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-3">
                      {status === FileStatus.FAILED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(file.id)}
                          className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(file.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 