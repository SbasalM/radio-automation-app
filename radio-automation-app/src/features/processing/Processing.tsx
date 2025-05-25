import { useState, useEffect } from 'react'
import { Activity, BarChart3, Play, Square } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQueueCard } from './FileQueueCard'
import { FileStatus } from '@/types/file'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useMonitoringStore } from '@/store/monitoring-store'
import { watchService } from '@/services/watch-service'

export function Processing() {
  const { 
    getFilesByStatus, 
    getTodayCompletedCount, 
    getTodaySuccessRate,
    cleanupOldFiles 
  } = useFileQueueStore()
  
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring 
  } = useMonitoringStore()

  const [refreshKey, setRefreshKey] = useState(0)

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
      cleanupOldFiles() // Clean up old completed files
    }, 5000)

    return () => clearInterval(interval)
  }, [cleanupOldFiles])

  // Start/stop watch service based on monitoring state
  useEffect(() => {
    if (isMonitoring) {
      watchService.start()
    } else {
      watchService.stop()
    }

    return () => {
      watchService.stop()
    }
  }, [isMonitoring])

  const pendingFiles = getFilesByStatus(FileStatus.PENDING)
  const processingFiles = getFilesByStatus(FileStatus.PROCESSING)
  const completedFiles = getFilesByStatus(FileStatus.COMPLETED)
  const failedFiles = getFilesByStatus(FileStatus.FAILED)

  const todayCompleted = getTodayCompletedCount()
  const successRate = getTodaySuccessRate()
  const totalQueued = pendingFiles.length + processingFiles.length

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring()
    } else {
      startMonitoring()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            File Processing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor and manage file processing queue
          </p>
        </div>
        <Button
          onClick={handleToggleMonitoring}
          variant={isMonitoring ? 'default' : 'outline'}
          className={isMonitoring ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isMonitoring ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Monitoring
            </>
          )}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalQueued}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isMonitoring ? 'Monitoring active' : 'Monitoring stopped'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {todayCompleted}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Files completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {successRate}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Today's success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Files</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failedFiles.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Status */}
      {!isMonitoring && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    File monitoring is currently stopped
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Click "Start Monitoring" to begin watching for new files automatically
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FileQueueCard
          title="Pending Files"
          status={FileStatus.PENDING}
          files={pendingFiles}
          emptyMessage="No files waiting to be processed"
        />

        <FileQueueCard
          title="Processing"
          status={FileStatus.PROCESSING}
          files={processingFiles}
          emptyMessage="No files currently being processed"
        />

        <FileQueueCard
          title="Completed"
          status={FileStatus.COMPLETED}
          files={completedFiles}
          emptyMessage="No files completed yet today"
        />

        <FileQueueCard
          title="Failed"
          status={FileStatus.FAILED}
          files={failedFiles}
          emptyMessage="No failed files (great!)"
        />
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Auto-refreshing every 5 seconds • Last update: {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
} 