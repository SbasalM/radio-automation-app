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
  const [cursorType, setCursorType] = useState<'default' | 'col-resize' | 'pointer' | 'grab' | 'grabbing'>('default')
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState(0) // Horizontal pan offset in pixels
  const [lastPanX, setLastPanX] = useState(0)

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
    const basePixel = (time / waveformData.duration) * canvasWidth * zoom
    return basePixel + panOffset
  }, [waveformData.duration, zoom, panOffset, getCanvasWidth])

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number): number => {
    const canvasWidth = getCanvasWidth()
    const adjustedPixel = pixel - panOffset
    return (adjustedPixel / (canvasWidth * zoom)) * waveformData.duration
  }, [waveformData.duration, zoom, panOffset, getCanvasWidth])

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

    // Calculate visible peaks with better zoom handling
    const totalSamples = waveformData.peaks.length
    const visibleSamples = Math.floor(totalSamples / zoom)
    
    // Calculate which part of the waveform is visible based on pan offset
    const panRatio = -panOffset / (canvasWidth * zoom)
    const startSample = Math.max(0, Math.floor(panRatio * totalSamples))
    const endSample = Math.min(totalSamples, startSample + visibleSamples)

    // Draw waveform peaks
    ctx.fillStyle = '#3b82f6' // blue-500
    
    for (let x = 0; x < canvasWidth; x++) {
      const progress = x / canvasWidth
      const sampleIndex = Math.floor(startSample + progress * (endSample - startSample))
      
      if (sampleIndex >= waveformData.peaks.length) break

      const peakValue = waveformData.peaks[sampleIndex]
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

      // Draw drag handles - larger and more visible
      const handleWidth = 12
      const handleHeight = 20
      
      // Start handle
      ctx.fillStyle = '#dc2626' // red-600
      ctx.fillRect(startPixel - handleWidth / 2, waveformHeight - handleHeight, handleWidth, handleHeight)
      
      // Handle grip lines
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        const gripX = startPixel - 3 + (i * 2)
        ctx.beginPath()
        ctx.moveTo(gripX, waveformHeight - handleHeight + 4)
        ctx.lineTo(gripX, waveformHeight - 4)
        ctx.stroke()
      }
      
      // End handle
      ctx.fillStyle = '#dc2626' // red-600
      ctx.fillRect(endPixel - handleWidth / 2, waveformHeight - handleHeight, handleWidth, handleHeight)
      
      // Handle grip lines
      for (let i = 0; i < 3; i++) {
        const gripX = endPixel - 3 + (i * 2)
        ctx.beginPath()
        ctx.moveTo(gripX, waveformHeight - handleHeight + 4)
        ctx.lineTo(gripX, waveformHeight - 4)
        ctx.stroke()
      }
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

    // Calculate visible time range based on pan offset and zoom
    const totalDuration = waveformData.duration
    const visibleDuration = totalDuration / zoom
    const panTimeOffset = (-panOffset / (canvasWidth * zoom)) * totalDuration
    const startTime = Math.max(0, panTimeOffset)
    const endTime = Math.min(totalDuration, startTime + visibleDuration)
    
    const timeStep = Math.max(1, Math.floor(visibleDuration / (canvasWidth / 60))) // Tick every ~60px
    for (let time = Math.floor(startTime); time <= endTime; time += timeStep) {
      const relativeTime = time - startTime
      const x = (relativeTime / visibleDuration) * canvasWidth
      
      if (x < 0 || x > canvasWidth) continue

      // Draw tick mark
      ctx.strokeStyle = '#64748b'
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
    getCanvasWidth,
    panOffset
  ])

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setMousePosition({ x, y })

    // Handle panning
    if (isPanning && zoom > 1) {
      const deltaX = x - lastPanX
      const newPanOffset = panOffset + deltaX
      
      // Limit pan offset to reasonable bounds - allow more movement
      const canvasWidth = getCanvasWidth()
      const totalWidth = canvasWidth * zoom
      const maxPan = totalWidth - canvasWidth // Allow panning to show all content
      const minPan = -maxPan // Allow panning in both directions
      
      setPanOffset(Math.max(minPan, Math.min(maxPan, newPanOffset)))
      setLastPanX(x)
      setCursorType('grabbing')
      return
    }

    if (y < waveformHeight) {
      const time = pixelToTime(x)
      setHoverTime(Math.max(0, Math.min(waveformData.duration, time)))
      
      // Determine cursor type based on position
      if (!readonly && trimPoints) {
        const startPixel = timeToPixel(trimPoints.startTime)
        const endPixel = timeToPixel(trimPoints.endTime)
        const handleWidth = 12
        
        if (Math.abs(x - startPixel) <= handleWidth / 2 || Math.abs(x - endPixel) <= handleWidth / 2) {
          setCursorType('col-resize')
        } else if (zoom > 1) {
          setCursorType('grab')
        } else {
          setCursorType('pointer')
        }
      } else if (zoom > 1) {
        setCursorType('grab')
      } else {
        setCursorType('pointer')
      }
    } else {
      setHoverTime(null)
      setCursorType('default')
    }

    // Handle dragging trim points
    if (isDragging && trimPoints && onTrimChange) {
      const time = Math.max(0, Math.min(waveformData.duration, pixelToTime(x)))
      
      if (isDragging === 'start') {
        // Ensure start time doesn't go beyond end time minus minimum gap
        const minGap = 1 // minimum 1 second between handles
        const maxStartTime = Math.max(0, trimPoints.endTime - minGap)
        const newStartTime = Math.min(time, maxStartTime)
        
        // Only update if there's a meaningful change to prevent loops
        if (Math.abs(newStartTime - trimPoints.startTime) > 0.1) {
          onTrimChange({
            ...trimPoints,
            startTime: newStartTime
          })
        }
      } else if (isDragging === 'end') {
        // Ensure end time doesn't go before start time plus minimum gap
        const minGap = 1 // minimum 1 second between handles
        const minEndTime = Math.min(waveformData.duration, trimPoints.startTime + minGap)
        const newEndTime = Math.max(time, minEndTime)
        
        // Only update if there's a meaningful change to prevent loops
        if (Math.abs(newEndTime - trimPoints.endTime) > 0.1) {
          onTrimChange({
            ...trimPoints,
            endTime: newEndTime
          })
        }
      }
    }
  }, [
    isDragging, 
    trimPoints, 
    pixelToTime, 
    waveformData.duration, 
    waveformHeight, 
    readonly, 
    timeToPixel,
    isPanning,
    zoom,
    panOffset,
    lastPanX,
    getCanvasWidth
  ])

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
        const handleWidth = 12

        // Check if clicking on trim handles
        if (Math.abs(x - startPixel) <= handleWidth / 2) {
          setIsDragging('start')
          return
        }
        
        if (Math.abs(x - endPixel) <= handleWidth / 2) {
          setIsDragging('end')
          return
        }
      }

      // Start panning if zoomed in and not clicking on handles
      if (zoom > 1) {
        setIsPanning(true)
        setLastPanX(x)
        setCursorType('grabbing')
        return
      }

      // Click to set playhead position
      const time = pixelToTime(x)
      onTimeClick?.(Math.max(0, Math.min(waveformData.duration, time)))
    }
  }, [readonly, trimPoints, timeToPixel, pixelToTime, onTimeClick, waveformData.duration, waveformHeight, zoom])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
    setIsPanning(false)
    setCursorType('default')
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null)
    setMousePosition(null)
    setIsDragging(null)
    setIsPanning(false)
    setCursorType('default')
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
    setPanOffset(0)
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
          className={`w-full ${
            cursorType === 'col-resize' ? 'cursor-col-resize' : 
            cursorType === 'pointer' ? 'cursor-pointer' : 
            cursorType === 'grab' ? 'cursor-grab' :
            cursorType === 'grabbing' ? 'cursor-grabbing' :
            'cursor-default'
          }`}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {!readonly && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Click anywhere on the waveform to set playback position. {trimPoints ? 'Drag the red handles at the bottom to adjust trim points.' : ''} Use zoom controls for precise editing. {zoom > 1 ? 'When zoomed in, drag the waveform to pan left/right.' : ''}
        </div>
      )}
    </div>
  )
} 