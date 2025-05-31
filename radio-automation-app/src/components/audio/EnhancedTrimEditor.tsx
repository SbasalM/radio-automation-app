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
    const generateWaveform = async () => {
      setIsLoading(true)
      try {
        console.log(`🎵 Starting waveform generation for: ${audioFile.filename}`)
        console.log(`📏 Audio file duration: ${audioFile.duration}s`)
        const waveform = await audioService.generateWaveformData(audioFile, 800)
        console.log(`📊 Waveform received: ${waveform.peaks.length} peaks, duration: ${waveform.duration}s`)
        setWaveformData(waveform)
        
        // Ensure trim points are properly set when waveform loads
        // Reset to full duration if current points are invalid
        if (trimPoints.endTime === 0 || trimPoints.endTime > audioFile.duration || trimPoints.startTime >= trimPoints.endTime) {
          const correctedTrimPoints: TrimPoints = {
            startTime: 0,
            endTime: audioFile.duration,
            fadeInDuration: 0,
            fadeOutDuration: 0
          }
          setTrimPoints(correctedTrimPoints)
          console.log(`🔧 Reset trim points to full duration: 0s - ${audioFile.duration}s`)
        } else {
          console.log(`✅ Trim points valid: ${trimPoints.startTime}s - ${trimPoints.endTime}s`)
        }
        
      } catch (error) {
        console.error('Failed to generate waveform:', error)
        setWaveformData(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    generateWaveform()
    
    // Create audio element for playback - use backend audio API with retry logic
    if (audioFile.filename) {
      const createAudioElement = async (retryCount = 0) => {
        try {
          console.log(`🎧 Creating audio element for: ${audioFile.filename} (attempt ${retryCount + 1})`)
          const audio = new Audio()
          
          // Use the backend audio API endpoint for all files
          const audioSrc = `http://localhost:3001/api/audio/${audioFile.filename}`
          console.log(`🔗 Audio source: ${audioSrc}`)
          
          // Set CORS and preload settings before setting src
          audio.crossOrigin = 'anonymous'
          audio.preload = 'metadata'
          
          // Add timeout and retry logic for uploaded files
          let audioLoaded = false
          let retryTimeout: NodeJS.Timeout
          
          const onSuccess = () => {
            if (!audioLoaded) {
              audioLoaded = true
              clearTimeout(retryTimeout)
              // Use the pre-calculated duration from audioFile instead of browser detection
              console.log(`✅ Audio loaded successfully, using pre-calculated duration: ${audioFile.duration}s (browser detected: ${audio.duration}s)`)
              setAudioElement(audio)
            }
          }
          
          const onError = (e: string | Event) => {
            if (!audioLoaded) {
              console.warn(`⚠️ Audio loading attempt ${retryCount + 1} failed:`, e)
              
              // Log more details about the error
              if (e instanceof Event && e.target) {
                const audioEl = e.target as HTMLAudioElement
                console.warn('Audio element error details:', {
                  error: audioEl.error,
                  networkState: audioEl.networkState,
                  readyState: audioEl.readyState,
                  src: audioEl.src
                })
              }
              
              // For temp files (just uploaded), try again after a short delay
              if (audioFile.filename.startsWith('temp_') && retryCount < 3) {
                clearTimeout(retryTimeout)
                retryTimeout = setTimeout(() => {
                  console.log(`🔄 Retrying audio load (attempt ${retryCount + 2})...`)
                  createAudioElement(retryCount + 1)
                }, 1000 * (retryCount + 1)) // Exponential backoff: 1s, 2s, 3s
                return
              }
              
              // Try fallback if available
              if (audioFile.filePath && !audioFile.filePath.startsWith('/sample/')) {
                console.log('🔄 Trying fallback audio source:', audioFile.filePath)
                audio.src = audioFile.filePath
              } else {
                console.log('❌ Audio playback not available for this file')
                setAudioElement(null)
              }
            }
          }
          
          audio.onloadedmetadata = onSuccess
          audio.onerror = onError as OnErrorEventHandler
          
          // For temp files, add a longer timeout since they're just uploaded
          const timeoutDuration = audioFile.filename.startsWith('temp_') ? 5000 : 3000
          retryTimeout = setTimeout(() => {
            if (!audioLoaded) {
              console.warn(`⏰ Audio load timeout after ${timeoutDuration}ms`)
              onError(new Event('timeout'))
            }
          }, timeoutDuration)
          
          audio.src = audioSrc
          
          return () => {
            clearTimeout(retryTimeout)
            if (audio) {
              audio.pause()
              audio.src = ''
            }
          }
        } catch (error) {
          console.warn('Failed to create audio element:', error)
          setAudioElement(null)
        }
      }
      
      // For temp files (just uploaded), add a small initial delay
      const initialDelay = audioFile.filename.startsWith('temp_') ? 500 : 0
      setTimeout(() => {
        createAudioElement()
      }, initialDelay)
      
    } else {
      // For files without names, disable audio playback
      console.log('No filename available, audio playback disabled')
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

  // Update trim points with better bounds checking and rounding
  const handleTrimChange = useCallback((newTrimPoints: TrimPoints) => {
    // Ensure bounds are respected and handles don't disappear
    const safeStartTime = Math.max(0, Math.min(newTrimPoints.startTime, audioFile.duration - 1))
    const safeEndTime = Math.max(safeStartTime + 1, Math.min(newTrimPoints.endTime, audioFile.duration))
    
    const safeTrimPoints: TrimPoints = {
      startTime: Math.round(safeStartTime * 10) / 10, // Round to 1 decimal place
      endTime: Math.round(safeEndTime * 10) / 10,     // Round to 1 decimal place
      fadeInDuration: Math.round(Math.max(0, Math.min(newTrimPoints.fadeInDuration, (safeEndTime - safeStartTime) / 2)) * 10) / 10,
      fadeOutDuration: Math.round(Math.max(0, Math.min(newTrimPoints.fadeOutDuration, (safeEndTime - safeStartTime) / 2)) * 10) / 10
    }
    
    setTrimPoints(safeTrimPoints)
  }, [audioFile.duration])

  // Handle waveform time click (set playhead)
  const handleTimeClick = useCallback((time: number) => {
    setPlayheadPosition(time)
  }, [])

  // Handle manual trim point input
  const handleStartTimeChange = useCallback((value: string) => {
    const time = parseFloat(value)
    if (!isNaN(time) && time >= 0) {
      handleTrimChange({
        ...trimPoints,
        startTime: time
      })
    }
  }, [trimPoints, handleTrimChange])

  const handleEndTimeChange = useCallback((value: string) => {
    const time = parseFloat(value)
    if (!isNaN(time) && time >= 0) {
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
      // Start playback from trim start time, converting actual time to browser time
      const browserDuration = audioElement.duration || 60
      const actualDuration = audioFile.duration
      const timeRatio = browserDuration / actualDuration
      const browserStartTime = trimPoints.startTime * timeRatio
      
      audioElement.currentTime = browserStartTime
      audioElement.play().then(() => {
        setIsPlaying(true)
        
        // Stop at trim end time using audioFile duration for calculations
        const checkEndTime = () => {
          // Use the correct duration ratio to map browser time to actual time
          const browserDuration = audioElement.duration || 60
          const actualDuration = audioFile.duration
          const timeRatio = actualDuration / browserDuration
          const adjustedCurrentTime = audioElement.currentTime * timeRatio
          
          if (adjustedCurrentTime >= trimPoints.endTime) {
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
  }, [audioElement, isPlaying, trimPoints.startTime, trimPoints.endTime, audioFile.duration])
  
  // Update playhead position during playback
  useEffect(() => {
    if (!audioElement || !isPlaying) return
    
    const updatePlayhead = () => {
      // Map browser time to actual audio time
      const browserDuration = audioElement.duration || 60
      const actualDuration = audioFile.duration
      const timeRatio = actualDuration / browserDuration
      const adjustedCurrentTime = audioElement.currentTime * timeRatio
      
      setPlayheadPosition(adjustedCurrentTime)
      if (isPlaying) {
        requestAnimationFrame(updatePlayhead)
      }
    }
    
    requestAnimationFrame(updatePlayhead)
  }, [audioElement, isPlaying, audioFile.duration])

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
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
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
            <div className="flex items-center justify-between">
              <span>File: {audioFile.filename}</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                🎯 Drag red handles to trim • Click waveform to set playhead
              </span>
            </div>
            {waveformData && (
              <div className="mt-1 text-xs">
                <span className={waveformData.peaks.length === 800 ? "text-green-600" : "text-amber-600"}>
                  Waveform: {waveformData.peaks.length} points 
                  {waveformData.peaks.length === 800 ? " (Real data)" : " (Fallback data)"}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Waveform Display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Waveform</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Waveform
            waveformData={waveformData}
            trimPoints={trimPoints}
            playheadPosition={playheadPosition}
            onTimeClick={handleTimeClick}
            onTrimChange={handleTrimChange}
            onPlayPause={handlePlayPause}
            isPlaying={isPlaying}
            canPlay={!!audioElement}
            height={120}
          />
        </CardContent>
      </Card>

      {/* Action Buttons Only */}
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