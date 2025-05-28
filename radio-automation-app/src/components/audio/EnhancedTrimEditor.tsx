import { useState, useEffect, useCallback } from 'react'
import { Check, X, RotateCcw, Scissors, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Waveform } from './Waveform'
import { audioService } from '@/services/audio-service'
import type { AudioFile, TrimPoints, WaveformData } from '@/types/audio'

interface EnhancedTrimEditorProps {
  audioFile: AudioFile
  onSave?: (trimPoints: TrimPoints) => void
  onCancel?: () => void
  onRealTimeUpdate?: (trimPoints: TrimPoints) => void
  initialTrimPoints?: TrimPoints
  className?: string
}

export function EnhancedTrimEditor({
  audioFile,
  onSave,
  onCancel,
  onRealTimeUpdate,
  initialTrimPoints,
  className = ''
}: EnhancedTrimEditorProps) {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [trimPoints, setTrimPoints] = useState<TrimPoints>(() => {
    // Set smart defaults: start at beginning, end at full duration
    const defaults = {
      startTime: 0,
      endTime: audioFile.duration,
      fadeInDuration: 0,
      fadeOutDuration: 0
    }
    
    // If initial trim points are provided and make sense, use them
    if (initialTrimPoints && 
        initialTrimPoints.endTime > initialTrimPoints.startTime &&
        initialTrimPoints.endTime <= audioFile.duration) {
      return initialTrimPoints
    }
    
    return defaults
  })
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)

  // Generate waveform data on mount
  useEffect(() => {
    setIsLoading(true)
    const waveform = audioService.generateWaveformData(audioFile, 800)
    setWaveformData(waveform)
    setIsLoading(false)
    
    // Create audio element for playback if we have a valid file path
    if (audioFile.filePath && !audioFile.filePath.startsWith('/sample/')) {
      try {
        const audio = new Audio()
        
        // Handle different file path formats
        let audioSrc = audioFile.filePath
        if (audioSrc.startsWith('blob:')) {
          // Already a blob URL
          audio.src = audioSrc
        } else if (audioSrc.startsWith('http')) {
          // HTTP URL
          audio.src = audioSrc
        } else {
          // Local file path - this might not work in browser, but we'll try
          audio.src = audioSrc
        }
        
        audio.preload = 'metadata'
        audio.onloadedmetadata = () => {
          console.log('Audio loaded successfully, duration:', audio.duration)
        }
        audio.onerror = (e) => {
          console.warn('Audio loading failed:', e)
          setAudioElement(null)
        }
        
        setAudioElement(audio)
        
        return () => {
          // Cleanup audio element
          if (audio) {
            audio.pause()
            audio.src = ''
          }
        }
      } catch (error) {
        console.warn('Failed to create audio element:', error)
        setAudioElement(null)
      }
    } else {
      // For mock/sample files, disable audio playback
      console.log('Using mock file, audio playback disabled')
      setAudioElement(null)
    }
  }, [audioFile])

  // Validate trim points whenever they change
  useEffect(() => {
    const validation = audioService.validateTrimPoints(trimPoints, audioFile)
    setValidationErrors(validation.errors)
  }, [trimPoints, audioFile])

  // Call real-time update callback whenever trim points change
  useEffect(() => {
    if (onRealTimeUpdate) {
      onRealTimeUpdate(trimPoints)
    }
  }, [trimPoints]) // Remove onRealTimeUpdate from deps to prevent loops

  // Update trim points with better bounds checking
  const handleTrimChange = useCallback((newTrimPoints: TrimPoints) => {
    // Ensure bounds are respected and handles don't disappear
    const safeStartTime = Math.max(0, Math.min(newTrimPoints.startTime, audioFile.duration - 1))
    const safeEndTime = Math.max(safeStartTime + 1, Math.min(newTrimPoints.endTime, audioFile.duration))
    
    const safeTrimPoints: TrimPoints = {
      startTime: safeStartTime,
      endTime: safeEndTime,
      fadeInDuration: Math.max(0, Math.min(newTrimPoints.fadeInDuration, (safeEndTime - safeStartTime) / 2)),
      fadeOutDuration: Math.max(0, Math.min(newTrimPoints.fadeOutDuration, (safeEndTime - safeStartTime) / 2))
    }
    
    setTrimPoints(safeTrimPoints)
  }, [audioFile.duration])

  // Handle waveform time click (set playhead)
  const handleTimeClick = useCallback((time: number) => {
    setPlayheadPosition(time)
  }, [])

  // Handle manual trim point input
  const handleStartTimeChange = useCallback((value: string) => {
    const time = audioService.parseTime(value)
    if (!isNaN(time)) {
      handleTrimChange({
        ...trimPoints,
        startTime: time
      })
    }
  }, [trimPoints, handleTrimChange])

  const handleEndTimeChange = useCallback((value: string) => {
    const time = audioService.parseTime(value)
    if (!isNaN(time)) {
      handleTrimChange({
        ...trimPoints,
        endTime: time
      })
    }
  }, [trimPoints, handleTrimChange])

  const handleFadeInChange = useCallback((value: string) => {
    const duration = parseFloat(value)
    if (!isNaN(duration) && duration >= 0) {
      handleTrimChange({
        ...trimPoints,
        fadeInDuration: duration
      })
    }
  }, [trimPoints, handleTrimChange])

  const handleFadeOutChange = useCallback((value: string) => {
    const duration = parseFloat(value)
    if (!isNaN(duration) && duration >= 0) {
      handleTrimChange({
        ...trimPoints,
        fadeOutDuration: duration
      })
    }
  }, [trimPoints, handleTrimChange])

  // Reset to smart defaults
  const handleReset = useCallback(() => {
    const defaultTrimPoints: TrimPoints = {
      startTime: 0,
      endTime: audioFile.duration,
      fadeInDuration: 0,
      fadeOutDuration: 0
    }
    setTrimPoints(defaultTrimPoints)
    setPlayheadPosition(0)
  }, [audioFile.duration])

  // Auto-trim silence
  const handleAutoTrim = useCallback(() => {
    // Simulate auto-trim by setting reasonable defaults
    const silenceThreshold = 2 // seconds
    const newTrimPoints: TrimPoints = {
      startTime: Math.min(silenceThreshold, audioFile.duration * 0.05),
      endTime: Math.max(audioFile.duration - silenceThreshold, audioFile.duration * 0.95),
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0
    }
    setTrimPoints(newTrimPoints)
  }, [audioFile])

  // Handle audio playback
  const handlePlayPause = useCallback(() => {
    if (!audioElement) {
      // Show a helpful message when audio playback is not available
      alert('Audio playback is not available for this file. This can happen with:\n\n• Mock/sample files\n• Local file paths (browser security)\n• Unsupported audio formats\n\nThe trim settings will still work when processing the actual file.')
      return
    }
    
    if (isPlaying) {
      audioElement.pause()
      setIsPlaying(false)
    } else {
      // Start playback from trim start time
      audioElement.currentTime = trimPoints.startTime
      audioElement.play().then(() => {
        setIsPlaying(true)
        
        // Stop at trim end time
        const checkEndTime = () => {
          if (audioElement.currentTime >= trimPoints.endTime) {
            audioElement.pause()
            setIsPlaying(false)
          } else if (isPlaying) {
            requestAnimationFrame(checkEndTime)
          }
        }
        requestAnimationFrame(checkEndTime)
      }).catch((error) => {
        console.warn('Audio playback failed:', error)
        alert('Audio playback failed. This might be due to file format or browser restrictions.')
      })
    }
  }, [audioElement, isPlaying, trimPoints.startTime, trimPoints.endTime])
  
  // Update playhead position during playback
  useEffect(() => {
    if (!audioElement || !isPlaying) return
    
    const updatePlayhead = () => {
      setPlayheadPosition(audioElement.currentTime)
      if (isPlaying) {
        requestAnimationFrame(updatePlayhead)
      }
    }
    
    requestAnimationFrame(updatePlayhead)
  }, [audioElement, isPlaying])

  // Handle save
  const handleSave = useCallback(() => {
    if (validationErrors.length === 0) {
      console.log('Saving trim points:', trimPoints)
      console.log('Trimmed duration:', trimPoints.endTime - trimPoints.startTime)
      onSave?.(trimPoints)
    } else {
      console.warn('Cannot save trim points due to validation errors:', validationErrors)
    }
  }, [trimPoints, validationErrors, onSave])

  // Calculate trimmed duration
  const trimmedDuration = trimPoints.endTime - trimPoints.startTime
  const timeSaved = audioFile.duration - trimmedDuration

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading audio...</p>
        </div>
      </div>
    )
  }

  if (!waveformData) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-red-500">Failed to load audio data</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scissors className="h-5 w-5" />
              <span>Audio Trim Editor</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>Original: {audioService.formatTime(audioFile.duration)}</span>
                <span className="text-blue-600 dark:text-blue-400">→</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Trimmed: {audioService.formatTime(trimmedDuration)}
                </span>
                {timeSaved > 0 && (
                  <span className="text-orange-600 dark:text-orange-400">
                    ({audioService.formatTime(timeSaved)} saved)
                  </span>
                )}
              </div>
            </div>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            File: {audioFile.filename}
          </div>
        </CardHeader>
      </Card>

      {/* Waveform Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Waveform</CardTitle>
        </CardHeader>
        <CardContent>
          <Waveform
            waveformData={waveformData}
            trimPoints={trimPoints}
            playheadPosition={playheadPosition}
            onTimeClick={handleTimeClick}
            onTrimChange={handleTrimChange}
            height={150}
          />
        </CardContent>
      </Card>

      {/* Trim Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trim Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trim Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time (MM:SS)
              </label>
              <input
                type="text"
                value={audioService.formatTime(trimPoints.startTime)}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="0:00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time (MM:SS)
              </label>
              <input
                type="text"
                value={audioService.formatTime(trimPoints.endTime)}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                placeholder="0:00"
              />
            </div>
          </div>

          {/* Fade Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fade In Duration (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={trimPoints.fadeInDuration}
                onChange={(e) => handleFadeInChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fade Out Duration (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={trimPoints.fadeOutDuration}
                onChange={(e) => handleFadeOutChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              className={`${
                audioElement 
                  ? "bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40" 
                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/20 dark:hover:bg-gray-900/40"
              }`}
              title={
                !audioElement 
                  ? "Audio playback not available for this file type" 
                  : isPlaying 
                    ? "Pause audio preview" 
                    : "Play trimmed audio section"
              }
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Preview
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {audioElement ? "Play Trimmed Audio" : "Play (Limited Support)"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoTrim}
            >
              Auto Trim Silence
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Full Duration
            </Button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-red-800 dark:text-red-200 text-sm font-medium mb-1">
                Validation Errors:
              </div>
              <ul className="text-red-700 dark:text-red-300 text-sm space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Live Preview Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="text-blue-800 dark:text-blue-200 text-sm">
              <div className="font-medium mb-1">Live Preview:</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Trim Range:</strong> {audioService.formatTime(trimPoints.startTime)} - {audioService.formatTime(trimPoints.endTime)}
                </div>
                <div>
                  <strong>Duration:</strong> {audioService.formatTime(trimmedDuration)}
                </div>
                <div>
                  <strong>Time Saved:</strong> {audioService.formatTime(timeSaved)}
                </div>
                <div>
                  <strong>Fades:</strong> {trimPoints.fadeInDuration > 0 ? `${trimPoints.fadeInDuration}s in` : 'No fade in'}, {trimPoints.fadeOutDuration > 0 ? `${trimPoints.fadeOutDuration}s out` : 'No fade out'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={validationErrors.length > 0}
        >
          <Check className="h-4 w-4 mr-2" />
          Apply Trim Settings
        </Button>
      </div>
    </div>
  )
} 