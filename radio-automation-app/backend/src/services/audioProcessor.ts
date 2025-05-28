import fs from 'fs-extra'
import path from 'path'
import { spawn } from 'child_process'
import { createLogger } from '../utils/logger'
import { ShowProfile } from './storage'

const logger = createLogger()

export interface AudioProcessingOptions {
  trimStart?: number // Start time in seconds (absolute position)
  trimEnd?: number // End time in seconds (absolute position)
  outputFormat?: string // mp3, wav, etc.
  normalizationLevel?: number // dB
  sampleRate?: number
  bitRate?: number
  fadeIn?: boolean
  fadeOut?: boolean
  metadata?: {
    title?: string
    artist?: string
    album?: string
    genre?: string
    year?: string
    comment?: string
  }
  extractedDate?: {
    year: string
    month: string
    day: string
  }
}

export interface AudioProcessingResult {
  success: boolean
  outputPath?: string
  error?: string
  originalDuration?: number
  processedDuration?: number
  compressionRatio?: number
}

export class AudioProcessorService {
  private readonly tempDir: string
  private readonly ffmpegPath: string

  constructor() {
    this.tempDir = process.env.TEMP_DIR || './temp'
    // Try to find ffmpeg in common locations
    this.ffmpegPath = this.findFFmpegPath()
  }

  private findFFmpegPath(): string {
    // Check environment variable first
    if (process.env.FFMPEG_PATH) {
      return process.env.FFMPEG_PATH
    }

    // Common Windows installation paths
    const commonPaths = [
      'ffmpeg', // System PATH
      'ffmpeg.exe', // Windows executable
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe'
    ]

    // For production, we should validate these paths exist
    // For now, return the first option and let spawn handle the error
    return commonPaths[0]
  }

  async processAudio(
    inputPath: string, 
    outputPath: string, 
    show: ShowProfile
  ): Promise<AudioProcessingResult> {
    try {
      logger.info(`Starting audio processing: ${path.basename(inputPath)}`)

      // Check if input file exists
      if (!await fs.pathExists(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`)
      }

      // Extract date from filename
      const extractedDate = this.extractDateFromFilename(path.basename(inputPath), show)

      // Create processing options from show settings
      const options = this.createProcessingOptions(show, extractedDate)
      
      // For now, if no audio processing is needed, just copy the file
      if (!this.needsAudioProcessing(options)) {
        logger.info('No audio processing needed, copying file')
        return await this.copyFile(inputPath, outputPath)
      }

      // Create output directory
      await fs.ensureDir(path.dirname(outputPath))

      // Get input file info first
      const inputInfo = await this.getAudioInfo(inputPath)
      
      // Process with ffmpeg (if available) or fallback to copy
      const result = await this.processWithFFmpeg(inputPath, outputPath, options, inputInfo)
      
      if (result.success) {
        logger.info(`Audio processing completed: ${path.basename(outputPath)}`)
      }
      
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown audio processing error'
      logger.error(`Audio processing failed: ${errorMessage}`)
      
      // Fallback: try to copy the original file
      try {
        const fallbackResult = await this.copyFile(inputPath, outputPath)
        logger.warn('Audio processing failed, used file copy as fallback')
        return {
          ...fallbackResult,
          error: `Audio processing failed (${errorMessage}), used copy fallback`
        }
      } catch (copyError) {
        return {
          success: false,
          error: errorMessage
        }
      }
    }
  }

  private extractDateFromFilename(filename: string, show: ShowProfile): { year: string; month: string; day: string } | null {
    try {
      // Get the first file pattern for date extraction
      if (!show.filePatterns || show.filePatterns.length === 0) {
        return null
      }

      const pattern = show.filePatterns[0].pattern
      
      // Convert pattern to regex
      // Replace {MM} with capture group for month, {DD} for day, {YY} for year
      let regexPattern = pattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\\{MM\\}/g, '(\\d{2})') // Month
        .replace(/\\{DD\\}/g, '(\\d{2})') // Day  
        .replace(/\\{YY\\}/g, '(\\d{2})') // 2-digit year
        .replace(/\\{YYYY\\}/g, '(\\d{4})') // 4-digit year

      const regex = new RegExp(regexPattern)
      const match = filename.match(regex)

      if (match) {
        // Determine which groups correspond to which date parts based on original pattern
        const originalPattern = pattern
        let monthGroup = -1, dayGroup = -1, yearGroup = -1
        let groupIndex = 1

        // Find the order of date components in the pattern
        for (let i = 0; i < originalPattern.length; i++) {
          if (originalPattern.substr(i, 4) === '{MM}') {
            monthGroup = groupIndex++
            i += 3
          } else if (originalPattern.substr(i, 4) === '{DD}') {
            dayGroup = groupIndex++
            i += 3
          } else if (originalPattern.substr(i, 4) === '{YY}') {
            yearGroup = groupIndex++
            i += 3
          } else if (originalPattern.substr(i, 6) === '{YYYY}') {
            yearGroup = groupIndex++
            i += 5
          }
        }

        if (monthGroup > 0 && dayGroup > 0 && yearGroup > 0) {
          let year = match[yearGroup]
          const month = match[monthGroup]
          const day = match[dayGroup]

          // Convert 2-digit year to 4-digit year (assume 20xx for YY < 50, 19xx for YY >= 50)
          if (year.length === 2) {
            const yy = parseInt(year)
            year = yy < 50 ? `20${year}` : `19${year}`
          }

          logger.debug(`Extracted date from filename: ${year}-${month}-${day}`)
          return { year, month, day }
        }
      }
    } catch (error) {
      logger.warn(`Failed to extract date from filename ${filename}:`, error)
    }

    return null
  }

  private createProcessingOptions(show: ShowProfile, extractedDate?: { year: string; month: string; day: string } | null): AudioProcessingOptions {
    const options: AudioProcessingOptions = {}

    // Store extracted date
    if (extractedDate) {
      options.extractedDate = extractedDate
    }

    // Trim settings
    if (show.trimSettings) {
      if (show.trimSettings.startSeconds > 0) {
        options.trimStart = show.trimSettings.startSeconds
      }
      if (show.trimSettings.endSeconds > 0) {
        options.trimEnd = show.trimSettings.endSeconds
      }
      options.fadeIn = show.trimSettings.fadeIn
      options.fadeOut = show.trimSettings.fadeOut
    }

    // Audio processing settings
    if (show.processingOptions?.audioSettings) {
      const audioSettings = show.processingOptions.audioSettings
      
      options.outputFormat = audioSettings.outputFormat || 'wav'
      options.normalizationLevel = audioSettings.normalizationLevel
      options.sampleRate = audioSettings.sampleRate
      options.bitRate = audioSettings.bitRate
    }

    // Metadata settings
    if (show.metadataMapping?.outputMetadata) {
      const metadata = show.metadataMapping.outputMetadata
      
      options.metadata = {
        title: this.processMetadataTemplate(metadata.title || '', show.name, extractedDate),
        artist: this.processMetadataTemplate(metadata.artist || '', show.name, extractedDate),
        album: this.processMetadataTemplate(metadata.album || '', show.name, extractedDate),
        genre: this.processMetadataTemplate(metadata.genre || '', show.name, extractedDate),
        year: this.processMetadataTemplate((metadata as any).year || '', show.name, extractedDate),
        comment: this.processMetadataTemplate((metadata as any).comment || '', show.name, extractedDate)
      }
    }

    return options
  }

  private needsAudioProcessing(options: AudioProcessingOptions): boolean {
    return !!(
      options.trimStart ||
      options.trimEnd ||
      options.outputFormat !== 'wav' ||
      options.normalizationLevel ||
      options.fadeIn ||
      options.fadeOut
    )
  }

  private async getAudioInfo(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-select_streams', 'a:0', // Select first audio stream
        filePath
      ])

      let output = ''
      let errorOutput = ''

      ffprobe.stdout.on('data', (data) => {
        output += data.toString()
      })

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output)
            logger.debug(`Audio info for ${filePath}:`, {
              duration: info.format?.duration,
              streams: info.streams?.length,
              format: info.format?.format_name
            })
            resolve(info)
          } catch (parseError) {
            logger.warn(`Failed to parse ffprobe output for ${filePath}:`, parseError)
            // Fallback: try to estimate duration from file size (very rough)
            resolve({
              format: { duration: '300' }, // 5 minute fallback
              streams: [{ codec_type: 'audio' }]
            })
          }
        } else {
          logger.warn(`ffprobe failed for ${filePath} with code ${code}:`, errorOutput)
          // If ffprobe fails, return basic info with estimated duration
          resolve({
            format: { duration: '300' }, // 5 minute fallback
            streams: [{ codec_type: 'audio' }]
          })
        }
      })

      ffprobe.on('error', (error) => {
        logger.warn(`ffprobe error for ${filePath}:`, error.message)
        // If ffprobe is not available, return basic info
        resolve({
          format: { duration: '300' }, // 5 minute fallback
          streams: [{ codec_type: 'audio' }]
        })
      })
    })
  }

  private async processWithFFmpeg(
    inputPath: string,
    outputPath: string,
    options: AudioProcessingOptions,
    inputInfo: any
  ): Promise<AudioProcessingResult> {
    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath]
      
      // Add trim filters
      const filters = []
      
      if (options.trimStart || options.trimEnd) {
        const duration = parseFloat(inputInfo.format?.duration || '0')
        const start = options.trimStart || 0
        const end = options.trimEnd || duration // End time, not end trim amount
        const trimDuration = end - start
        
        logger.debug(`Trim settings - start: ${start}s, end: ${end}s, duration: ${duration}s, trimDuration: ${trimDuration}s`)
        
        if (trimDuration > 0 && start < duration && end <= duration) {
          filters.push(`atrim=start=${start}:duration=${trimDuration}`)
          logger.info(`Applied trim: start=${start}s, duration=${trimDuration}s (end=${end}s)`)
        } else {
          logger.warn(`Invalid trim settings: start=${start}, end=${end}, duration=${duration}, trimDuration=${trimDuration}`)
        }
      }

      // Add normalization
      if (options.normalizationLevel) {
        // Ensure the value is negative and within range [-70, -5]
        const normalizeValue = Math.max(-70, Math.min(-5, options.normalizationLevel))
        filters.push(`loudnorm=I=${normalizeValue}`)
      }

      // Add fade effects
      if (options.fadeIn) {
        filters.push('afade=in:d=0.5')
      }
      if (options.fadeOut) {
        filters.push('afade=out:d=0.5')
      }

      // Apply filters if any
      if (filters.length > 0) {
        args.push('-af', filters.join(','))
      }

      // Set output format and quality
      if (options.outputFormat === 'mp3') {
        args.push('-codec:a', 'libmp3lame')
        if (options.bitRate) {
          args.push('-b:a', `${options.bitRate}k`)
        }
      } else if (options.outputFormat === 'wav') {
        args.push('-codec:a', 'pcm_s16le')
      }

      // Set sample rate
      if (options.sampleRate) {
        args.push('-ar', options.sampleRate.toString())
      }

      // Add metadata if available
      if (options.metadata) {
        if (options.metadata.title) args.push('-metadata', `title=${options.metadata.title}`)
        if (options.metadata.artist) args.push('-metadata', `artist=${options.metadata.artist}`)
        if (options.metadata.album) args.push('-metadata', `album=${options.metadata.album}`)
        if (options.metadata.genre) args.push('-metadata', `genre=${options.metadata.genre}`)
        if (options.metadata.year) args.push('-metadata', `date=${options.metadata.year}`)
        if (options.metadata.comment) args.push('-metadata', `comment=${options.metadata.comment}`)
      }

      // Overwrite output file
      args.push('-y', outputPath)

      logger.debug(`FFmpeg command: ffmpeg ${args.join(' ')}`)

      const ffmpeg = spawn('ffmpeg', args)

      let errorOutput = ''

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath,
            originalDuration: parseFloat(inputInfo.format?.duration || '0')
          })
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`))
      })
    })
  }

  private async copyFile(inputPath: string, outputPath: string): Promise<AudioProcessingResult> {
    try {
      await fs.ensureDir(path.dirname(outputPath))
      await fs.copy(inputPath, outputPath, { overwrite: true })
      
      const stats = await fs.stat(outputPath)
      
      return {
        success: true,
        outputPath,
        originalDuration: 0 // Unknown for simple copy
      }
    } catch (error) {
      throw new Error(`File copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private processMetadataTemplate(template: string, showName?: string, extractedDate?: { year: string; month: string; day: string } | null): string {
    if (!template) return ''
    
    let result = template

    // Use extracted date if available, otherwise current date
    if (extractedDate) {
      result = result
        .replace(/{YYYY}/gi, extractedDate.year)
        .replace(/{MM}/gi, extractedDate.month)
        .replace(/{DD}/gi, extractedDate.day)
    } else {
      // Fallback to current date
      const now = new Date()
      result = result
        .replace(/{YYYY}/gi, now.getFullYear().toString())
        .replace(/{MM}/gi, (now.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/{DD}/gi, now.getDate().toString().padStart(2, '0'))
    }

    // Replace show name
    result = result.replace(/{showName}/gi, showName || '')
    
    // Remove any remaining placeholders
    result = result.replace(/{[^}]+}/g, '').trim()

    return result
  }

  async checkFFmpegAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version'])
      
      ffmpeg.on('close', (code) => {
        resolve(code === 0)
      })
      
      ffmpeg.on('error', () => {
        resolve(false)
      })
    })
  }
} 