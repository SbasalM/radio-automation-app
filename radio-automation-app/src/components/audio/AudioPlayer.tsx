import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AudioFile, AudioPlayerState } from '@/types/audio'

interface AudioPlayerProps {
  audioFile: AudioFile
  onTimeUpdate?: (time: number) => void
  onPlayStateChange?: (playing: boolean) => void
  startTime?: number
  endTime?: number
  className?: string
}

export function AudioPlayer({
  audioFile,
  onTimeUpdate,
  onPlayStateChange,
  startTime = 0,
  endTime,
  className = ''
}: AudioPlayerProps) {
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: startTime,
    duration: audioFile.duration,
    volume: 0.8,
    playbackRate: 1.0,
    isLoading: false
  })

  const effectiveEndTime = endTime || audioFile.duration
  const effectiveDuration = effectiveEndTime - startTime

  // Simulate audio playback with intervals
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null)

  // Start/stop playback simulation
  const startPlayback = useCallback(() => {
    if (playbackInterval) return

    const interval = setInterval(() => {
      setPlayerState(prev => {
        const newTime = prev.currentTime + 0.1 // Update every 100ms
        
        // Stop at end time or file duration
        if (newTime >= effectiveEndTime) {
          onPlayStateChange?.(false)
          return {
            ...prev,
            isPlaying: false,
            currentTime: effectiveEndTime
          }
        }

        onTimeUpdate?.(newTime)
        return {
          ...prev,
          currentTime: newTime
        }
      })
    }, 100)

    setPlaybackInterval(interval)
  }, [playbackInterval, effectiveEndTime, onTimeUpdate, onPlayStateChange])

  const stopPlayback = useCallback(() => {
    if (playbackInterval) {
      clearInterval(playbackInterval)
      setPlaybackInterval(null)
    }
  }, [playbackInterval])

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    setPlayerState(prev => {
      const newPlaying = !prev.isPlaying
      onPlayStateChange?.(newPlaying)
      
      if (newPlaying) {
        // If at the end, restart from beginning
        if (prev.currentTime >= effectiveEndTime) {
          setTimeout(() => {
            setPlayerState(state => ({ ...state, currentTime: startTime }))
            onTimeUpdate?.(startTime)
          }, 0)
        }
        startPlayback()
      } else {
        stopPlayback()
      }

      return { ...prev, isPlaying: newPlaying }
    })
  }, [startPlayback, stopPlayback, onPlayStateChange, effectiveEndTime, startTime, onTimeUpdate])

  // Seek to position
  const seekTo = useCallback((time: number) => {
    const clampedTime = Math.max(startTime, Math.min(effectiveEndTime, time))
    setPlayerState(prev => ({ ...prev, currentTime: clampedTime }))
    onTimeUpdate?.(clampedTime)
  }, [startTime, effectiveEndTime, onTimeUpdate])

  // Skip controls
  const skipBackward = useCallback(() => {
    seekTo(Math.max(startTime, playerState.currentTime - 10))
  }, [seekTo, startTime, playerState.currentTime])

  const skipForward = useCallback(() => {
    seekTo(Math.min(effectiveEndTime, playerState.currentTime + 10))
  }, [seekTo, effectiveEndTime, playerState.currentTime])

  // Volume control
  const setVolume = useCallback((volume: number) => {
    setPlayerState(prev => ({ ...prev, volume }))
  }, [])

  const toggleMute = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      volume: prev.volume > 0 ? 0 : 0.8
    }))
  }, [])

  // Progress bar
  const progress = effectiveDuration > 0 
    ? ((playerState.currentTime - startTime) / effectiveDuration) * 100 
    : 0

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval)
      }
    }
  }, [playbackInterval])

  // Update current time when startTime changes
  useEffect(() => {
    setPlayerState(prev => ({
      ...prev,
      currentTime: Math.max(startTime, Math.min(effectiveEndTime, prev.currentTime))
    }))
  }, [startTime, effectiveEndTime])

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      {/* File Info */}
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {audioFile.filename}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {audioFile.format.toUpperCase()} • {audioFile.sampleRate}Hz • {audioFile.channels === 1 ? 'Mono' : 'Stereo'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[35px]">
            {formatTime(playerState.currentTime)}
          </span>
          
          <div className="flex-1 relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Clickable overlay for seeking */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const clickProgress = x / rect.width
                const newTime = startTime + (clickProgress * effectiveDuration)
                seekTo(newTime)
              }}
            />
          </div>

          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[35px]">
            {formatTime(effectiveEndTime)}
          </span>
        </div>

        {/* Trim range indicator */}
        {(startTime > 0 || endTime) && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Trimmed: {formatTime(startTime)} - {formatTime(effectiveEndTime)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Skip Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={skipBackward}
            className="h-8 w-8 p-0"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayback}
            disabled={playerState.isLoading}
            className="h-10 w-10 p-0"
          >
            {playerState.isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="sm"
            onClick={skipForward}
            className="h-8 w-8 p-0"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-8 w-8 p-0"
          >
            {playerState.volume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          
          <div className="w-20">
            <input
              type="range"
              min={0}
              max={100}
              value={playerState.volume * 100}
              onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Playback Status */}
      {playerState.isLoading && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
            Loading audio...
          </div>
        </div>
      )}
    </div>
  )
} 