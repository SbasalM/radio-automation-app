import { useState, useEffect } from 'react'
import { BarChart, Clock, Target, TrendingUp, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePromoStore } from '@/store/promo-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useShowStore } from '@/store/show-store'
import { FileStatus } from '@/types/file'

interface AutoTagJob {
  id: string
  filename: string
  showName: string
  analyzedAt: Date
  insertionCount: number
  averageConfidence: number
  status: 'completed' | 'failed' | 'reviewed'
  processingTimeMs: number
  totalDurationAdded: number
}

interface ConfidenceBucket {
  range: string
  count: number
  percentage: number
}

interface PromoUsageStats {
  promoName: string
  usageCount: number
  lastUsed: Date
  avgConfidence: number
}

export function AutoTagDashboard() {
  const { promos } = usePromoStore()
  const { getQueuedFiles } = useFileQueueStore()
  const { getAllShows } = useShowStore()
  
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')
  const [selectedJob, setSelectedJob] = useState<AutoTagJob | null>(null)

  // Generate mock data for demonstration
  const generateMockJobs = (): AutoTagJob[] => {
    const shows = getAllShows()
    const now = new Date()
    const jobs: AutoTagJob[] = []

    // Generate jobs for the selected time range
    const daysBack = timeRange === 'today' ? 1 : timeRange === 'week' ? 7 : 30
    
    for (let i = 0; i < Math.min(15, daysBack * 3); i++) {
      const hoursBack = Math.random() * (daysBack * 24)
      const analyzedAt = new Date(now.getTime() - hoursBack * 60 * 60 * 1000)
      const show = shows[Math.floor(Math.random() * shows.length)]
      
      jobs.push({
        id: `job-${i}`,
        filename: `${show.name.replace(/\s+/g, '_')}_${analyzedAt.getHours().toString().padStart(2, '0')}${analyzedAt.getMinutes().toString().padStart(2, '0')}.mp3`,
        showName: show.name,
        analyzedAt,
        insertionCount: Math.floor(Math.random() * 4) + 1,
        averageConfidence: 70 + Math.random() * 25,
        status: Math.random() > 0.1 ? 'completed' : Math.random() > 0.5 ? 'reviewed' : 'failed',
        processingTimeMs: 8000 + Math.random() * 12000,
        totalDurationAdded: (Math.floor(Math.random() * 4) + 1) * (15 + Math.random() * 10)
      })
    }

    return jobs.sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
  }

  const [autoTagJobs] = useState<AutoTagJob[]>(generateMockJobs())

  // Calculate statistics
  const stats = {
    totalFilesAnalyzed: autoTagJobs.length,
    totalPromosInserted: autoTagJobs.reduce((sum, job) => sum + job.insertionCount, 0),
    averageConfidence: autoTagJobs.length > 0 
      ? autoTagJobs.reduce((sum, job) => sum + job.averageConfidence, 0) / autoTagJobs.length 
      : 0,
    totalTimeAdded: autoTagJobs.reduce((sum, job) => sum + job.totalDurationAdded, 0),
    successRate: autoTagJobs.length > 0 
      ? (autoTagJobs.filter(job => job.status === 'completed').length / autoTagJobs.length) * 100 
      : 0,
    averageProcessingTime: autoTagJobs.length > 0
      ? autoTagJobs.reduce((sum, job) => sum + job.processingTimeMs, 0) / autoTagJobs.length
      : 0
  }

  // Confidence distribution
  const confidenceDistribution: ConfidenceBucket[] = [
    { range: '90-100%', count: 0, percentage: 0 },
    { range: '80-89%', count: 0, percentage: 0 },
    { range: '70-79%', count: 0, percentage: 0 },
    { range: '60-69%', count: 0, percentage: 0 },
    { range: '50-59%', count: 0, percentage: 0 }
  ]

  autoTagJobs.forEach(job => {
    const confidence = job.averageConfidence
    if (confidence >= 90) confidenceDistribution[0].count++
    else if (confidence >= 80) confidenceDistribution[1].count++
    else if (confidence >= 70) confidenceDistribution[2].count++
    else if (confidence >= 60) confidenceDistribution[3].count++
    else confidenceDistribution[4].count++
  })

  confidenceDistribution.forEach(bucket => {
    bucket.percentage = autoTagJobs.length > 0 ? (bucket.count / autoTagJobs.length) * 100 : 0
  })

  // Most used promos (mock data)
  const promoUsageStats: PromoUsageStats[] = promos.slice(0, 5).map((promo, index) => ({
    promoName: promo.name,
    usageCount: Math.floor(Math.random() * 20) + 5,
    lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    avgConfidence: 75 + Math.random() * 20
  })).sort((a, b) => b.usageCount - a.usageCount)

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatProcessingTime = (ms: number): string => {
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'reviewed':
        return <Eye className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400'
    if (confidence >= 80) return 'text-blue-600 dark:text-blue-400'
    if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Auto-Tag Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor automatic promo tagging performance and statistics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files Analyzed</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalFilesAnalyzed}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {timeRange === 'today' ? 'today' : `this ${timeRange}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promos Inserted</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalPromosInserted}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Avg {(stats.totalPromosInserted / Math.max(stats.totalFilesAnalyzed, 1)).toFixed(1)} per file
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getConfidenceColor(stats.averageConfidence)}`}>
              {Math.round(stats.averageConfidence)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Detection accuracy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Added</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatTime(stats.totalTimeAdded)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total promo content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {Math.round(stats.successRate)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Successful processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Process Time</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {formatProcessingTime(stats.averageProcessingTime)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Per file analysis
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart className="h-5 w-5" />
              <span>Confidence Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {confidenceDistribution.map((bucket, index) => (
                <div key={bucket.range} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{bucket.range}</span>
                    <span className="font-medium">{bucket.count} files ({bucket.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-blue-500' : 
                        index === 2 ? 'bg-yellow-500' : 
                        index === 3 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Used Promos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Most Used Promos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {promoUsageStats.map((promo, index) => (
                <div key={promo.promoName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full text-sm font-bold text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {promo.promoName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Last used: {promo.lastUsed.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {promo.usageCount} uses
                    </div>
                    <div className={`text-sm ${getConfidenceColor(promo.avgConfidence)}`}>
                      {Math.round(promo.avgConfidence)}% avg confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Auto-Tag Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Auto-Tag Jobs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {autoTagJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No auto-tag jobs found for this time period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">File</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Show</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Analyzed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Insertions</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Confidence</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {autoTagJobs.slice(0, 10).map(job => (
                    <tr key={job.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {job.filename}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          +{formatTime(job.totalDurationAdded)} content added
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {job.showName}
                      </td>
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        <div>{job.analyzedAt.toLocaleDateString()}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {job.analyzedAt.toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {job.insertionCount} promos
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getConfidenceColor(job.averageConfidence)}`}>
                          {Math.round(job.averageConfidence)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(job.status)}
                          <span className="capitalize text-sm text-gray-700 dark:text-gray-300">
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Review Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Auto-Tag Job Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">File</label>
                  <div className="text-gray-900 dark:text-gray-100">{selectedJob.filename}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show</label>
                  <div className="text-gray-900 dark:text-gray-100">{selectedJob.showName}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyzed At</label>
                  <div className="text-gray-900 dark:text-gray-100">
                    {selectedJob.analyzedAt.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing Time</label>
                  <div className="text-gray-900 dark:text-gray-100">
                    {formatProcessingTime(selectedJob.processingTimeMs)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Insertions</label>
                  <div className="text-gray-900 dark:text-gray-100">
                    {selectedJob.insertionCount} promos
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Added</label>
                  <div className="text-gray-900 dark:text-gray-100">
                    {formatTime(selectedJob.totalDurationAdded)}
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This job automatically detected {selectedJob.insertionCount} optimal insertion points 
                  with an average confidence of {Math.round(selectedJob.averageConfidence)}%. 
                  Total processing completed in {formatProcessingTime(selectedJob.processingTimeMs)}.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 