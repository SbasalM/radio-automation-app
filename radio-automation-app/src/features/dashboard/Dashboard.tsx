import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Eye, 
  Clock, 
  CheckCircle, 
  Calendar,
  Activity,
  AlertCircle,
  Info,
  CheckCircle2,
  Server,
  RefreshCw,
  Settings
} from 'lucide-react'
import { useShowStore } from '@/store/show-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useMonitoringStore } from '@/store/monitoring-store'
import { useFTPStore } from '@/store/ftp-store'
import { FileStatus } from '@/types/file'
import { formatNextRun } from '@/utils/cron-helper'
import { clearAllAppData } from '@/utils/storage-migration'

export function Dashboard() {
  const { getActiveShows, loadShows } = useShowStore()
  const { 
    getFilesByStatus, 
    getTodayCompletedCount, 
    getQueuedFiles,
    loadQueue
  } = useFileQueueStore()
  const { isMonitoring } = useMonitoringStore()
  const { getNextScheduledDownload } = useFTPStore()
  
  const [refreshKey, setRefreshKey] = useState(0)
  const [showErrorOptions, setShowErrorOptions] = useState(false)
  const [systemStatus, setSystemStatus] = useState<any>(null)

  const handleClearData = () => {
    if (confirm('This will clear all local data and reload the page. Are you sure?')) {
      clearAllAppData()
      window.location.reload()
    }
  }

  // Load system status
  const loadSystemStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/system/status')
      if (response.ok) {
        const data = await response.json()
        setSystemStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to load system status:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    loadShows()
    loadQueue()
    loadSystemStatus()
  }, [])

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
      loadQueue() // Refresh queue data
      loadSystemStatus() // Refresh system status
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  // Use reactive store values with proper dependencies
  const files = getQueuedFiles()
  const activeShows = getActiveShows()
  
  // Calculate metrics reactively - these need to be recalculated when files change
  const queuedFiles = files.filter(f => f.status === FileStatus.PENDING || f.status === FileStatus.PROCESSING).length
  const processedToday = files.filter(f => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return f.status === FileStatus.COMPLETED && 
           f.processedAt && 
           new Date(f.processedAt) >= today
  }).length
  
  // Force re-calculation when data changes
  useEffect(() => {
    // This effect will trigger when store data changes
    loadQueue() // Refresh queue data when files array changes
  }, [files.length, refreshKey, loadQueue])
  
  try {
    // Validate data
    if (!Array.isArray(files)) {
      throw new Error('Invalid queue data')
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <Button onClick={handleClearData} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Data & Reload
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Data Loading Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There was an error loading the dashboard data. This might be due to corrupted localStorage data.
            </p>
            <Button onClick={handleClearData} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              Clear All Data & Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Get next scheduled download
  const nextScheduled = getNextScheduledDownload()
  
  // Get recent activity from the last 10 files
  const recentFiles = files
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 10)

  const recentActivity = recentFiles.map(file => {
    let message = ''
    let type: 'info' | 'warning' | 'error' | 'success' = 'info'
    
    if (file.status === FileStatus.COMPLETED) {
      message = 'File processed successfully'
      type = 'success'
    } else if (file.status === FileStatus.FAILED) {
      message = 'File processing failed'
      type = 'error'
    } else if (file.status === FileStatus.PROCESSING) {
      message = 'File is being processed'
      type = 'info'
    } else {
      message = 'New file detected'
      type = 'info'
    }

    return {
      id: file.id,
      type,
      message,
      details: file.filename,
      timestamp: file.processedAt || file.addedAt
    }
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return '--:--'
    }
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor your radio automation system status and activity
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitors</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isMonitoring ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {isMonitoring ? activeShows.length : 0}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isMonitoring ? 'Watching for new files' : 'Monitoring stopped'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued Files</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {queuedFiles}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pending processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {processedToday}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Files completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audio Processing</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStatus?.ffmpeg?.available ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {systemStatus?.ffmpeg?.available ? 'FFmpeg' : 'Fallback'}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {systemStatus?.ffmpeg?.available ? 'Full audio processing' : 'Basic file operations'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status Info */}
      {systemStatus?.ffmpeg && !systemStatus.ffmpeg.available && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-5 w-5" />
              <span>Audio Processing Limited</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 dark:text-orange-300 mb-3">
              FFmpeg is not available. Audio processing features like trimming, format conversion, and metadata embedding are limited.
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Install FFmpeg to enable full audio processing capabilities. See the FFMPEG_SETUP.md guide for installation instructions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Start monitoring to see file processing activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.message}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.details}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 