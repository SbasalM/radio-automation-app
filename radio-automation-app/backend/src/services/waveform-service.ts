import * as fs from 'fs-extra'
import * as path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import { createLogger } from '../utils/logger'

const logger = createLogger()

export interface WaveformData {
  peaks: number[]
  duration: number
  samplesPerPixel: number
  sampleRate: number
  channels: number
}

export interface AudioMetadata {
  duration: number
  sampleRate: number
  channels: number
  bitRate?: number
  format: string
  fileSize: number
}

export class WaveformService {
  private static instance: WaveformService
  private ffmpegAvailable = false

  public static getInstance(): WaveformService {
    if (!WaveformService.instance) {
      WaveformService.instance = new WaveformService()
    }
    return WaveformService.instance
  }

  async initialize(): Promise<void> {
    await this.checkFFmpegAvailability()
  }

  private async checkFFmpegAvailability(): Promise<void> {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err: any) => {
        if (err) {
          logger.warn('FFmpeg not available, waveforms will use fallback method')
          this.ffmpegAvailable = false
        } else {
          logger.info('FFmpeg is available for audio processing')
          this.ffmpegAvailable = true
        }
        resolve()
      })
    })
  }

  async getAudioMetadata(filePath: string): Promise<AudioMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`)
    }

    const fileStats = fs.statSync(filePath)
    const fileSize = fileStats.size
    const format = path.extname(filePath).toLowerCase().replace('.', '')

    if (!this.ffmpegAvailable) {
      // Fallback metadata estimation
      logger.warn('Using fallback metadata estimation')
      return this.estimateMetadata(filePath, fileSize, format)
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err) {
          logger.error('FFprobe error:', err)
          // Fallback to estimation if ffprobe fails
          resolve(this.estimateMetadata(filePath, fileSize, format))
          return
        }

        try {
          const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio')
          if (!audioStream) {
            throw new Error('No audio stream found in file')
          }

          const duration = parseFloat(String(metadata.format.duration || '0'))
          const sampleRate = parseInt(String(audioStream.sample_rate || '44100'))
          const channels = audioStream.channels || 2
          const bitRate = parseInt(String(metadata.format.bit_rate || '0'))

          resolve({
            duration,
            sampleRate,
            channels,
            bitRate,
            format,
            fileSize
          })
        } catch (error) {
          logger.error('Error parsing metadata:', error)
          resolve(this.estimateMetadata(filePath, fileSize, format))
        }
      })
    })
  }

  private estimateMetadata(filePath: string, fileSize: number, format: string): AudioMetadata {
    // Rough estimation based on file size and format
    let estimatedDuration = 300 // Default 5 minutes

    if (format === 'wav') {
      // WAV: roughly 176KB per second for CD quality (44.1kHz, 16-bit, stereo)
      estimatedDuration = fileSize / (44100 * 2 * 2)
    } else if (format === 'mp3') {
      // MP3: roughly 16KB per second for 128kbps
      estimatedDuration = fileSize / (128 * 1000 / 8)
    } else if (format === 'flac') {
      // FLAC: roughly 100KB per second (compressed lossless)
      estimatedDuration = fileSize / (100 * 1000)
    }

    return {
      duration: Math.max(30, Math.min(7200, estimatedDuration)), // Clamp between 30s and 2h
      sampleRate: 44100,
      channels: 2,
      format,
      fileSize
    }
  }

  async generateWaveform(filePath: string, width: number = 800): Promise<WaveformData> {
    const metadata = await this.getAudioMetadata(filePath)

    if (!this.ffmpegAvailable) {
      logger.warn('Generating fallback waveform data')
      return this.generateFallbackWaveform(metadata, width)
    }

    try {
      return await this.extractRealWaveform(filePath, metadata, width)
    } catch (error) {
      logger.error('Failed to extract real waveform, using fallback:', error)
      return this.generateFallbackWaveform(metadata, width)
    }
  }

  private async extractRealWaveform(filePath: string, metadata: AudioMetadata, width: number): Promise<WaveformData> {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(__dirname, '../../temp')
      fs.ensureDirSync(tempDir)
      
      const rawOutputPath = path.join(tempDir, `waveform_${Date.now()}.raw`)

      // Use FFmpeg to extract raw audio data
      ffmpeg(filePath)
        .audioChannels(1) // Convert to mono for simpler processing
        .audioFrequency(8000) // Downsample for faster processing
        .format('s16le') // 16-bit signed little-endian
        .output(rawOutputPath)
        .on('end', async () => {
          try {
            // Read the raw audio data
            const rawData = fs.readFileSync(rawOutputPath)
            
            // Clean up temp file
            fs.removeSync(rawOutputPath)

            // Convert raw data to waveform peaks
            const peaks = this.processRawAudioData(rawData, width)
            const samplesPerPixel = Math.floor((metadata.duration * metadata.sampleRate) / width)

            resolve({
              peaks,
              duration: metadata.duration,
              samplesPerPixel,
              sampleRate: metadata.sampleRate,
              channels: metadata.channels
            })
          } catch (error) {
            logger.error('Error processing raw audio data:', error)
            reject(error)
          }
        })
        .on('error', (error: any) => {
          logger.error('FFmpeg waveform extraction error:', error)
          // Clean up temp file if it exists
          if (fs.existsSync(rawOutputPath)) {
            fs.removeSync(rawOutputPath)
          }
          reject(error)
        })
        .run()
    })
  }

  private processRawAudioData(rawData: Buffer, width: number): number[] {
    const peaks: number[] = []
    const samplesPerPixel = Math.floor(rawData.length / (width * 2)) // 2 bytes per sample (16-bit)

    for (let i = 0; i < width; i++) {
      let max = 0
      const startSample = i * samplesPerPixel * 2 // 2 bytes per sample
      const endSample = Math.min(startSample + samplesPerPixel * 2, rawData.length)

      // Find the maximum amplitude in this pixel's worth of samples
      for (let j = startSample; j < endSample; j += 2) {
        if (j + 1 < rawData.length) {
          // Read 16-bit signed integer (little-endian)
          const sample = rawData.readInt16LE(j)
          const amplitude = Math.abs(sample) / 32768 // Normalize to 0-1
          max = Math.max(max, amplitude)
        }
      }

      peaks.push(max)
    }

    return peaks
  }

  private generateFallbackWaveform(metadata: AudioMetadata, width: number): WaveformData {
    const peaks: number[] = []
    const samplesPerPixel = Math.floor((metadata.duration * metadata.sampleRate) / width)
    
    // Generate a more realistic fallback waveform based on common audio patterns
    for (let i = 0; i < width; i++) {
      const progress = i / width
      
      // Create natural audio envelope (quieter at start/end)
      let envelope = 1.0
      if (progress < 0.05) {
        envelope = progress / 0.05 // Fade in first 5%
      } else if (progress > 0.95) {
        envelope = (1.0 - progress) / 0.05 // Fade out last 5%
      }
      
      // Create some variation with occasional peaks
      const baseLevel = 0.2 + Math.random() * 0.5 // 20-70% base level
      const peak = Math.random() > 0.9 ? Math.random() * 0.3 : 0 // Occasional peaks
      const variation = (Math.random() - 0.5) * 0.2 // Random variations
      
      const level = Math.min(1.0, Math.max(0.0, (baseLevel + peak + variation) * envelope))
      peaks.push(level)
    }
    
    return {
      peaks,
      duration: metadata.duration,
      samplesPerPixel,
      sampleRate: metadata.sampleRate,
      channels: metadata.channels
    }
  }
}

export const waveformService = WaveformService.getInstance() 