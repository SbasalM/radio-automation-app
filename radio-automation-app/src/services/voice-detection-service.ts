import type { 
  AudioFile, 
  VoiceActivityData, 
  VoiceSegment, 
  PromoInsertionPoint,
  PromoTagSettings 
} from '@/types/audio'

class VoiceDetectionService {
  // Analyze audio file for voice activity
  async analyzeAudio(audioFile: AudioFile, settings?: Partial<PromoTagSettings>): Promise<VoiceActivityData> {
    console.log(`🎤 Analyzing voice activity in: ${audioFile.filename}`)
    
    const analysisStartTime = Date.now()
    
    // Simulate analysis delay based on file duration
    const analysisTime = Math.max(3000, audioFile.duration * 200) // ~200ms per second
    await new Promise(resolve => setTimeout(resolve, analysisTime))
    
    // Generate realistic voice segments
    const segments = this.generateVoiceSegments(audioFile)
    
    // Calculate overall statistics
    const voiceSegments = segments.filter(s => s.segmentType === 'voice')
    const totalVoiceDuration = voiceSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    const totalSilenceDuration = segments
      .filter(s => s.segmentType === 'silence')
      .reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
    
    const backgroundMusicPresent = segments.some(s => s.hasBackgroundMusic)
    const overallConfidence = this.calculateOverallConfidence(segments, backgroundMusicPresent)
    
    const voiceActivityData: VoiceActivityData = {
      segments,
      confidence: overallConfidence,
      backgroundMusicPresent,
      totalVoiceDuration,
      totalSilenceDuration,
      analysisTimeMs: Date.now() - analysisStartTime
    }
    
    console.log(`✅ Voice analysis complete: ${segments.length} segments, ${Math.round(overallConfidence)}% confidence`)
    return voiceActivityData
  }

  // Generate realistic voice segments for different content types
  private generateVoiceSegments(audioFile: AudioFile): VoiceSegment[] {
    const segments: VoiceSegment[] = []
    const duration = audioFile.duration
    
    // Determine content type based on filename patterns
    const contentType = this.guessContentType(audioFile.filename)
    
    let currentTime = 0
    
    while (currentTime < duration) {
      const segment = this.generateNextSegment(currentTime, duration, contentType)
      segments.push(segment)
      currentTime = segment.endTime
    }
    
    return segments
  }

  // Guess content type from filename for realistic simulation
  private guessContentType(filename: string): 'talk-show' | 'music-show' | 'news' | 'sports' | 'interview' | 'unknown' {
    const lower = filename.toLowerCase()
    
    if (lower.includes('talk') || lower.includes('show')) return 'talk-show'
    if (lower.includes('music') || lower.includes('dj')) return 'music-show'
    if (lower.includes('news') || lower.includes('report')) return 'news'
    if (lower.includes('sport') || lower.includes('game')) return 'sports'
    if (lower.includes('interview')) return 'interview'
    
    return 'unknown'
  }

  // Generate the next realistic segment based on content type
  private generateNextSegment(startTime: number, maxDuration: number, contentType: 'talk-show' | 'music-show' | 'news' | 'sports' | 'interview' | 'unknown'): VoiceSegment {
    const remaining = maxDuration - startTime
    
    // Content type affects segment patterns
    const patterns = this.getSegmentPatterns(contentType)
    const pattern = patterns[Math.floor(Math.random() * patterns.length)]
    
    const duration = Math.min(
      remaining,
      pattern.minDuration + Math.random() * (pattern.maxDuration - pattern.minDuration)
    )
    
    const hasBackgroundMusic = Math.random() < pattern.musicProbability
    const confidence = hasBackgroundMusic 
      ? 70 + Math.random() * 20  // 70-90% with music
      : 90 + Math.random() * 10  // 90-100% without music
      
    const amplitude = pattern.segmentType === 'voice' 
      ? 0.6 + Math.random() * 0.3 // 0.6-0.9 for voice
      : pattern.segmentType === 'music' 
        ? 0.4 + Math.random() * 0.4 // 0.4-0.8 for music
        : 0.05 + Math.random() * 0.1 // 0.05-0.15 for silence

    return {
      startTime,
      endTime: startTime + duration,
      confidence,
      hasBackgroundMusic,
      amplitude,
      segmentType: pattern.segmentType
    }
  }

  // Get segment patterns for different content types
  private getSegmentPatterns(contentType: 'talk-show' | 'music-show' | 'news' | 'sports' | 'interview' | 'unknown') {
    const patterns = {
      'talk-show': [
        { segmentType: 'voice' as const, minDuration: 15, maxDuration: 45, musicProbability: 0.3 },
        { segmentType: 'silence' as const, minDuration: 1, maxDuration: 4, musicProbability: 0.0 },
        { segmentType: 'music' as const, minDuration: 8, maxDuration: 20, musicProbability: 0.9 }
      ],
      'music-show': [
        { segmentType: 'voice' as const, minDuration: 5, maxDuration: 15, musicProbability: 0.7 },
        { segmentType: 'music' as const, minDuration: 30, maxDuration: 90, musicProbability: 0.9 },
        { segmentType: 'silence' as const, minDuration: 0.5, maxDuration: 2, musicProbability: 0.0 }
      ],
      'news': [
        { segmentType: 'voice' as const, minDuration: 10, maxDuration: 30, musicProbability: 0.1 },
        { segmentType: 'silence' as const, minDuration: 1, maxDuration: 3, musicProbability: 0.0 }
      ],
      'sports': [
        { segmentType: 'voice' as const, minDuration: 20, maxDuration: 60, musicProbability: 0.2 },
        { segmentType: 'silence' as const, minDuration: 0.5, maxDuration: 2, musicProbability: 0.0 }
      ],
      'interview': [
        { segmentType: 'voice' as const, minDuration: 8, maxDuration: 25, musicProbability: 0.1 },
        { segmentType: 'silence' as const, minDuration: 1, maxDuration: 5, musicProbability: 0.0 }
      ],
      'unknown': [
        { segmentType: 'voice' as const, minDuration: 10, maxDuration: 30, musicProbability: 0.2 },
        { segmentType: 'silence' as const, minDuration: 1, maxDuration: 3, musicProbability: 0.0 }
      ]
    }
    
    return patterns[contentType]
  }

  // Calculate overall confidence based on segments
  private calculateOverallConfidence(segments: VoiceSegment[], hasBackgroundMusic: boolean): number {
    if (segments.length === 0) return 0
    
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
    
    // Adjust based on analysis quality factors
    let adjustedConfidence = avgConfidence
    
    // Background music reduces confidence
    if (hasBackgroundMusic) {
      adjustedConfidence *= 0.9
    }
    
    // More segments generally mean better analysis
    const segmentBonus = Math.min(10, segments.length * 2)
    adjustedConfidence += segmentBonus
    
    return Math.min(100, Math.max(0, adjustedConfidence))
  }

  // Detect speech endpoints for promo insertion
  async detectSpeechEndpoints(
    voiceActivityData: VoiceActivityData, 
    settings: Partial<PromoTagSettings> = {}
  ): Promise<PromoInsertionPoint[]> {
    console.log(`🔍 Detecting speech endpoints for promo insertion`)
    
    const minGapDuration = settings.minimumGapDuration || 2 // seconds
    const confidenceThreshold = settings.confidenceThreshold || 75
    const backgroundMusicHandling = settings.backgroundMusicHandling || 'moderate'
    
    const insertionPoints: PromoInsertionPoint[] = []
    const segments = voiceActivityData.segments
    
    for (let i = 0; i < segments.length - 1; i++) {
      const currentSegment = segments[i]
      const nextSegment = segments[i + 1]
      
      // Look for voice followed by silence
      if (currentSegment.segmentType === 'voice' && nextSegment.segmentType === 'silence') {
        const gapDuration = nextSegment.endTime - nextSegment.startTime
        
        // Check if gap is long enough
        if (gapDuration >= minGapDuration) {
          const insertionPoint = this.createInsertionPoint(
            currentSegment,
            nextSegment,
            segments[i + 2], // Context after silence
            gapDuration,
            backgroundMusicHandling
          )
          
          // Only include if meets confidence threshold
          if (insertionPoint.confidence >= confidenceThreshold) {
            insertionPoints.push(insertionPoint)
          }
        }
      }
    }
    
    console.log(`✅ Found ${insertionPoints.length} potential insertion points`)
    return insertionPoints
  }

  // Create an insertion point with context and confidence
  private createInsertionPoint(
    voiceSegment: VoiceSegment,
    silenceSegment: VoiceSegment,
    nextSegment: VoiceSegment | undefined,
    gapDuration: number,
    backgroundMusicHandling: string
  ): PromoInsertionPoint {
    // Calculate confidence based on various factors
    let confidence = 85 // Base confidence
    
    // Longer gaps are better for insertion
    if (gapDuration >= 4) confidence += 10
    if (gapDuration >= 6) confidence += 5
    
    // Background music affects confidence
    if (voiceSegment.hasBackgroundMusic) {
      const penalty = backgroundMusicHandling === 'strict' ? 20 : 
                     backgroundMusicHandling === 'moderate' ? 10 : 5
      confidence -= penalty
    }
    
    // Voice segment confidence affects insertion confidence
    confidence = (confidence + voiceSegment.confidence) / 2
    
    // Determine optimal insertion timestamp (1-2 seconds after voice ends)
    const insertionDelay = 1 + Math.random() * 1 // 1-2 seconds
    const timestamp = voiceSegment.endTime + insertionDelay
    
    // Generate context descriptions
    const contextBefore = this.generateContextDescription(voiceSegment, 'before')
    const contextAfter = this.generateContextDescription(nextSegment, 'after')
    
    // Generate reason for suggestion
    const reason = this.generateInsertionReason(gapDuration, confidence, voiceSegment.hasBackgroundMusic)
    
    return {
      timestamp,
      confidence: Math.min(100, Math.max(0, confidence)),
      gapDuration,
      contextBefore,
      contextAfter,
      reason
    }
  }

  // Generate context descriptions for insertion points
  private generateContextDescription(segment: VoiceSegment | undefined, position: 'before' | 'after'): string {
    if (!segment) return position === 'after' ? 'End of content' : 'Start of content'
    
    const duration = Math.round(segment.endTime - segment.startTime)
    const confidence = Math.round(segment.confidence)
    
    switch (segment.segmentType) {
      case 'voice':
        return `${duration}s speech segment (${confidence}% confidence)${segment.hasBackgroundMusic ? ' with music' : ''}`
      case 'music':
        return `${duration}s music segment`
      case 'silence':
        return `${duration}s silence`
      default:
        return `${duration}s unknown content`
    }
  }

  // Generate human-readable reason for insertion suggestion
  private generateInsertionReason(gapDuration: number, confidence: number, hasBackgroundMusic: boolean): string {
    const reasons = []
    
    if (gapDuration >= 4) {
      reasons.push(`Long silence gap (${Math.round(gapDuration)}s)`)
    } else {
      reasons.push(`Natural speech break (${Math.round(gapDuration)}s)`)
    }
    
    if (confidence >= 90) {
      reasons.push('high confidence detection')
    } else if (confidence >= 75) {
      reasons.push('good confidence detection')
    } else {
      reasons.push('moderate confidence detection')
    }
    
    if (hasBackgroundMusic) {
      reasons.push('background music present')
    } else {
      reasons.push('clean audio')
    }
    
    return reasons.join(', ')
  }

  // Suggest optimal promo insertion points
  async suggestInsertionPoints(
    voiceActivityData: VoiceActivityData,
    settings: Partial<PromoTagSettings> = {}
  ): Promise<PromoInsertionPoint[]> {
    const allPoints = await this.detectSpeechEndpoints(voiceActivityData, settings)
    
    // Sort by confidence and select best points
    const sortedPoints = allPoints.sort((a, b) => b.confidence - a.confidence)
    
    // Limit insertions based on content duration and settings
    const maxInsertions = Math.min(
      settings.maximumInsertionsPerHour ? 
        Math.ceil((voiceActivityData.totalVoiceDuration / 3600) * settings.maximumInsertionsPerHour) : 3,
      sortedPoints.length
    )
    
    return sortedPoints.slice(0, maxInsertions)
  }

  // Filter segments to focus on speech over music
  filterMusicFromSpeech(segments: VoiceSegment[]): VoiceSegment[] {
    return segments.filter(segment => {
      // Keep voice segments and clean silence
      if (segment.segmentType === 'voice') return true
      if (segment.segmentType === 'silence' && !segment.hasBackgroundMusic) return true
      
      // Filter out pure music segments
      return false
    })
  }

  // Estimate processing time for voice analysis
  estimateProcessingTime(audioFile: AudioFile): number {
    // Base time + duration-based time
    return Math.max(3000, audioFile.duration * 150) // ~150ms per second
  }

  // Format time for display
  formatConfidence(confidence: number): string {
    if (confidence >= 95) return 'Excellent'
    if (confidence >= 85) return 'Very Good' 
    if (confidence >= 75) return 'Good'
    if (confidence >= 65) return 'Fair'
    return 'Poor'
  }
}

// Singleton instance
export const voiceDetectionService = new VoiceDetectionService() 