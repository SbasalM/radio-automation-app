import { useState, useCallback, useEffect } from 'react'
import { Mic, Target, Play, Check, AlertCircle, Zap, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Waveform } from '@/components/audio/Waveform'
import { VoiceActivityVisualizer } from '@/components/audio/VoiceActivityVisualizer'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { useFileQueueStore } from '@/store/file-queue-store'
import { usePromoStore } from '@/store/promo-store'
import { useShowStore } from '@/store/show-store'
import { audioService } from '@/services/audio-service'
import { voiceDetectionService } from '@/services/voice-detection-service'
import { FileStatus } from '@/types/file'
import type { 
  AudioFile, 
  WaveformData, 
  VoiceActivityData, 
  PromoInsertionPoint,
  PromoTagSettings,
  PromoFile 
} from '@/types/audio'

export function AutoTagging() {
  const { getQueuedFiles, updateFileStatus } = useFileQueueStore()
  const { promos, getPromosByCategory, getPromosByShow } = usePromoStore()
  const { getShow } = useShowStore()

  const [selectedFile, setSelectedFile] = useState<{ file: any; audioFile: AudioFile } | null>(null)
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [voiceActivityData, setVoiceActivityData] = useState<VoiceActivityData | null>(null)
  const [insertionPoints, setInsertionPoints] = useState<PromoInsertionPoint[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Tagging settings
  const [settings, setSettings] = useState<PromoTagSettings>({
    enabled: true,
    minimumGapDuration: 2,
    maximumInsertionsPerHour: 3,
    confidenceThreshold: 75,
    preferredCategories: ['morning', 'afternoon'],
    backgroundMusicHandling: 'moderate',
    autoApproveHighConfidence: false
  })

  // Selected promo for each insertion point
  const [selectedPromos, setSelectedPromos] = useState<Record<number, string>>({})

  // Get files ready for auto-tagging
  const audioFiles = getQueuedFiles().filter(file => 
    file.status === FileStatus.PENDING && 
    (file.filename.toLowerCase().endsWith('.mp3') || 
     file.filename.toLowerCase().endsWith('.wav') || 
     file.filename.toLowerCase().endsWith('.flac'))
  )

  // Analyze selected file for voice activity
  const handleAnalyzeFile = useCallback(async (file: any) => {
    try {
      setIsAnalyzing(true)
      setError(null)
      setVoiceActivityData(null)
      setInsertionPoints([])

      // Analyze audio file
      const audioFile = await audioService.analyzeAudioFile(file.filename, 0)
      const waveform = audioService.generateWaveformData(audioFile, 800)
      
      setSelectedFile({ file, audioFile })
      setWaveformData(waveform)

      // Perform voice activity analysis
      const voiceActivity = await voiceDetectionService.analyzeAudio(audioFile, settings)
      setVoiceActivityData(voiceActivity)

      // Detect insertion points
      const detectedPoints = await voiceDetectionService.suggestInsertionPoints(voiceActivity, settings)
      setInsertionPoints(detectedPoints)

      // Auto-suggest promos for each point
      const show = getShow(file.showId)
      const suggestedPromos: Record<number, string> = {}
      
      detectedPoints.forEach((point, index) => {
        // Get suitable promos for this show and time
        let suitablePromos = show ? getPromosByShow(show.id) : promos
        
        if (suitablePromos.length === 0) {
          suitablePromos = promos.filter(promo => 
            settings.preferredCategories.some(cat => promo.categories.includes(cat))
          )
        }

        if (suitablePromos.length > 0) {
          // Select promo based on confidence and priority
          const highPriorityPromos = suitablePromos.filter(p => 
            p.categories.some(cat => settings.preferredCategories.includes(cat))
          )
          const selectedPromo = highPriorityPromos.length > 0 ? highPriorityPromos[0] : suitablePromos[0]
          suggestedPromos[index] = selectedPromo.id
        }
      })
      
      setSelectedPromos(suggestedPromos)

      console.log(`✅ Voice analysis complete: ${detectedPoints.length} insertion points found`)
    } catch (error) {
      console.error('Voice analysis failed:', error)
      setError('Failed to analyze audio file. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [settings, getShow, getPromosByShow, promos])

  // Handle insertion point click
  const handleInsertionPointClick = useCallback((point: PromoInsertionPoint) => {
    const pointIndex = insertionPoints.indexOf(point)
    if (pointIndex >= 0) {
      setPlayheadPosition(point.timestamp)
      console.log(`Selected insertion point at ${point.timestamp}s (${Math.round(point.confidence)}% confidence)`)
    }
  }, [insertionPoints])

  // Update promo selection for an insertion point
  const handlePromoSelection = useCallback((pointIndex: number, promoId: string) => {
    setSelectedPromos(prev => ({
      ...prev,
      [pointIndex]: promoId
    }))
  }, [])

  // Apply promo tagging
  const handleApplyTagging = useCallback(async () => {
    if (!selectedFile || insertionPoints.length === 0) return

    try {
      setIsApplying(true)
      setError(null)

      // Update file status to processing
      updateFileStatus(selectedFile.file.id, FileStatus.PROCESSING, {
        success: false,
        processingTimeMs: 0
      })

      // Simulate promo insertion processing
      const totalProcessingTime = insertionPoints.length * 3000 + 2000 // 3s per insertion + 2s overhead
      await new Promise(resolve => setTimeout(resolve, totalProcessingTime))

      // Update file status to completed
      updateFileStatus(selectedFile.file.id, FileStatus.COMPLETED, {
        success: true,
        processingTimeMs: totalProcessingTime
      })

      console.log(`✅ Promo tagging applied: ${insertionPoints.length} insertions`)
      
      // Reset selection
      setSelectedFile(null)
      setWaveformData(null)
      setVoiceActivityData(null)
      setInsertionPoints([])
      setSelectedPromos({})
      setPlayheadPosition(0)

    } catch (error) {
      console.error('Failed to apply promo tagging:', error)
      setError('Failed to apply promo tagging. Please try again.')
      
      updateFileStatus(selectedFile.file.id, FileStatus.FAILED, {
        success: false,
        error: 'Promo tagging failed'
      })
    } finally {
      setIsApplying(false)
    }
  }, [selectedFile, insertionPoints, updateFileStatus])

  // Preview with selected promos
  const handlePreview = useCallback(() => {
    if (!selectedFile) return
    
    const estimatedDuration = selectedFile.audioFile.duration + (insertionPoints.length * 20) // +20s per promo
    console.log(`Preview: Original ${Math.round(selectedFile.audioFile.duration)}s → Tagged ${Math.round(estimatedDuration)}s`)
    alert(`Preview would show audio with ${insertionPoints.length} promo insertions.\nOriginal: ${Math.round(selectedFile.audioFile.duration)}s → Tagged: ${Math.round(estimatedDuration)}s`)
  }, [selectedFile, insertionPoints])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Auto Promo Tagging</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Automatically detect speech patterns and insert station promos
          </p>
        </div>
        
        {selectedFile && (
          <Button variant="outline" onClick={() => setSelectedFile(null)}>
            ← Back to File List
          </Button>
        )}
      </div>

      {!selectedFile ? (
        <>
          {/* File Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="h-5 w-5" />
                <span>Select Audio File for Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audioFiles.length === 0 ? (
                <div className="text-center py-8">
                  <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No audio files ready for tagging
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Audio files will appear here when they're detected by the file monitoring system.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {audioFiles.map(file => {
                    const show = getShow(file.showId)
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-center space-x-3">
                          <Mic className="h-5 w-5 text-blue-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {file.filename}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Show: {show?.name || 'Unknown'} • Added: {new Date(file.addedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAnalyzeFile(file)}
                          disabled={isAnalyzing}
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Analyze Voice Activity
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Analysis Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Gap Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.minimumGapDuration}
                    onChange={(e) => setSettings(prev => ({ ...prev, minimumGapDuration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={settings.confidenceThreshold}
                    onChange={(e) => setSettings(prev => ({ ...prev, confidenceThreshold: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background Music Handling
                  </label>
                  <select
                    value={settings.backgroundMusicHandling}
                    onChange={(e) => setSettings(prev => ({ ...prev, backgroundMusicHandling: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="strict">Strict (No music)</option>
                    <option value="moderate">Moderate</option>
                    <option value="lenient">Lenient (Allow music)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Voice Activity Analysis: {selectedFile.file.filename}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Waveform with Voice Activity Overlay */}
              {waveformData && voiceActivityData && (
                <div className="space-y-4">
                  <div className="relative">
                    <Waveform
                      waveformData={waveformData}
                      playheadPosition={playheadPosition}
                      onTimeClick={setPlayheadPosition}
                      height={120}
                      readonly={true}
                    />
                    <div className="absolute inset-0 pointer-events-none">
                      <VoiceActivityVisualizer
                        waveformData={waveformData}
                        voiceActivityData={voiceActivityData}
                        insertionPoints={insertionPoints}
                        playheadPosition={playheadPosition}
                        onInsertionPointClick={handleInsertionPointClick}
                        height={120}
                      />
                    </div>
                  </div>

                  {/* Audio Player */}
                  <AudioPlayer
                    audioFile={selectedFile.audioFile}
                    onTimeUpdate={setPlayheadPosition}
                  />
                </div>
              )}

              {/* Insertion Points Management */}
              {insertionPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Detected Insertion Points ({insertionPoints.length})
                  </h3>
                  <div className="space-y-3">
                    {insertionPoints.map((point, index) => {
                      const availablePromos = promos.filter(promo => 
                        promo.shows.length === 0 || promo.shows.includes(selectedFile.file.showId)
                      )

                      return (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                Point {index + 1} at {formatTime(point.timestamp)}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Confidence: {Math.round(point.confidence)}% • Gap: {point.gapDuration.toFixed(1)}s
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {point.reason}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPlayheadPosition(point.timestamp)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Go to Point
                            </Button>
                          </div>

                          {/* Promo Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Select Promo
                            </label>
                            <select
                              value={selectedPromos[index] || ''}
                              onChange={(e) => handlePromoSelection(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select a promo...</option>
                              {availablePromos.map(promo => (
                                <option key={promo.id} value={promo.id}>
                                  {promo.name} ({formatTime(promo.duration)})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {insertionPoints.length > 0 ? (
                    `${insertionPoints.length} insertion points detected • ${Object.keys(selectedPromos).length} promos selected`
                  ) : voiceActivityData ? (
                    'No suitable insertion points found'
                  ) : (
                    'Analyzing...'
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {insertionPoints.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handlePreview}
                        disabled={Object.keys(selectedPromos).length === 0}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview Result
                      </Button>
                      <Button
                        onClick={handleApplyTagging}
                        disabled={isApplying || Object.keys(selectedPromos).length === 0}
                      >
                        {isApplying ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Applying...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Apply Promo Tagging
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
} 