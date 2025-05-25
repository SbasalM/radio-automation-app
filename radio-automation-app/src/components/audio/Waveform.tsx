import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WaveformData, TrimPoints } from '@/types/audio'

interface WaveformProps {
  waveformData: WaveformData
  trimPoints?: TrimPoints
  playheadPosition?: number // Current playback position in seconds
  onTimeClick?: (time: number) => void
  onTrimChange?: (trimPoints: TrimPoints) => void
  className?: string
  height?: number
  showControls?: boolean
  readonly?: boolean
}

export function Waveform({
  waveformData,
  trimPoints,
  playheadPosition = 0,
  onTimeClick,
  onTrimChange,
  className = '',
  height = 120,
  showControls = true,
  readonly = false
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  const timeRulerHeight = 30
  const waveformHeight = height - timeRulerHeight

  // Calculate zoom bounds
  const maxZoom = 10
  const minZoom = 0.5

  // Get canvas dimensions
  const getCanvasWidth = useCallback(() => {
    return containerRef.current?.clientWidth || 800
  }, [])

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number): number => {
    const canvasWidth = getCanvasWidth()
    return (time / waveformData.duration) * canvasWidth * zoom
  }, [waveformData.duration, zoom, getCanvasWidth])

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number): number => {
    const canvasWidth = getCanvasWidth()
    return (pixel / (canvasWidth * zoom)) * waveformData.duration
  }, [waveformData.duration, zoom, getCanvasWidth])

  // Draw waveform
  const drawWaveform = useCallback(() => {
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

    // Clear canvas
    ctx.fillStyle = '#1e293b' // slate-800
    ctx.fillRect(0, 0, canvasWidth, height)

    // Draw time ruler background
    ctx.fillStyle = '#334155' // slate-700
    ctx.fillRect(0, waveformHeight, canvasWidth, timeRulerHeight)

    // Calculate visible peaks
    const peaksPerPixel = Math.max(1, Math.floor(waveformData.peaks.length / (canvasWidth * zoom)))
    const visiblePeaks = Math.min(waveformData.peaks.length, canvasWidth * zoom)

    // Draw waveform peaks
    ctx.fillStyle = '#3b82f6' // blue-500
    
    for (let x = 0; x < canvasWidth; x++) {
      const peakIndex = Math.floor((x / canvasWidth) * visiblePeaks)
      if (peakIndex >= waveformData.peaks.length) break

      // Average nearby peaks for smoother visualization when zoomed out
      let peakValue = 0
      const peakCount = Math.max(1, peaksPerPixel)
      for (let i = 0; i < peakCount && peakIndex + i < waveformData.peaks.length; i++) {
        peakValue += waveformData.peaks[peakIndex + i]
      }
      peakValue /= peakCount

      const peakHeight = peakValue * (waveformHeight - 20) // Leave some padding
      const y = (waveformHeight - peakHeight) / 2

      ctx.fillRect(x, y, 1, peakHeight)
    }

    // Draw trim areas (darker overlay outside trim points)
    if (trimPoints && !readonly) {
      const startPixel = timeToPixel(trimPoints.startTime)
      const endPixel = timeToPixel(trimPoints.endTime)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      
      // Before start trim
      if (startPixel > 0) {
        ctx.fillRect(0, 0, startPixel, waveformHeight)
      }
      
      // After end trim
      if (endPixel < canvasWidth) {
        ctx.fillRect(endPixel, 0, canvasWidth - endPixel, waveformHeight)
      }

      // Draw trim handles
      ctx.strokeStyle = '#ef4444' // red-500
      ctx.lineWidth = 2
      
      // Start trim line
      ctx.beginPath()
      ctx.moveTo(startPixel, 0)
      ctx.lineTo(startPixel, waveformHeight)
      ctx.stroke()
      
      // End trim line
      ctx.beginPath()
      ctx.moveTo(endPixel, 0)
      ctx.lineTo(endPixel, waveformHeight)
      ctx.stroke()

      // Draw drag handles
      const handleSize = 8
      ctx.fillStyle = '#ef4444' // red-500
      
      // Start handle
      ctx.fillRect(startPixel - handleSize / 2, waveformHeight - handleSize - 5, handleSize, handleSize)
      
      // End handle
      ctx.fillRect(endPixel - handleSize / 2, waveformHeight - handleSize - 5, handleSize, handleSize)
    }

    // Draw playhead
    if (playheadPosition > 0) {
      const playheadPixel = timeToPixel(playheadPosition)
      ctx.strokeStyle = '#10b981' // emerald-500
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadPixel, 0)
      ctx.lineTo(playheadPixel, waveformHeight)
      ctx.stroke()
    }

    // Draw time ruler
    ctx.fillStyle = '#64748b' // slate-500
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'

    const timeStep = Math.max(5, Math.floor(waveformData.duration / (canvasWidth / 60))) // Tick every ~60px
    for (let time = 0; time <= waveformData.duration; time += timeStep) {
      const x = timeToPixel(time)
      if (x > canvasWidth) break

      // Draw tick mark
      ctx.beginPath()
      ctx.moveTo(x, waveformHeight)
      ctx.lineTo(x, waveformHeight + 5)
      ctx.stroke()

      // Draw time label
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
      ctx.fillText(timeLabel, x, waveformHeight + 20)
    }

    // Draw hover indicator
    if (hoverTime !== null && mousePosition) {
      const hoverPixel = timeToPixel(hoverTime)
      
      // Vertical line
      ctx.strokeStyle = '#f59e0b' // amber-500
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hoverPixel, 0)
      ctx.lineTo(hoverPixel, waveformHeight)
      ctx.stroke()

      // Time tooltip
      const minutes = Math.floor(hoverTime / 60)
      const seconds = Math.floor(hoverTime % 60)
      const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
      
      const tooltipWidth = 50
      const tooltipHeight = 20
      const tooltipX = Math.max(0, Math.min(canvasWidth - tooltipWidth, mousePosition.x - tooltipWidth / 2))
      const tooltipY = Math.max(0, mousePosition.y - tooltipHeight - 10)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)
      
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(timeLabel, tooltipX + tooltipWidth / 2, tooltipY + 14)
    }
  }, [
    waveformData, 
    trimPoints, 
    playheadPosition, 
    zoom, 
    hoverTime, 
    mousePosition, 
    height, 
    readonly,
    timeToPixel,
    getCanvasWidth
  ])

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePosition({ x, y })

    if (y < waveformHeight) {
      const time = pixelToTime(x)
      setHoverTime(Math.max(0, Math.min(waveformData.duration, time)))
    } else {
      setHoverTime(null)
    }

    // Handle dragging trim points
    if (isDragging && trimPoints && onTrimChange) {
      const time = Math.max(0, Math.min(waveformData.duration, pixelToTime(x)))
      
      if (isDragging === 'start') {
        onTrimChange({
          ...trimPoints,
          startTime: Math.min(time, trimPoints.endTime - 1)
        })
      } else if (isDragging === 'end') {
        onTrimChange({
          ...trimPoints,
          endTime: Math.max(time, trimPoints.startTime + 1)
        })
      }
    }
  }, [isDragging, trimPoints, onTrimChange, pixelToTime, waveformData.duration, waveformHeight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readonly) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (y < waveformHeight) {
      if (trimPoints) {
        const startPixel = timeToPixel(trimPoints.startTime)
        const endPixel = timeToPixel(trimPoints.endTime)
        const handleSize = 8

        // Check if clicking on trim handles
        if (Math.abs(x - startPixel) <= handleSize) {
          setIsDragging('start')
          return
        }
        
        if (Math.abs(x - endPixel) <= handleSize) {
          setIsDragging('end')
          return
        }
      }

      // Click to set playhead position
      const time = pixelToTime(x)
      onTimeClick?.(Math.max(0, Math.min(waveformData.duration, time)))
    }
  }, [readonly, trimPoints, timeToPixel, pixelToTime, onTimeClick, waveformData.duration, waveformHeight])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null)
    setMousePosition(null)
    setIsDragging(null)
  }, [])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(maxZoom, prev * 1.5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(minZoom, prev / 1.5))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  // Redraw when dependencies change
  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawWaveform()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawWaveform])

  return (
    <div className={`relative ${className}`}>
      {showControls && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= minZoom}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= maxZoom}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomReset}
              disabled={zoom === 1}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Duration: {Math.floor(waveformData.duration / 60)}:{(Math.floor(waveformData.duration % 60)).toString().padStart(2, '0')}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-slate-800"
      >
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {!readonly && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Click to set playback position. {trimPoints ? 'Drag red handles to adjust trim points.' : ''}
        </div>
      )}
    </div>
  )
} 