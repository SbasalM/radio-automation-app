import { useEffect, useRef, useCallback } from 'react'
import { Target, Volume2, VolumeX, Mic } from 'lucide-react'
import type { WaveformData, VoiceActivityData, PromoInsertionPoint } from '@/types/audio'

interface VoiceActivityVisualizerProps {
  waveformData: WaveformData
  voiceActivityData: VoiceActivityData
  insertionPoints?: PromoInsertionPoint[]
  playheadPosition?: number
  onInsertionPointClick?: (point: PromoInsertionPoint) => void
  className?: string
  height?: number
  showLabels?: boolean
}

export function VoiceActivityVisualizer({
  waveformData,
  voiceActivityData,
  insertionPoints = [],
  playheadPosition = 0,
  onInsertionPointClick,
  className = '',
  height = 120,
  showLabels = true
}: VoiceActivityVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get canvas dimensions
  const getCanvasWidth = useCallback(() => {
    return containerRef.current?.clientWidth || 800
  }, [])

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number): number => {
    const canvasWidth = getCanvasWidth()
    return (time / waveformData.duration) * canvasWidth
  }, [waveformData.duration, getCanvasWidth])

  // Draw the voice activity overlay
  const drawVoiceActivity = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const canvasWidth = getCanvasWidth()
    const dpr = window.devicePixelRatio || 1

    // Set canvas size for crisp rendering
    canvas.width = canvasWidth * dpr
    canvas.height = height * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasWidth, height)

    // Draw voice activity segments
    voiceActivityData.segments.forEach(segment => {
      const startPixel = timeToPixel(segment.startTime)
      const endPixel = timeToPixel(segment.endTime)
      const segmentWidth = endPixel - startPixel

      if (segmentWidth < 1) return // Skip very small segments

      // Determine colors based on segment type and confidence
      let fillColor: string
      let strokeColor: string
      const alpha = Math.max(0.3, segment.confidence / 100) // Opacity based on confidence

      switch (segment.segmentType) {
        case 'voice':
          fillColor = segment.hasBackgroundMusic 
            ? `rgba(34, 197, 94, ${alpha * 0.6})` // Green with music (lower opacity)
            : `rgba(34, 197, 94, ${alpha})` // Pure green for voice
          strokeColor = `rgba(34, 197, 94, ${alpha + 0.2})`
          break
        case 'music':
          fillColor = `rgba(59, 130, 246, ${alpha * 0.7})` // Blue for music
          strokeColor = `rgba(59, 130, 246, ${alpha + 0.2})`
          break
        case 'silence':
          fillColor = `rgba(156, 163, 175, ${alpha * 0.4})` // Gray for silence
          strokeColor = `rgba(156, 163, 175, ${alpha + 0.1})`
          break
        default:
          fillColor = `rgba(156, 163, 175, 0.3)`
          strokeColor = `rgba(156, 163, 175, 0.5)`
      }

      // Draw segment background
      ctx.fillStyle = fillColor
      ctx.fillRect(startPixel, 0, segmentWidth, height)

      // Draw segment border
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 1
      ctx.strokeRect(startPixel, 0, segmentWidth, height)

      // Add pattern for background music
      if (segment.hasBackgroundMusic && segment.segmentType === 'voice') {
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.8})` // Blue pattern for music
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2]) // Dashed pattern
        
        // Draw diagonal lines to indicate background music
        for (let x = startPixel; x < endPixel; x += 8) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + 4, height)
          ctx.stroke()
        }
        
        ctx.setLineDash([]) // Reset line dash
      }

      // Add text labels for longer segments if enabled
      if (showLabels && segmentWidth > 50) {
        const segmentCenter = startPixel + segmentWidth / 2
        const textY = height / 2

        ctx.fillStyle = '#000000'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Create label text
        let labelText = segment.segmentType.toUpperCase()
        if (segment.segmentType === 'voice' && segment.hasBackgroundMusic) {
          labelText += ' + MUSIC'
        }

        // Add confidence if space allows
        if (segmentWidth > 80) {
          labelText += ` (${Math.round(segment.confidence)}%)`
        }

        // Draw text with background for readability
        const textMetrics = ctx.measureText(labelText)
        const textWidth = textMetrics.width
        const textHeight = 12

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(
          segmentCenter - textWidth / 2 - 2,
          textY - textHeight / 2,
          textWidth + 4,
          textHeight
        )

        ctx.fillStyle = '#000000'
        ctx.fillText(labelText, segmentCenter, textY)
      }
    })

    // Draw insertion points
    insertionPoints.forEach(point => {
      const x = timeToPixel(point.timestamp)
      const confidence = point.confidence / 100

      // Draw insertion point marker
      const markerSize = 8
      const markerColor = confidence >= 0.9 
        ? '#10b981' // Green for high confidence
        : confidence >= 0.75 
          ? '#f59e0b' // Amber for medium confidence  
          : '#ef4444' // Red for low confidence

      // Draw vertical line
      ctx.strokeStyle = markerColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()

      // Draw marker icon at top
      const iconY = 10
      ctx.fillStyle = markerColor
      ctx.beginPath()
      ctx.arc(x, iconY, markerSize / 2, 0, 2 * Math.PI)
      ctx.fill()

      // Draw target icon
      ctx.fillStyle = '#ffffff'
      ctx.font = '8px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🎯', x, iconY)

      // Draw confidence percentage
      if (showLabels) {
        const confidenceText = `${Math.round(point.confidence)}%`
        ctx.fillStyle = markerColor
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(confidenceText, x, iconY + 15)
      }
    })

    // Draw playhead
    if (playheadPosition > 0) {
      const playheadPixel = timeToPixel(playheadPosition)
      ctx.strokeStyle = '#ef4444' // Red playhead
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadPixel, 0)
      ctx.lineTo(playheadPixel, height)
      ctx.stroke()

      // Draw playhead indicator triangle at top
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(playheadPixel, 8)
      ctx.lineTo(playheadPixel - 4, 0)
      ctx.lineTo(playheadPixel + 4, 0)
      ctx.closePath()
      ctx.fill()
    }
  }, [
    waveformData.duration,
    voiceActivityData.segments,
    insertionPoints,
    playheadPosition,
    height,
    showLabels,
    timeToPixel,
    getCanvasWidth
  ])

  // Handle canvas clicks for insertion point interaction
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!onInsertionPointClick) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left

    // Find clicked insertion point (within 10 pixels)
    const clickedPoint = insertionPoints.find(point => {
      const pointX = timeToPixel(point.timestamp)
      return Math.abs(x - pointX) <= 10
    })

    if (clickedPoint) {
      onInsertionPointClick(clickedPoint)
    }
  }, [insertionPoints, onInsertionPointClick, timeToPixel])

  // Redraw when dependencies change
  useEffect(() => {
    drawVoiceActivity()
  }, [drawVoiceActivity])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawVoiceActivity()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawVoiceActivity])

  return (
    <div className={`relative ${className}`}>
      {/* Legend */}
      {showLabels && (
        <div className="flex flex-wrap items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Voice</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 opacity-60 rounded border border-blue-400 border-dashed"></div>
            <span className="text-gray-600 dark:text-gray-400">Voice + Music</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Music</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Silence</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3 text-green-600" />
            <span className="text-gray-600 dark:text-gray-400">Insertion Point</span>
          </div>
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-transparent relative"
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-pointer"
          onClick={handleCanvasClick}
          style={{ display: 'block' }}
        />
      </div>

      {/* Analysis Info */}
      {showLabels && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-x-4">
          <span>Analysis Confidence: {Math.round(voiceActivityData.confidence)}%</span>
          <span>Voice Duration: {Math.round(voiceActivityData.totalVoiceDuration)}s</span>
          <span>Silence Duration: {Math.round(voiceActivityData.totalSilenceDuration)}s</span>
          {voiceActivityData.backgroundMusicPresent && (
            <span className="text-blue-600">Background Music Detected</span>
          )}
        </div>
      )}
    </div>
  )
} 