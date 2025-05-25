import { useState, useCallback } from 'react'
import { X, Play, Pause, Check, X as XIcon, Volume2, Clock, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AudioPlayer } from '@/components/audio/AudioPlayer'
import { VoiceActivityVisualizer } from '@/components/audio/VoiceActivityVisualizer'
import { Waveform } from '@/components/audio/Waveform'
import type { 
  AudioFile, 
  PromoInsertion, 
  PromoInsertionPoint, 
  VoiceActivityData, 
  WaveformData 
} from '@/types/audio'

interface ReviewTagsModalProps {
  isOpen: boolean
  onClose: () => void
  audioFile: AudioFile
  insertions: PromoInsertion[]
  voiceActivityData: VoiceActivityData
  waveformData: WaveformData
  onApproveInsertion: (index: number) => void
  onRejectInsertion: (index: number) => void
  onSaveChanges: (approvedInsertions: PromoInsertion[]) => void
  fileName: string
  showName: string
}

export function ReviewTagsModal({
  isOpen,
  onClose,
  audioFile,
  insertions,
  voiceActivityData,
  waveformData,
  onApproveInsertion,
  onRejectInsertion,
  onSaveChanges,
  fileName,
  showName
}: ReviewTagsModalProps) {
  const [selectedInsertionIndex, setSelectedInsertionIndex] = useState<number | null>(null)
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [previewContext, setPreviewContext] = useState<{ start: number; end: number } | null>(null)

  if (!isOpen) return null

  // Preview insertion context (±5 seconds around insertion point)
  const previewInsertion = useCallback((index: number) => {
    const insertion = insertions[index]
    const timestamp = insertion.insertionPoint.timestamp
    const contextStart = Math.max(0, timestamp - 5)
    const contextEnd = Math.min(audioFile.duration, timestamp + insertion.selectedPromo.duration + 5)
    
    setPreviewContext({ start: contextStart, end: contextEnd })
    setPlayheadPosition(contextStart)
    setSelectedInsertionIndex(index)
    setIsPlayingPreview(true)
    
    // Simulate preview playing for the context duration
    const previewDuration = (contextEnd - contextStart) * 1000
    setTimeout(() => {
      setIsPlayingPreview(false)
      setPreviewContext(null)
    }, previewDuration)
  }, [insertions, audioFile.duration])

  // Get approved and rejected insertions
  const approvedInsertions = insertions.filter(insertion => insertion.approved)
  const rejectedInsertions = insertions.filter(insertion => !insertion.approved)

  // Calculate statistics
  const totalOriginalDuration = audioFile.duration
  const totalPromoTime = approvedInsertions.reduce((sum, insertion) => sum + insertion.selectedPromo.duration, 0)
  const finalDuration = totalOriginalDuration + totalPromoTime
  const averageConfidence = insertions.length > 0 
    ? insertions.reduce((sum, insertion) => sum + insertion.insertionPoint.confidence, 0) / insertions.length 
    : 0

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-600 dark:text-green-400'
    if (confidence >= 80) return 'text-blue-600 dark:text-blue-400'
    if (confidence >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const handleSave = () => {
    onSaveChanges(approvedInsertions)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Review Auto-Tagged Promos</span>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {fileName} • {showName}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {insertions.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Insertions</div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {approvedInsertions.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(averageConfidence)}`}>
                  {Math.round(averageConfidence)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  +{formatTime(totalPromoTime)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Content Added</div>
              </CardContent>
            </Card>
          </div>

          {/* Waveform with Voice Activity and Insertion Points */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audio Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Waveform
                  waveformData={waveformData}
                  playheadPosition={playheadPosition}
                  onTimeClick={setPlayheadPosition}
                  height={100}
                  readonly={true}
                />
                <div className="absolute inset-0 pointer-events-none">
                  <VoiceActivityVisualizer
                    waveformData={waveformData}
                    voiceActivityData={voiceActivityData}
                    insertionPoints={insertions.map(i => i.insertionPoint)}
                    playheadPosition={playheadPosition}
                    height={100}
                    showLabels={false}
                  />
                </div>
              </div>
              
              {/* Audio Player */}
              <AudioPlayer
                audioFile={audioFile}
                onTimeUpdate={setPlayheadPosition}
              />
              
              {/* Preview Context Indicator */}
              {previewContext && (
                <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                  <strong>Previewing:</strong> {formatTime(previewContext.start)} - {formatTime(previewContext.end)} 
                  (Context around insertion point {selectedInsertionIndex !== null ? selectedInsertionIndex + 1 : ''})
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insertion Points Review */}
          <Card>
            <CardHeader>
              <CardTitle>Insertion Points Review</CardTitle>
            </CardHeader>
            <CardContent>
              {insertions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No insertion points to review
                </div>
              ) : (
                <div className="space-y-4">
                  {insertions.map((insertion, index) => (
                    <Card 
                      key={index} 
                      className={`border-2 transition-all ${
                        insertion.approved 
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      } ${selectedInsertionIndex === index ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Insertion Details */}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {insertion.selectedPromo.name}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    At {formatTime(insertion.insertionPoint.timestamp)} • 
                                    Duration: {formatTime(insertion.selectedPromo.duration)} • 
                                    Confidence: <span className={getConfidenceColor(insertion.insertionPoint.confidence)}>
                                      {Math.round(insertion.insertionPoint.confidence)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  insertion.approved 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {insertion.approved ? 'Approved' : 'Rejected'}
                                </span>
                              </div>
                            </div>

                            {/* Context Information */}
                            <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div>
                                  <strong>Before:</strong> {insertion.insertionPoint.contextBefore}
                                </div>
                                <div>
                                  <strong>Insertion:</strong> {insertion.selectedPromo.name}
                                </div>
                                <div>
                                  <strong>After:</strong> {insertion.insertionPoint.contextAfter}
                                </div>
                              </div>
                            </div>

                            {/* Technical Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Crossfade:</span>
                                <span className="ml-2 font-medium">{insertion.crossfadeDuration.toFixed(1)}s</span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Volume:</span>
                                <span className="ml-2 font-medium">
                                  {insertion.volumeAdjustment > 0 ? '+' : ''}{insertion.volumeAdjustment}dB
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Gap Duration:</span>
                                <span className="ml-2 font-medium">{insertion.insertionPoint.gapDuration.toFixed(1)}s</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => previewInsertion(index)}
                              disabled={isPlayingPreview && selectedInsertionIndex === index}
                            >
                              {isPlayingPreview && selectedInsertionIndex === index ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Button
                              variant={insertion.approved ? "default" : "outline"}
                              size="sm"
                              onClick={() => onApproveInsertion(index)}
                              className={insertion.approved ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant={!insertion.approved ? "default" : "outline"}
                              size="sm"
                              onClick={() => onRejectInsertion(index)}
                              className={!insertion.approved ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Final Result Summary
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Original: {formatTime(totalOriginalDuration)} → Final: {formatTime(finalDuration)} 
                    (+{formatTime(totalPromoTime)} from {approvedInsertions.length} promos)
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes ({approvedInsertions.length} approved)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
} 