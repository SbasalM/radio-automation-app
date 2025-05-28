import type { 
  AudioFile, 
  WaveformData, 
  TrimPoints, 
  AudioProcessingJob, 
  AudioOperation,
  TrimOperation,
  NormalizeOperation 
} from '@/types/audio'

class AudioService {
  // Audio file analysis - get real data from backend
  async analyzeAudioFile(filename: string, fileSize: number = 0): Promise<AudioFile> {
    console.log(`🎵 Analyzing audio file: ${filename}`)
    
    try {
      // First, try to get file info from backend including content-length
      const headResponse = await fetch(`http://localhost:3001/api/audio/${filename}`, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      })
      
      if (!headResponse.ok) {
        throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`)
      }
      
      console.log('✅ Backend audio endpoint accessible')
      
      // Get file size from response headers if not provided
      const contentLength = headResponse.headers.get('content-length')
      const actualFileSize = fileSize || (contentLength ? parseInt(contentLength) : 0)
      
      console.log(`📁 File size: ${actualFileSize} bytes`)
      
      // Try to get real metadata from backend
      let realDuration = null
      let realSampleRate = 44100
      let realChannels = 2
      let realFormat = 'wav'
      
      try {
        console.log('🔍 Fetching real metadata from backend...')
        const metadataResponse = await fetch(`http://localhost:3001/api/audio/metadata/${filename}`)
        
        if (metadataResponse.ok) {
          const metadataResult = await metadataResponse.json()
          if (metadataResult.success && metadataResult.metadata) {
            realDuration = metadataResult.metadata.duration
            realSampleRate = metadataResult.metadata.sampleRate || 44100
            realChannels = metadataResult.metadata.channels || 2
            realFormat = metadataResult.metadata.format || 'wav'
            console.log(`✅ Real metadata: ${realDuration}s, ${realSampleRate}Hz, ${realChannels}ch, ${realFormat}`)
          }
        }
      } catch (metadataError) {
        console.warn('Could not fetch metadata from backend:', metadataError)
      }
      
      // Use real duration if available, otherwise calculate from file size
      let calculatedDuration = realDuration || 300 // Default fallback
      
      if (!realDuration) {
        if (actualFileSize > 0) {
          // For WAV files: rough calculation based on file size
          // WAV at CD quality (44.1kHz, 16-bit, stereo) = ~176KB per second
          const estimatedSeconds = actualFileSize / (44100 * 2 * 2) // Sample rate * channels * bytes per sample
          calculatedDuration = Math.max(30, Math.min(3600, estimatedSeconds))
          console.log(`📊 Calculated duration from file size: ${Math.round(calculatedDuration)}s`)
        } else {
          console.log('⚠️ Using default duration (no file size or metadata available)')
        }
      }
      
      // Create the audio file object with real or calculated data
      const format = realFormat || (filename.toLowerCase().includes('.wav') ? 'wav' : 
                     filename.toLowerCase().includes('.flac') ? 'flac' : 'mp3')
      
      const audioFile: AudioFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        filename,
        duration: calculatedDuration,
        sampleRate: realSampleRate,
        channels: realChannels,
        format,
        bitRate: format === 'mp3' ? 128 : undefined,
        fileSize: actualFileSize,
        filePath: `http://localhost:3001/api/audio/${filename}`,
        createdAt: new Date(),
        lastModified: new Date()
      }
      
      console.log(`✅ Audio analysis complete: ${Math.round(audioFile.duration)}s, ${audioFile.sampleRate}Hz, ${audioFile.channels}ch`)
      return audioFile
      
    } catch (error) {
      console.warn('Failed to access backend audio endpoint:', error)
      
      // Enhanced fallback for when backend isn't available
      let fallbackDuration = 300
      
      if (fileSize > 0) {
        // File size based estimation
        const estimatedMinutes = fileSize / (10 * 1024 * 1024)
        fallbackDuration = Math.max(30, Math.min(1800, estimatedMinutes * 60))
      }
      
      const format = filename.toLowerCase().includes('.wav') ? 'wav' : 
                     filename.toLowerCase().includes('.flac') ? 'flac' : 'mp3'
      
      const audioFile: AudioFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        filename,
        duration: fallbackDuration,
        sampleRate: 44100,
        channels: 2,
        format,
        bitRate: format === 'mp3' ? 128 : undefined,
        fileSize: fileSize || Math.floor(fallbackDuration * 128000 / 8),
        filePath: `http://localhost:3001/api/audio/${filename}`,
        createdAt: new Date(),
        lastModified: new Date()
      }
      
      console.log(`✅ Audio analysis complete (offline): ${Math.round(fallbackDuration)}s`)
      return audioFile
    }
  }

  // Generate waveform data from backend
  async generateWaveformData(audioFile: AudioFile, pixelWidth: number = 800): Promise<WaveformData> {
    console.log(`🎵 Generating waveform for: ${audioFile.filename}, width: ${pixelWidth}`)
    
    try {
      // Call backend waveform generation endpoint
      const response = await fetch(`http://localhost:3001/api/audio/waveform/${audioFile.filename}?width=${pixelWidth}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Waveform API responded with status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success || !result.waveformData) {
        throw new Error('Invalid waveform response from backend')
      }
      
      console.log(`✅ Real waveform generated: ${result.waveformData.peaks.length} points, duration: ${result.waveformData.duration}s`)
      
      // Use the real duration from the backend waveform data
      return {
        ...result.waveformData,
        duration: result.waveformData.duration // Ensure we use the backend's duration
      }
      
    } catch (error) {
      console.warn('Failed to get real waveform from backend, using fallback:', error)
      
      // Fallback to local mock generation if backend fails
      return this.generateFallbackWaveform(audioFile, pixelWidth)
    }
  }
  
  // Fallback waveform generation (moved from original generateWaveformData)
  private generateFallbackWaveform(audioFile: AudioFile, pixelWidth: number = 800): WaveformData {
    const { duration, sampleRate, channels } = audioFile
    const samplesPerPixel = Math.floor((duration * sampleRate) / pixelWidth)
    
    const peaks: number[] = []
    
    // Generate realistic waveform with varying levels
    for (let i = 0; i < pixelWidth; i++) {
      const progress = i / pixelWidth
      
      // Create natural audio envelope (quieter at start/end)
      let envelope = 1.0
      if (progress < 0.05) {
        envelope = progress / 0.05 // Fade in first 5%
      } else if (progress > 0.95) {
        envelope = (1.0 - progress) / 0.05 // Fade out last 5%
      }
      
      // Add some randomness with occasional peaks
      const baseLevel = 0.3 + Math.random() * 0.4 // 30-70% base level
      const peak = Math.random() > 0.85 ? Math.random() * 0.3 : 0 // Occasional peaks
      const noise = (Math.random() - 0.5) * 0.1 // Small random variations
      
      const level = Math.min(1.0, Math.max(0.0, (baseLevel + peak + noise) * envelope))
      peaks.push(level)
    }
    
    return {
      peaks,
      duration,
      samplesPerPixel,
      sampleRate,
      channels
    }
  }

  // Simulate audio trimming
  async trimAudio(audioFile: AudioFile, trimPoints: TrimPoints): Promise<AudioFile> {
    console.log(`✂️ Trimming audio: ${audioFile.filename}`)
    console.log(`Trim: ${trimPoints.startTime}s - ${trimPoints.endTime}s`)
    
    // Calculate processing time based on trim duration and operations
    const trimDuration = trimPoints.endTime - trimPoints.startTime
    const processingTime = Math.max(2000, trimDuration * 100) // At least 2s, ~100ms per second
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, processingTime))
    
    // Create new audio file with trimmed properties
    const trimmedFile: AudioFile = {
      ...audioFile,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      filename: audioFile.filename.replace(/(\.[^.]+)$/, '_trimmed$1'),
      duration: trimDuration,
      filePath: audioFile.filePath.replace(/(\.[^.]+)$/, '_trimmed$1'),
      lastModified: new Date()
    }
    
    console.log(`✅ Trim complete: ${Math.round(trimDuration)}s duration`)
    return trimmedFile
  }

  // Simulate audio normalization
  async normalizeAudio(audioFile: AudioFile, targetLevel: number = -23): Promise<AudioFile> {
    console.log(`🔊 Normalizing audio: ${audioFile.filename} to ${targetLevel}dB`)
    
    // Simulate normalization processing
    const processingTime = Math.max(1500, audioFile.duration * 50) // ~50ms per second
    await new Promise(resolve => setTimeout(resolve, processingTime))
    
    const normalizedFile: AudioFile = {
      ...audioFile,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      filename: audioFile.filename.replace(/(\.[^.]+)$/, '_normalized$1'),
      filePath: audioFile.filePath.replace(/(\.[^.]+)$/, '_normalized$1'),
      lastModified: new Date()
    }
    
    console.log(`✅ Normalization complete`)
    return normalizedFile
  }

  // Process audio file with multiple operations
  async processAudioFile(
    audioFile: AudioFile, 
    operations: AudioOperation[],
    onProgress?: (progress: number) => void
  ): Promise<AudioFile> {
    console.log(`🎛️ Processing audio with ${operations.length} operations`)
    
    let currentFile = audioFile
    const totalOperations = operations.filter(op => op.enabled).length
    let completedOperations = 0
    
    for (const operation of operations) {
      if (!operation.enabled) continue
      
      const progressStart = (completedOperations / totalOperations) * 100
      const progressStep = (1 / totalOperations) * 100
      
      onProgress?.(progressStart)
      
      switch (operation.type) {
        case 'trim':
          const trimOp = operation as TrimOperation
          currentFile = await this.trimAudio(currentFile, {
            startTime: trimOp.parameters.startTime,
            endTime: trimOp.parameters.endTime,
            fadeInDuration: trimOp.parameters.fadeInDuration,
            fadeOutDuration: trimOp.parameters.fadeOutDuration
          })
          break
          
        case 'normalize':
          const normalizeOp = operation as NormalizeOperation
          currentFile = await this.normalizeAudio(currentFile, normalizeOp.parameters.targetLevel)
          break
          
        case 'fade':
          // Simulate fade processing
          await new Promise(resolve => setTimeout(resolve, 1000))
          console.log(`🌅 Applied fade effects`)
          break
          
        case 'noise-reduction':
          // Simulate noise reduction
          await new Promise(resolve => setTimeout(resolve, audioFile.duration * 200))
          console.log(`🔇 Applied noise reduction`)
          break
          
        case 'eq':
          // Simulate EQ processing
          await new Promise(resolve => setTimeout(resolve, 1500))
          console.log(`🎚️ Applied EQ`)
          break
      }
      
      completedOperations++
      onProgress?.(progressStart + progressStep)
    }
    
    onProgress?.(100)
    console.log(`✅ Audio processing complete`)
    return currentFile
  }

  // Get default trim points for a file
  getDefaultTrimPoints(audioFile: AudioFile): TrimPoints {
    // Auto-detect reasonable trim points (skip silence at start/end)
    const silenceDetectionThreshold = 5 // seconds
    const startTime = Math.min(silenceDetectionThreshold, audioFile.duration * 0.02)
    const endTime = Math.max(audioFile.duration - silenceDetectionThreshold, audioFile.duration * 0.98)
    
    return {
      startTime,
      endTime,
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0
    }
  }

  // Convert time to formatted string (MM:SS)
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Convert formatted string to seconds
  parseTime(timeString: string): number {
    const [minutes, seconds] = timeString.split(':').map(Number)
    return minutes * 60 + seconds
  }

  // Validate trim points
  validateTrimPoints(trimPoints: TrimPoints, audioFile: AudioFile): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (trimPoints.startTime < 0) {
      errors.push('Start time cannot be negative')
    }
    
    if (trimPoints.endTime > audioFile.duration) {
      errors.push('End time cannot exceed file duration')
    }
    
    if (trimPoints.startTime >= trimPoints.endTime) {
      errors.push('Start time must be before end time')
    }
    
    if (trimPoints.fadeInDuration < 0 || trimPoints.fadeOutDuration < 0) {
      errors.push('Fade durations cannot be negative')
    }
    
    if (trimPoints.fadeInDuration > (trimPoints.endTime - trimPoints.startTime) / 2) {
      errors.push('Fade in duration too long for selected segment')
    }
    
    if (trimPoints.fadeOutDuration > (trimPoints.endTime - trimPoints.startTime) / 2) {
      errors.push('Fade out duration too long for selected segment')
    }
    
    return { valid: errors.length === 0, errors }
  }

  // Simulate file format conversion
  async convertFormat(audioFile: AudioFile, targetFormat: string): Promise<AudioFile> {
    console.log(`🔄 Converting ${audioFile.filename} to ${targetFormat}`)
    
    const processingTime = audioFile.duration * 30 // ~30ms per second for conversion
    await new Promise(resolve => setTimeout(resolve, processingTime))
    
    const convertedFile: AudioFile = {
      ...audioFile,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      format: targetFormat,
      filename: audioFile.filename.replace(/\.[^.]+$/, `.${targetFormat}`),
      filePath: audioFile.filePath.replace(/\.[^.]+$/, `.${targetFormat}`),
      // Adjust file size based on format
      fileSize: targetFormat === 'wav' ? audioFile.fileSize * 8 : 
               targetFormat === 'flac' ? audioFile.fileSize * 4 : 
               audioFile.fileSize,
      lastModified: new Date()
    }
    
    console.log(`✅ Format conversion complete`)
    return convertedFile
  }
}

// Singleton instance
export const audioService = new AudioService() 