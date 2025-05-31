import fs from 'fs-extra'
import path from 'path'
import { promisify } from 'util'
import { createLogger } from '../utils/logger'
import { QueuedFile, FileOperationResult } from '../types'
import { ShowProfile } from './storage'
import { AudioProcessorService } from './audioProcessor'

const logger = createLogger()

export interface ProcessFileResult {
  success: boolean
  outputPath?: string
  error?: string
  bytesProcessed?: number
}

export class FileOperationsService {
  private readonly allowedExtensions: string[]
  private readonly tempDir: string
  private readonly outputBaseDir: string
  private readonly audioProcessor: AudioProcessorService

  constructor() {
    this.allowedExtensions = (process.env.ALLOWED_EXTENSIONS || '.mp3,.wav,.flac,.aac,.m4a').split(',')
    this.tempDir = process.env.TEMP_DIR || './temp'
    
    // Calculate workspace root for better default output directory
    const backendDir = process.cwd()
    const workspaceRoot = path.resolve(backendDir, '..')
    this.outputBaseDir = process.env.OUTPUT_BASE_DIR || path.join(workspaceRoot, 'Output')
    
    this.audioProcessor = new AudioProcessorService()
  }

  async processFile(file: QueuedFile, show: ShowProfile): Promise<ProcessFileResult> {
    try {
      logger.info(`Starting to process file: ${file.filename}`)

      // Validate file extension
      const ext = path.extname(file.filename).toLowerCase()
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`Unsupported file extension: ${ext}`)
      }

      // Check if source file exists and is readable
      if (!await fs.pathExists(file.sourcePath)) {
        throw new Error(`Source file not found: ${file.sourcePath}`)
      }

      const fileStats = await fs.stat(file.sourcePath)
      if (!fileStats.isFile()) {
        throw new Error(`Source path is not a file: ${file.sourcePath}`)
      }

      // Generate output filename and path
      const outputFilename = this.generateOutputFilename(file.filename, show)
      
      // Use show's output directory with proper path resolution
      let outputDir: string
      logger.info(`DEBUG FileOps: show.outputDirectory = "${show.outputDirectory}"`)
      if (show.outputDirectory) {
        // Clean the path by removing surrounding quotes if present
        const cleanedOutputPath = show.outputDirectory.trim().replace(/^["']|["']$/g, '')
        
        if (path.isAbsolute(cleanedOutputPath)) {
          // Already absolute - use as-is
          outputDir = cleanedOutputPath
          logger.info(`DEBUG FileOps: Using absolute path: ${outputDir}`)
        } else {
          // Relative path - resolve relative to workspace root
          // process.cwd() is backend directory, go up one level to radio-automation-app
          const backendDir = process.cwd()
          const workspaceRoot = path.resolve(backendDir, '..')
          outputDir = path.resolve(workspaceRoot, cleanedOutputPath)
          logger.info(`DEBUG FileOps: Resolved relative path: ${outputDir}`)
        }
      } else {
        // Fall back to global default
        outputDir = this.outputBaseDir
        logger.info(`DEBUG FileOps: Using fallback outputBaseDir = ${outputDir}`)
      }
      
      const outputPath = path.join(outputDir, outputFilename)

      // Ensure output directory exists
      await fs.ensureDir(outputDir)

      // Check if output file already exists
      if (await fs.pathExists(outputPath)) {
        const resolvedPath = await this.resolveFileConflict(outputPath)
        logger.info(`File conflict resolved: ${outputPath} -> ${resolvedPath}`)
        
        // Process audio file to resolved path
        const audioResult = await this.audioProcessor.processAudio(file.sourcePath, resolvedPath, show)
        
        if (!audioResult.success) {
          throw new Error(audioResult.error || 'Audio processing failed')
        }
        
        return {
          success: true,
          outputPath: resolvedPath,
          bytesProcessed: fileStats.size
        }
      }

      // Process audio file to output location
      const audioResult = await this.audioProcessor.processAudio(file.sourcePath, outputPath, show)
      
      if (!audioResult.success) {
        throw new Error(audioResult.error || 'Audio processing failed')
      }

      logger.info(`File successfully processed: ${file.filename} -> ${outputPath}`)
      
      return {
        success: true,
        outputPath,
        bytesProcessed: fileStats.size
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Failed to process file ${file.filename}:`, error)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private generateOutputFilename(originalFilename: string, show: ShowProfile): string {
    try {
      const originalExt = path.extname(originalFilename)
      const nameWithoutExt = path.basename(originalFilename, originalExt)
      
      // Determine output extension based on processing settings
      const outputFormat = show.processingOptions?.audioSettings?.outputFormat || 'wav'
      const outputExt = outputFormat.startsWith('.') ? outputFormat : `.${outputFormat}`
      
      // Use show's file naming rules if available
      if (show.fileNamingRules?.outputPattern) {
        let outputName = show.fileNamingRules.outputPattern
        
        // Replace basic placeholders
        outputName = outputName.replace(/{showName}/gi, show.name)
        outputName = outputName.replace(/{originalFilename}/gi, nameWithoutExt)
        
        // Add current date placeholders
        const now = new Date()
        outputName = outputName.replace(/{YYYY}/gi, now.getFullYear().toString())
        outputName = outputName.replace(/{MM}/gi, (now.getMonth() + 1).toString().padStart(2, '0'))
        outputName = outputName.replace(/{DD}/gi, now.getDate().toString().padStart(2, '0'))
        
        // Clean up any remaining placeholders
        outputName = outputName.replace(/{[^}]+}/g, '')
        
        // Sanitize the filename
        outputName = this.sanitizeFilename(outputName)
        
        return `${outputName}${outputExt}`
      }
      
      // Fallback: Just use sanitized show name with correct extension
      const cleanShowName = this.sanitizeFilename(show.name)
      return `${cleanShowName}${outputExt}`
      
    } catch (error) {
      logger.warn(`Error generating output filename, using original: ${originalFilename}`)
      return originalFilename
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove invalid characters for filesystem
    return filename
      .replace(/[<>:"\/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim()
  }

  private async copyFileWithProgress(sourcePath: string, destPath: string): Promise<void> {
    try {
      logger.debug(`Copying file: ${sourcePath} -> ${destPath}`)
      
      const sourceStats = await fs.stat(sourcePath)
      let copiedBytes = 0
      
      const readStream = fs.createReadStream(sourcePath)
      const writeStream = fs.createWriteStream(destPath)

      return new Promise((resolve, reject) => {
        readStream.on('data', (chunk) => {
          copiedBytes += chunk.length
          const progress = (copiedBytes / sourceStats.size) * 100
          
          if (progress % 10 < 1) { // Log every 10%
            logger.debug(`Copy progress: ${progress.toFixed(1)}%`)
          }
        })

        readStream.on('error', reject)
        writeStream.on('error', reject)
        writeStream.on('finish', () => {
          logger.debug(`File copy completed: ${destPath}`)
          resolve()
        })

        readStream.pipe(writeStream)
      })

    } catch (error) {
      logger.error(`Error copying file ${sourcePath} to ${destPath}:`, error)
      throw error
    }
  }

  private async resolveFileConflict(filePath: string): Promise<string> {
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const nameWithoutExt = path.basename(filePath, ext)

    let counter = 1
    let newPath = filePath

    while (await fs.pathExists(newPath)) {
      newPath = path.join(dir, `${nameWithoutExt}_${counter}${ext}`)
      counter++
      
      if (counter > 1000) {
        throw new Error('Too many file conflicts, unable to resolve')
      }
    }

    return newPath
  }

  // Additional file operations

  async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      await fs.ensureDir(path.dirname(destPath))
      await fs.move(sourcePath, destPath, { overwrite: false })
      
      const stats = await fs.stat(destPath)
      
      return {
        success: true,
        path: destPath,
        bytesProcessed: stats.size
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      await fs.ensureDir(path.dirname(destPath))
      await fs.copy(sourcePath, destPath, { overwrite: false })
      
      const stats = await fs.stat(destPath)
      
      return {
        success: true,
        path: destPath,
        bytesProcessed: stats.size
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      const stats = await fs.stat(filePath)
      await fs.remove(filePath)
      
      return {
        success: true,
        path: filePath,
        bytesProcessed: stats.size
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath)
      logger.debug(`Directory ensured: ${dirPath}`)
    } catch (error) {
      logger.error(`Failed to ensure directory ${dirPath}:`, error)
      throw error
    }
  }

  async getFileMetadata(filePath: string): Promise<{
    size: number
    created: Date
    modified: Date
    isDirectory: boolean
    extension: string
  }> {
    try {
      const stats = await fs.stat(filePath)
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        extension: path.extname(filePath).toLowerCase()
      }
    } catch (error) {
      logger.error(`Failed to get metadata for ${filePath}:`, error)
      throw error
    }
  }

  async validateFilePath(filePath: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if path exists
      if (!await fs.pathExists(filePath)) {
        return { isValid: false, error: 'File does not exist' }
      }

      // Check if it's a file (not directory)
      const stats = await fs.stat(filePath)
      if (!stats.isFile()) {
        return { isValid: false, error: 'Path is not a file' }
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase()
      if (!this.allowedExtensions.includes(ext)) {
        return { isValid: false, error: `Unsupported file extension: ${ext}` }
      }

      // Check file size (optional limit)
      const maxSize = parseInt((process.env.MAX_FILE_SIZE || '100MB').replace('MB', '')) * 1024 * 1024
      if (stats.size > maxSize) {
        return { isValid: false, error: `File too large: ${stats.size} bytes` }
      }

      return { isValid: true }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
} 