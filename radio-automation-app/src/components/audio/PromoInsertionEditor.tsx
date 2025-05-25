import { useState, useRef, useCallback, useEffect } from 'react'
import { Play, Pause, Trash2, Move, Volume2, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { 
  PromoInsertionPoint, 
  PromoFile, 
  AudioFile,
  PromoInsertion 
} from '@/types/audio'

interface PromoInsertionEditorProps {
  audioFile: AudioFile
  insertionPoints: PromoInsertionPoint[]
  selectedInsertions: PromoInsertion[]
  onInsertionUpdate: (index: number, updates: Partial<PromoInsertion>) => void
  onInsertionRemove: (index: number) => void
  onTimingAdjust: (index: number, newTimestamp: number) => void
  playheadPosition?: number
  onPlayheadChange?: (position: number) => void
  className?: string
}

export function PromoInsertionEditor({
  audioFile,
  insertionPoints,
  selectedInsertions,
  onInsertionUpdate,
  onInsertionRemove,
  onTimingAdjust,
  playheadPosition = 0,
  onPlayheadChange,
  className = ''
}: PromoInsertionEditorProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTime, setDragStartTime] = useState(0)
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null)

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number): number => {
    if (!timelineRef.current) return 0
    const width = timelineRef.current.clientWidth - 40 // Account for padding
    return (time / audioFile.duration) * width + 20 // Add left padding
  }, [audioFile.duration])

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number): number => {
    if (!timelineRef.current) return 0
    const width = timelineRef.current.clientWidth - 40
    const relativePixel = Math.max(0, Math.min(pixel - 20, width))
    return (relativePixel / width) * audioFile.duration
  }, [audioFile.duration])

  // Handle mouse down on insertion point
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setIsDragging(index)
    setDragStartX(e.clientX)
    setDragStartTime(insertionPoints[index].timestamp)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [insertionPoints])

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging === null || !timelineRef.current) return

    const deltaX = e.clientX - dragStartX
    const timelineRect = timelineRef.current.getBoundingClientRect()
    const newPixel = timeToPixel(dragStartTime) + deltaX
    const newTime = pixelToTime(newPixel - timelineRect.left)
    
    // Constrain to audio duration and apply ±2 second limit
    const originalTime = dragStartTime
    const minTime = Math.max(0, originalTime - 2)
    const maxTime = Math.min(audioFile.duration, originalTime + 2)
    const constrainedTime = Math.max(minTime, Math.min(maxTime, newTime))
    
    onTimingAdjust(isDragging, constrainedTime)
  }, [isDragging, dragStartX, dragStartTime, timeToPixel, pixelToTime, audioFile.duration, onTimingAdjust])

  // Handle mouse up to end drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
    setDragStartX(0)
    setDragStartTime(0)
    
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  // Cleanup event listeners
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Handle timeline click to move playhead
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging !== null) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const newTime = pixelToTime(e.clientX - rect.left)
    onPlayheadChange?.(Math.max(0, Math.min(audioFile.duration, newTime)))
  }, [pixelToTime, audioFile.duration, onPlayheadChange, isDragging])

  // Fine-tune insertion timing
  const handleFineTune = useCallback((index: number, delta: number) => {
    const currentTime = insertionPoints[index].timestamp
    const newTime = Math.max(0, Math.min(audioFile.duration, currentTime + delta))
    onTimingAdjust(index, newTime)
  }, [insertionPoints, audioFile.duration, onTimingAdjust])

  // Preview insertion point
  const handlePreview = useCallback((index: number) => {
    if (previewingIndex === index) {
      setPreviewingIndex(null)
      // Stop preview
    } else {
      setPreviewingIndex(index)
      const insertionTime = insertionPoints[index].timestamp
      onPlayheadChange?.(Math.max(0, insertionTime - 2)) // Start 2 seconds before
      // Simulate playing for 6 seconds (2 before + insertion + 2 after)
      setTimeout(() => setPreviewingIndex(null), 6000)
    }
  }, [previewingIndex, insertionPoints, onPlayheadChange])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    return `${seconds.toFixed(1)}s`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Move className="h-5 w-5" />
          <span>Promo Insertion Timeline</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Visualization */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>0:00</span>
            <span>Duration: {formatTime(audioFile.duration)}</span>
            <span>{formatTime(audioFile.duration)}</span>
          </div>
          
          <div
            ref={timelineRef}
            className="relative h-16 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
            onClick={handleTimelineClick}
          >
            {/* Background waveform representation */}
            <div className="absolute inset-2 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-800 dark:via-blue-700 dark:to-blue-800 rounded opacity-50"></div>
            
            {/* Playhead */}
            {playheadPosition > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `${timeToPixel(playheadPosition)}px` }}
              >
                <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 transform rotate-45"></div>
              </div>
            )}
            
            {/* Insertion Points */}
            {insertionPoints.map((point, index) => {
              const x = timeToPixel(point.timestamp)
              const isSelected = selectedInsertions[index]
              const isDraggingThis = isDragging === index
              const isCurrentlyPreviewing = previewingIndex === index
              
              if (!isSelected) return null
              
              return (
                <div key={index} className="absolute top-0 bottom-0 z-10">
                  {/* Insertion line */}
                  <div
                    className={`absolute top-0 bottom-0 w-1 ${
                      isDraggingThis 
                        ? 'bg-amber-400' 
                        : isCurrentlyPreviewing
                          ? 'bg-green-400'
                          : 'bg-yellow-400'
                    } cursor-move transition-colors`}
                    style={{ left: `${x}px` }}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                  >
                    {/* Drag handle */}
                    <div className="absolute -top-2 -left-2 w-5 h-5 bg-current rounded-full border-2 border-white shadow-md flex items-center justify-center">
                      <Move className="h-2 w-2 text-white" />
                    </div>
                    
                    {/* Promo duration indicator */}
                    <div
                      className="absolute top-0 h-full bg-current opacity-30"
                      style={{ 
                        left: '4px',
                        width: `${timeToPixel(selectedInsertions[index].selectedPromo.duration)}px`
                      }}
                    />
                  </div>
                  
                  {/* Time label */}
                  <div
                    className="absolute -bottom-6 transform -translate-x-1/2 text-xs font-medium text-gray-700 dark:text-gray-300"
                    style={{ left: `${x}px` }}
                  >
                    {formatTime(point.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Insertion Point Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Insertion Points ({selectedInsertions.length})
          </h3>
          
          {selectedInsertions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No promo insertions configured
            </div>
          ) : (
            <div className="space-y-4">
              {selectedInsertions.map((insertion, index) => (
                <Card key={index} className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {insertion.selectedPromo.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          At {formatTime(insertion.insertionPoint.timestamp)} • 
                          Duration: {formatDuration(insertion.selectedPromo.duration)} • 
                          Confidence: {Math.round(insertion.insertionPoint.confidence)}%
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(index)}
                        >
                          {previewingIndex === index ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertionRemove(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Fine-tuning Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Timing Adjustment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Fine-tune Timing
                        </label>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFineTune(index, -0.5)}
                          >
                            <ArrowLeft className="h-3 w-3" />
                            -0.5s
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFineTune(index, -0.1)}
                          >
                            -0.1s
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFineTune(index, 0.1)}
                          >
                            +0.1s
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFineTune(index, 0.5)}
                          >
                            +0.5s
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Crossfade Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Crossfade Duration
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={insertion.crossfadeDuration}
                            onChange={(e) => onInsertionUpdate(index, { 
                              crossfadeDuration: parseFloat(e.target.value) 
                            })}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                            {formatDuration(insertion.crossfadeDuration)}
                          </div>
                        </div>
                      </div>

                      {/* Volume Adjustment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Volume Adjustment
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="-6"
                            max="6"
                            step="0.5"
                            value={insertion.volumeAdjustment}
                            onChange={(e) => onInsertionUpdate(index, { 
                              volumeAdjustment: parseFloat(e.target.value) 
                            })}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-600 dark:text-gray-400 text-center flex items-center justify-center space-x-1">
                            <Volume2 className="h-3 w-3" />
                            <span>{insertion.volumeAdjustment > 0 ? '+' : ''}{insertion.volumeAdjustment}dB</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Context Information */}
                    <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <strong>Context:</strong> {insertion.insertionPoint.contextBefore} → 
                      PROMO INSERT → {insertion.insertionPoint.contextAfter}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <strong>Instructions:</strong> Drag the yellow markers on the timeline to adjust insertion timing (±2 seconds). 
          Use the fine-tune controls for precise adjustments. Preview each insertion point to hear the context.
        </div>
      </CardContent>
    </Card>
  )
} 