import { RefreshCw, Trash2, Clock, CheckCircle, AlertCircle, Loader, Eye, Edit3, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileStatus } from '@/types/file'
import { useShowStore } from '@/store/show-store'
import { useFileQueueStore } from '@/store/file-queue-store'
import { watchService } from '@/services/watch-service'
import type { QueuedFile } from '@/types/file'
import { useState } from 'react'

interface FileQueueCardProps {
  title: string
  status: FileStatus
  files: QueuedFile[]
  emptyMessage: string
}

// Enhanced file display with metadata preview
function FileItem({ file }: { file: QueuedFile }) {
  const { getShow } = useShowStore()
  const { removeFile } = useFileQueueStore()
  const [showMetadata, setShowMetadata] = useState(false)
  const [showProcessingInfo, setShowProcessingInfo] = useState(false)
  
  const show = getShow(file.showId)

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

  const handleRetry = () => {
    watchService.retryFile(file.id)
  }

  const handleRemove = () => {
    if (confirm('Are you sure you want to remove this file from the queue?')) {
      removeFile(file.id)
    }
  }

  // Mock metadata extraction preview (would come from pattern matching)
  const getMetadataPreview = () => {
    if (!show?.metadataMapping) return null
    
    // Simulate pattern matching
    const filename = file.filename.replace(/\.[^/.]+$/, '') // Remove extension
    const patterns = show.metadataMapping.inputPatterns
    
    // Try to match against first pattern
    if (patterns.length > 0 && patterns[0]) {
      try {
        const regex = new RegExp(patterns[0])
        const match = filename.match(regex)
        
        if (match) {
          const extractedData: Record<string, any> = {}
          show.metadataMapping.extractionRules.forEach(rule => {
            if (rule.source === 'regex' && rule.regexGroup && match[rule.regexGroup]) {
              extractedData[rule.field] = match[rule.regexGroup]
            } else if (rule.source === 'static' && rule.staticValue) {
              extractedData[rule.field] = rule.staticValue
            }
          })
          
          // Generate preview metadata
          const metadata: Record<string, string> = {}
          Object.entries(show.metadataMapping.outputMetadata).forEach(([key, template]) => {
            if (typeof template === 'string') {
              let value = template
              Object.entries(extractedData).forEach(([field, fieldValue]) => {
                value = value.replace(new RegExp(`{${field}}`, 'g'), String(fieldValue))
              })
              // Replace date placeholders
              const now = new Date()
              value = value.replace(/{YYYY}/g, now.getFullYear().toString())
              value = value.replace(/{MM}/g, (now.getMonth() + 1).toString().padStart(2, '0'))
              value = value.replace(/{DD}/g, now.getDate().toString().padStart(2, '0'))
              metadata[key] = value
            }
          })
          
          return { extractedData, metadata, confidence: 0.85 }
        }
      } catch (e) {
        // Invalid regex
      }
    }
    
    return null
  }

  // Get processing settings preview
  const getProcessingPreview = () => {
    if (!show) return null
    
    const settings = []
    
    if (show.processingOptions.useGlobalSettings) {
      settings.push('Using global audio settings')
    } else {
      const audio = show.processingOptions.audioSettings
      settings.push(`Normalization: ${audio.normalizationLevel} LUFS`)
      if (audio.enableCompression) settings.push('Compression enabled')
      if (audio.enableEQ) settings.push('EQ enabled')
      if (audio.trimSilence) settings.push('Silence trimming')
      settings.push(`Output: ${audio.outputFormat.toUpperCase()} @ ${audio.bitRate}kbps`)
    }
    
    if (show.processingOptions.addPromoTag) {
      settings.push(`Promo tag: ${show.processingOptions.promoTagId || 'Default'}`)
    }
    
    return settings
  }

  const metadataPreview = getMetadataPreview()
  const processingSettings = getProcessingPreview()

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
            {file.filename}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{show?.name || 'Unknown Show'}</span>
            {show?.processingOptions.useGlobalSettings ? (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                Global Settings
              </span>
            ) : (
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                Custom Settings
              </span>
            )}
            {metadataPreview && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                Pattern Match: {Math.round(metadataPreview.confidence * 100)}%
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>Added: {formatTime(file.addedAt)}</span>
            {file.processedAt && (
              <span>
                {file.outputPath ? 'Completed' : 'Failed'}: {formatTime(file.processedAt)}
              </span>
            )}
            {file.processingTimeMs && (
              <span>Duration: {formatDuration(file.processingTimeMs)}</span>
            )}
          </div>

          {/* Metadata Preview */}
          {showMetadata && metadataPreview && (
            <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Metadata Preview
              </div>
              <div className="space-y-1 text-xs">
                {Object.entries(metadataPreview.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{key}:</span>
                    <span className="text-gray-900 dark:text-gray-100 font-mono">{value}</span>
                  </div>
                ))}
              </div>
              {metadataPreview.extractedData && Object.keys(metadataPreview.extractedData).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Extracted Data
                  </div>
                  <div className="space-y-1 text-xs">
                    {Object.entries(metadataPreview.extractedData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Processing Settings Preview */}
          {showProcessingInfo && processingSettings && (
            <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Processing Settings
              </div>
              <div className="space-y-1 text-xs">
                {processingSettings.map((setting, index) => (
                  <div key={index} className="text-gray-600 dark:text-gray-400">
                    • {setting}
                  </div>
                ))}
              </div>
            </div>
          )}

          {file.error && (
            <div className="text-xs text-red-600 dark:text-red-400 mt-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
              {file.error}
            </div>
          )}
          {file.outputPath && !file.error && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono">
              → {file.outputPath}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-3">
          {/* Metadata preview toggle */}
          {metadataPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className={`h-6 w-6 p-0 ${showMetadata ? 'text-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          
          {/* Processing settings toggle */}
          {processingSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProcessingInfo(!showProcessingInfo)}
              className={`h-6 w-6 p-0 ${showProcessingInfo ? 'text-purple-700 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          
          {/* Retry button for failed files */}
          {file.error && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          
          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FileQueueCard({ title, status, files, emptyMessage }: FileQueueCardProps) {
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
            {files.map((file) => (
              <FileItem key={file.id} file={file} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 