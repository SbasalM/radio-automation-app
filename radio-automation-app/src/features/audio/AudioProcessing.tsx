import { useState, useCallback } from 'react'
import { Radio, Play, Settings, Download, FileAudio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrimEditor } from '@/components/audio/TrimEditor'
import { useFileQueueStore } from '@/store/file-queue-store'
import { useShowStore } from '@/store/show-store'
import { audioService } from '@/services/audio-service'
import { FileStatus } from '@/types/file'
import type { AudioFile, TrimPoints } from '@/types/audio'

export function AudioProcessing() {
  const { getQueuedFiles, updateFileStatus } = useFileQueueStore()
  const { getShow } = useShowStore()
  const [selectedFile, setSelectedFile] = useState<{ file: any; audioFile: AudioFile } | null>(null)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  // Get files ready for audio processing
  const audioFiles = getQueuedFiles().filter(file => 
    file.status === FileStatus.PENDING && 
    (file.filename.toLowerCase().endsWith('.mp3') || 
     file.filename.toLowerCase().endsWith('.wav') || 
     file.filename.toLowerCase().endsWith('.flac'))
  )

  // Helper function to simulate file updates with metadata
  const updateFile = useCallback((id: string, updates: any) => {
    // For now, just update the status
    if (updates.status) {
      updateFileStatus(id, updates.status, {
        success: updates.status === FileStatus.COMPLETED,
        error: updates.error,
        processingTimeMs: updates.processingTimeMs
      })
    }
  }, [updateFileStatus])

  // Open trim editor for a file
  const handleEditTrim = useCallback(async (file: any) => {
    try {
      // Analyze the audio file
      const audioFile = await audioService.analyzeAudioFile(file.filename, 0)
      setSelectedFile({ file, audioFile })
    } catch (error) {
      console.error('Failed to analyze audio file:', error)
      alert('Failed to load audio file for editing')
    }
  }, [])

  // Save trim settings and apply to file
  const handleSaveTrimSettings = useCallback(async (trimPoints: TrimPoints) => {
    if (!selectedFile) return

    try {
      setIsProcessing(selectedFile.file.id)
      
      // Update file with processing status
      updateFile(selectedFile.file.id, {
        status: FileStatus.PROCESSING
      })

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Update to completed
      updateFile(selectedFile.file.id, {
        status: FileStatus.COMPLETED,
        processingTimeMs: 3000
      })

      setSelectedFile(null)
      setIsProcessing(null)
      
      console.log('Trim settings applied successfully')
    } catch (error) {
      console.error('Failed to apply trim settings:', error)
      updateFile(selectedFile.file.id, {
        status: FileStatus.FAILED,
        error: 'Failed to apply trim settings'
      })
      setIsProcessing(null)
    }
  }, [selectedFile, updateFile])

  // Process a single file with default settings
  const handleQuickProcess = useCallback(async (file: any) => {
    try {
      setIsProcessing(file.id)
      
      // Analyze audio file first
      const audioFile = await audioService.analyzeAudioFile(file.filename, 0)
      const defaultTrimPoints = audioService.getDefaultTrimPoints(audioFile)
      
      updateFile(file.id, {
        status: FileStatus.PROCESSING
      })

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      updateFile(file.id, {
        status: FileStatus.COMPLETED,
        processingTimeMs: 2000
      })

      setIsProcessing(null)
      console.log('File processed with default settings')
    } catch (error) {
      console.error('Failed to process file:', error)
      updateFile(file.id, {
        status: FileStatus.FAILED,
        error: 'Processing failed'
      })
      setIsProcessing(null)
    }
  }, [updateFile])

  // Batch process all files
  const handleBatchProcess = useCallback(async () => {
    const filesToProcess = audioFiles.filter(file => file.status === FileStatus.PENDING)
    
    if (filesToProcess.length === 0) {
      alert('No files available for processing')
      return
    }

    if (!confirm(`Process ${filesToProcess.length} files with default settings?`)) {
      return
    }

    for (const file of filesToProcess) {
      await handleQuickProcess(file)
    }
  }, [audioFiles, handleQuickProcess])

  // Close trim editor
  const handleCloseTrimEditor = useCallback(() => {
    setSelectedFile(null)
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Estimate file size based on filename
  const estimateFileSize = (filename: string): number => {
    // Mock file size estimation based on file type
    if (filename.toLowerCase().endsWith('.wav')) {
      return 25 * 1024 * 1024 // ~25MB for WAV
    } else if (filename.toLowerCase().endsWith('.flac')) {
      return 15 * 1024 * 1024 // ~15MB for FLAC
    } else {
      return 8 * 1024 * 1024 // ~8MB for MP3
    }
  }

  // If trim editor is open, show it
  if (selectedFile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Audio Trim Editor
          </h1>
          <Button variant="outline" onClick={handleCloseTrimEditor}>
            ← Back to File List
          </Button>
        </div>

        <TrimEditor
          audioFile={selectedFile.audioFile}
          onSave={handleSaveTrimSettings}
          onCancel={handleCloseTrimEditor}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Audio Processing
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Edit and process audio files with trimming, normalization, and other operations
          </p>
        </div>

        {audioFiles.length > 0 && (
          <Button onClick={handleBatchProcess}>
            <Download className="h-4 w-4 mr-2" />
            Batch Process All
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audio Files Ready</CardTitle>
            <FileAudio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {audioFiles.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Files awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {isProcessing ? 1 : 0}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatFileSize(audioFiles.reduce((total, file) => total + estimateFileSize(file.filename), 0))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Audio data ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Radio className="h-5 w-5" />
            <span>Audio Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audioFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No audio files ready for processing
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Audio files will appear here when they're detected by the file monitoring system.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500">
                Supported formats: MP3, WAV, FLAC
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">File</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Show</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Added</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audioFiles.map((file) => {
                    const show = getShow(file.showId)
                    const isCurrentlyProcessing = isProcessing === file.id
                    
                    return (
                      <tr
                        key={file.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <FileAudio className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {file.filename}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {file.sourcePath}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {show?.name || 'Unknown Show'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {formatFileSize(estimateFileSize(file.filename))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {new Date(file.addedAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTrim(file)}
                              disabled={isCurrentlyProcessing}
                            >
                              <Radio className="h-4 w-4 mr-2" />
                              Edit Trim
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQuickProcess(file)}
                              disabled={isCurrentlyProcessing}
                            >
                              {isCurrentlyProcessing ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Quick Process
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Processing Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Edit Trim:</strong> Opens the waveform editor where you can precisely set trim points, fade durations, and preview changes before applying.
            </p>
            <p>
              <strong>Quick Process:</strong> Applies default trim settings (removes silence from start/end) and processes the file immediately.
            </p>
            <p>
              <strong>Batch Process:</strong> Processes all pending files with default settings - great for bulk operations.
            </p>
            <p>
              <strong>Supported Formats:</strong> MP3, WAV, and FLAC files are automatically detected and made available for processing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 