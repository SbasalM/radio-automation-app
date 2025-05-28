import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs-extra'
import { createLogger } from '../utils/logger'
import { StorageService, ShowProfile } from './storage'
import { FileOperationsService } from './fileOperations'
import { FileStatus } from '../types'

const logger = createLogger()

interface WatcherState {
  isRunning: boolean
  watchers: Map<string, chokidar.FSWatcher>
  activeShows: Set<string>
}

export class FileWatcherService {
  private static instance: FileWatcherService
  private state: WatcherState
  private storageService: StorageService
  private fileOpsService: FileOperationsService

  private constructor() {
    this.state = {
      isRunning: false,
      watchers: new Map(),
      activeShows: new Set()
    }
    this.storageService = StorageService.getInstance()
    this.fileOpsService = new FileOperationsService()
  }

  static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService()
    }
    return FileWatcherService.instance
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing file watcher service...')
      
      // Start watching enabled shows
      const shows = await this.storageService.getAllShows()
      const enabledShows = shows.filter(show => show.enabled && show.autoProcessing)
      
      await this.startWatchingShows(enabledShows.map(s => s.id))
      
      logger.info(`File watcher initialized with ${enabledShows.length} shows`)
    } catch (error) {
      logger.error('Failed to initialize file watcher:', error)
      throw error
    }
  }

  async startWatchingShows(showIds: string[]): Promise<void> {
    try {
      logger.info(`Starting to watch ${showIds.length} shows`)
      
      for (const showId of showIds) {
        await this.startWatchingShow(showId)
      }
      
      this.state.isRunning = true
      logger.info('File watching started')
    } catch (error) {
      logger.error('Failed to start watching shows:', error)
      throw error
    }
  }

  async stopWatching(): Promise<void> {
    try {
      logger.info('Stopping file watchers...')
      
      for (const [showId, watcher] of this.state.watchers) {
        await watcher.close()
        this.state.activeShows.delete(showId)
        logger.info(`Stopped watching show: ${showId}`)
      }
      
      this.state.watchers.clear()
      this.state.isRunning = false
      
      logger.info('All file watchers stopped')
    } catch (error) {
      logger.error('Error stopping watchers:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    await this.stopWatching()
  }

  private async startWatchingShow(showId: string): Promise<void> {
    try {
      const show = await this.storageService.getShow(showId)
      if (!show || !show.enabled) {
        logger.warn(`Show ${showId} not found or disabled`)
        return
      }

      // Stop existing watcher if any
      if (this.state.watchers.has(showId)) {
        await this.state.watchers.get(showId)?.close()
      }

      // Get watch patterns and directories
      const watchPatterns = show.filePatterns.filter(pattern => pattern.type === 'watch')

      if (watchPatterns.length === 0) {
        logger.warn(`No watch patterns found for show: ${show.name}`)
        return
      }

      // Get watch directories (per-pattern or global fallback)
      const settings = await this.storageService.getSettings()
      const globalWatchDir = settings.globalWatchDirectory || path.join(process.cwd(), 'watch')
      
      // Collect unique watch directories
      const watchDirectories = new Set<string>()
      
      for (const pattern of watchPatterns) {
        const watchDir = pattern.watchPath || globalWatchDir
        watchDirectories.add(watchDir)
        
        // Ensure watch directory exists
        try {
          await fs.ensureDir(watchDir)
          logger.info(`Ensured watch directory exists: ${watchDir}`)
        } catch (error) {
          logger.error(`Failed to create watch directory ${watchDir}:`, error)
        }
      }

      // Ensure output directory exists
      await fs.ensureDir(show.outputDirectory)

      // Create watcher for directories (not patterns!)
      const watcher = chokidar.watch(Array.from(watchDirectories), {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't process existing files on startup to avoid duplicates
        awaitWriteFinish: {
          stabilityThreshold: 1000, // Reduced from 2000ms
          pollInterval: 100
        },
        usePolling: false, // Use native OS events for better real-time detection
        interval: 100, // Polling interval if usePolling is true
        binaryInterval: 300,
        alwaysStat: false,
        depth: undefined, // Watch subdirectories
        followSymlinks: true,
        atomic: true // Don't emit events on atomic writes until complete
      })

      // Set up event handlers
      watcher
        .on('add', async (filePath) => {
          await this.handleFileDetected(filePath, show)
        })
        .on('change', async (filePath) => {
          logger.debug(`File changed: ${filePath}`)
          // Could handle file updates here if needed
        })
        .on('unlink', (filePath) => {
          logger.debug(`File removed: ${filePath}`)
        })
        .on('error', (error) => {
          logger.error(`Watcher error for show ${show.name}:`, error)
        })
        .on('ready', async () => {
          const patternList = watchPatterns.map(p => p.pattern).join(', ')
          const dirList = Array.from(watchDirectories).join(', ')
          logger.info(`Started watching ${show.name}: patterns [${patternList}] in directories [${dirList}]`)
          
          // Scan for existing files since we set ignoreInitial: true
          await this.scanExistingFiles(show, Array.from(watchDirectories))
        })

      this.state.watchers.set(showId, watcher)
      this.state.activeShows.add(showId)

    } catch (error) {
      logger.error(`Failed to start watching show ${showId}:`, error)
      throw error
    }
  }

  private async scanExistingFiles(show: ShowProfile, watchDirectories: string[]): Promise<void> {
    try {
      logger.debug(`Scanning existing files for show: ${show.name}`)
      
      for (const watchDir of watchDirectories) {
        try {
          if (!await fs.pathExists(watchDir)) {
            continue
          }

          const files = await fs.readdir(watchDir)
          
          for (const filename of files) {
            const filePath = path.join(watchDir, filename)
            const stats = await fs.stat(filePath)
            
            if (stats.isFile()) {
              // Check if file matches any pattern
              const matchingPattern = this.findMatchingPattern(filename, show.filePatterns)
              if (matchingPattern) {
                // Check if file is already in queue
                const queue = await this.storageService.getQueue()
                const existingFile = queue.find(f => f.filename === filename && f.showId === show.id)
                if (!existingFile) {
                  logger.info(`Found existing file: ${filename} for show: ${show.name}`)
                  await this.handleFileDetected(filePath, show)
                }
              }
            }
          }
        } catch (error) {
          logger.error(`Error scanning directory ${watchDir}:`, error)
        }
      }
    } catch (error) {
      logger.error(`Error scanning existing files for show ${show.name}:`, error)
    }
  }

  private async handleFileDetected(filePath: string, show: ShowProfile): Promise<void> {
    try {
      const filename = path.basename(filePath)
      logger.info(`New file detected: ${filename} for show: ${show.name}`)

      // Check if file matches any pattern
      const matchingPattern = this.findMatchingPattern(filename, show.filePatterns)
      if (!matchingPattern) {
        logger.warn(`File ${filename} doesn't match any pattern for show ${show.name}`)
        return
      }

      // Check if file is already in queue
      const queue = await this.storageService.getQueue()
      const existingFile = queue.find(f => f.filename === filename && f.showId === show.id)
      if (existingFile) {
        logger.info(`File ${filename} already in queue`)
        return
      }

      // Add to queue
      const queuedFile = await this.storageService.addToQueue({
        filename,
        showId: show.id,
        status: FileStatus.PENDING,
        sourcePath: filePath
      })

      // Start processing
      await this.processFile(queuedFile.id)

    } catch (error) {
      logger.error(`Error handling detected file ${filePath}:`, error)
    }
  }

  private findMatchingPattern(
    filename: string, 
    patterns: ShowProfile['filePatterns']
  ): ShowProfile['filePatterns'][0] | null {
    for (const pattern of patterns) {
      if (pattern.type === 'watch' && this.matchesPattern(filename, pattern.pattern)) {
        return pattern
      }
    }
    return null
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    try {
      // Convert sophisticated pattern to regex
      // Handle placeholders FIRST, before escaping regex characters
      let regexPattern = pattern
        // Handle date/time placeholders
        .replace(/\{YYYY\}/g, '\\d{4}')        // 4-digit year
        .replace(/\{YY\}/g, '\\d{2}')          // 2-digit year
        .replace(/\{MM\}/g, '\\d{1,2}')        // Month
        .replace(/\{DD\}/g, '\\d{1,2}')        // Day
        .replace(/\{HH\}/g, '\\d{1,2}')        // Hour
        .replace(/\{mm\}/g, '\\d{1,2}')        // Minute
        .replace(/\{ss\}/g, '\\d{1,2}')        // Second
        .replace(/\{DOTW\}/g, '[A-Za-z]+')     // Day of the week
        .replace(/\{DOW\}/g, '[A-Za-z]{3}')    // Day of week (3 letters)
        .replace(/\{MONTH\}/g, '[A-Za-z]+')    // Month name
        .replace(/\{MON\}/g, '[A-Za-z]{3}')    // Month (3 letters)
        // Handle wildcard patterns
        .replace(/\*/g, '.*')                  // * becomes .*
        .replace(/\?/g, '.')                   // ? becomes .
        // Escape remaining regex special characters (but NOT backslashes that are part of our regex)
        .replace(/[.+^$|[\]]/g, '\\$&')
        
      const regex = new RegExp(`^${regexPattern}$`, 'i')
      const matches = regex.test(filename)
      
      if (matches) {
        logger.debug(`File "${filename}" matches pattern "${pattern}"`)
      } else {
        logger.debug(`File "${filename}" does NOT match pattern "${pattern}" (regex: ${regexPattern})`)
      }
      
      return matches
    } catch (error) {
      logger.error(`Invalid pattern ${pattern}:`, error)
      return false
    }
  }

  private async processFile(fileId: string): Promise<void> {
    try {
      const queue = await this.storageService.getQueue()
      const file = queue.find(f => f.id === fileId)
      if (!file) {
        logger.error(`File ${fileId} not found in queue`)
        return
      }

      const show = await this.storageService.getShow(file.showId)
      if (!show) {
        logger.error(`Show ${file.showId} not found`)
        return
      }

      logger.info(`Processing file: ${file.filename}`)
      const startTime = Date.now()

      // Update status to processing
      await this.storageService.updateQueueItem(file.id, {
        status: FileStatus.PROCESSING
      })

      try {
        // Process the file
        const result = await this.fileOpsService.processFile(file, show)
        
        if (result.success) {
          await this.storageService.updateQueueItem(file.id, {
            status: FileStatus.COMPLETED,
            outputPath: result.outputPath,
            processedAt: new Date(),
            processingTimeMs: Date.now() - startTime
          })
          logger.info(`Successfully processed: ${file.filename}`)
        } else {
          throw new Error(result.error || 'Processing failed')
        }

      } catch (error) {
        await this.storageService.updateQueueItem(file.id, {
          status: FileStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
          processingTimeMs: Date.now() - startTime
        })
        logger.error(`Failed to process ${file.filename}:`, error)
      }

    } catch (error) {
      logger.error(`Error in processFile for ${fileId}:`, error)
    }
  }

  async retryFile(fileId: string): Promise<void> {
    try {
      const queue = await this.storageService.getQueue()
      const file = queue.find(f => f.id === fileId)
      
      if (!file) {
        throw new Error(`File ${fileId} not found in queue`)
      }

      if (file.status !== FileStatus.FAILED) {
        throw new Error(`File ${fileId} is not in failed state`)
      }

      logger.info(`Retrying file: ${file.filename}`)
      
      // Reset status and clear error
      await this.storageService.updateQueueItem(file.id, {
        status: FileStatus.PENDING,
        error: undefined,
        processedAt: undefined,
        processingTimeMs: undefined
      })

      // Reprocess
      await this.processFile(fileId)

    } catch (error) {
      logger.error(`Error retrying file ${fileId}:`, error)
      throw error
    }
  }

  getStatus(): { isRunning: boolean; watchedShows: number; activeWatchers: string[] } {
    return {
      isRunning: this.state.isRunning,
      watchedShows: this.state.activeShows.size,
      activeWatchers: Array.from(this.state.activeShows)
    }
  }
} 