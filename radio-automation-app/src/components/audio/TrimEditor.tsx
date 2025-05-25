import { useState, useEffect, useCallback } from 'react'
import { Check, X, RotateCcw, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Waveform } from './Waveform'
import { AudioPlayer } from './AudioPlayer'
import { audioService } from '@/services/audio-service'
import type { AudioFile, TrimPoints, WaveformData } from '@/types/audio'

interface TrimEditorProps {
  audioFile: AudioFile
  onSave?: (trimPoints: TrimPoints) => void
  onCancel?: () => void
  initialTrimPoints?: TrimPoints
  className?: string
}

export function TrimEditor({
  audioFile,
  onSave,
  onCancel,
  initialTrimPoints,
  className = ''
}: TrimEditorProps) {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null)
  const [trimPoints, setTrimPoints] = useState<TrimPoints>(
    initialTrimPoints || audioService.getDefaultTrimPoints(audioFile)
  )
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Generate waveform data on mount
  useEffect(() => {
    setIsLoading(true)
    const waveform = audioService.generateWaveformData(audioFile, 800)
    setWaveformData(waveform)
    setIsLoading(false)
  }, [audioFile])

  // Validate trim points whenever they change
  useEffect(() => {
    const validation = audioService.validateTrimPoints(trimPoints, audioFile)
    setValidationErrors(validation.errors)
  }, [trimPoints, audioFile])

  // Update trim points and validate
  const handleTrimChange = useCallback((newTrimPoints: TrimPoints) => {
    setTrimPoints(newTrimPoints)
  }, [])

  // Handle waveform time click (set playhead)
  const handleTimeClick = useCallback((time: number) => {
    setPlayheadPosition(time)
  }, [])

  // Handle manual trim point input
  const handleStartTimeChange = useCallback((value: string) => {
    const time = audioService.parseTime(value)
    if (!isNaN(time)) {
      setTrimPoints(prev => ({
        ...prev,
        startTime: Math.max(0, Math.min(time, prev.endTime - 1))
      }))
    }
  }, [])

  const handleEndTimeChange = useCallback((value: string) => {
    const time = audioService.parseTime(value)
    if (!isNaN(time)) {
      setTrimPoints(prev => ({
        ...prev,
        endTime: Math.min(audioFile.duration, Math.max(time, prev.startTime + 1))
      }))
    }
  }, [audioFile.duration])

  const handleFadeInChange = useCallback((value: string) => {
    const duration = parseFloat(value)
    if (!isNaN(duration) && duration >= 0) {
      setTrimPoints(prev => ({
        ...prev,
        fadeInDuration: Math.min(duration, (prev.endTime - prev.startTime) / 2)
      }))
    }
  }, [])

  const handleFadeOutChange = useCallback((value: string) => {
    const duration = parseFloat(value)
    if (!isNaN(duration) && duration >= 0) {
      setTrimPoints(prev => ({
        ...prev,
        fadeOutDuration: Math.min(duration, (prev.endTime - prev.startTime) / 2)
      }))
    }
  }, [])

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaultTrimPoints = audioService.getDefaultTrimPoints(audioFile)
    setTrimPoints(defaultTrimPoints)
    setPlayheadPosition(defaultTrimPoints.startTime)
  }, [audioFile])

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

  // Handle save
  const handleSave = useCallback(() => {
    if (validationErrors.length === 0) {
      onSave?.(trimPoints)
    }
  }, [trimPoints, validationErrors, onSave])

  // Calculate trimmed duration
  const trimmedDuration = trimPoints.endTime - trimPoints.startTime

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
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Audio Trim Editor</span>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>File: {audioFile.filename}</div>
            <div>Original Duration: {audioService.formatTime(audioFile.duration)}</div>
            <div>Trimmed Duration: {audioService.formatTime(trimmedDuration)}</div>
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
              Reset to Defaults
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

          {/* Trim Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="text-blue-800 dark:text-blue-200 text-sm">
              <div className="font-medium mb-1">Trim Summary:</div>
              <div>Original: {audioService.formatTime(audioFile.duration)}</div>
              <div>Trimmed: {audioService.formatTime(trimmedDuration)} ({audioService.formatTime(trimPoints.startTime)} - {audioService.formatTime(trimPoints.endTime)})</div>
              <div>Time Saved: {audioService.formatTime(audioFile.duration - trimmedDuration)}</div>
              {(trimPoints.fadeInDuration > 0 || trimPoints.fadeOutDuration > 0) && (
                <div>Fades: {trimPoints.fadeInDuration}s in, {trimPoints.fadeOutDuration}s out</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Player Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <AudioPlayer
            audioFile={audioFile}
            startTime={trimPoints.startTime}
            endTime={trimPoints.endTime}
            onTimeUpdate={setPlayheadPosition}
          />
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