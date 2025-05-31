import fs from 'fs-extra'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../utils/logger'
import { QueuedFile, SystemStatus } from '../types'

const logger = createLogger()

export interface ShowProfile {
  id: string
  name: string
  description?: string
  enabled: boolean
  filePatterns: Array<{
    id: string
    pattern: string
    type: 'ftp' | 'watch'
    ftpProfileId?: string
    watchPath?: string // Per-pattern watch directory
  }>
  outputDirectory: string
  autoProcessing: boolean
  processExistingFiles?: boolean // Whether to process existing files in watch folders or only new ones
  createdAt: Date
  updatedAt: Date
  // Extended settings
  metadataMapping?: {
    inputPatterns: string[]
    extractionRules: Array<{
      field: string
      source: 'regex' | 'static' | 'filename'
      regexGroup?: number
      staticValue?: string
    }>
    outputMetadata: {
      title: string
      artist: string
      album: string
      genre: string
      customFields: Record<string, string>
    }
  }
  fileNamingRules?: {
    outputPattern: string
    dateFormat: string
    caseConversion: 'none' | 'uppercase' | 'lowercase' | 'titlecase'
    invalidCharacterHandling: 'remove' | 'replace' | 'underscore'
    replacementCharacter?: string
    maxLength?: number
  }
  trimSettings?: {
    startSeconds: number
    endSeconds: number
    fadeIn: boolean
    fadeOut: boolean
  }
  processingOptions?: {
    normalize: boolean
    addPromoTag: boolean
    promoTagId?: string
    useGlobalSettings: boolean
    audioSettings: any // Can be typed more specifically if needed
  }
  processOnSchedule?: boolean
  schedulePattern?: string
  enableNotifications?: boolean
  notificationEmails?: string[]
  alertOnErrors?: boolean
  alertOnMissingFiles?: boolean
}

export interface StorageData {
  shows: ShowProfile[]
  queue: QueuedFile[]
  settings: {
    version: string
    lastBackup?: Date
    watchInterval: number
    globalWatchDirectory?: string // Global watch folder fallback
    globalOutputDirectory?: string // Global output folder fallback
  }
}

export class StorageService {
  private static instance: StorageService
  private storagePath: string
  private dataFilePath: string
  private data: StorageData

  private constructor() {
    this.storagePath = process.env.STORAGE_PATH || './data'
    this.dataFilePath = path.join(this.storagePath, 'storage.json')
    
    this.data = {
      shows: [],
      queue: [],
      settings: {
        version: '1.0.0',
        watchInterval: parseInt(process.env.WATCH_INTERVAL || '5000'),
        globalWatchDirectory: process.env.GLOBAL_WATCH_DIR || 'Watch',
        globalOutputDirectory: process.env.GLOBAL_OUTPUT_DIR || 'Output'
      }
    }
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  async initialize(): Promise<void> {
    try {
      // Ensure storage directory exists
      await fs.ensureDir(this.storagePath)
      
      // Load existing data or create new
      if (await fs.pathExists(this.dataFilePath)) {
        await this.loadData()
        logger.info('Storage data loaded successfully')
      } else {
        await this.saveData()
        logger.info('New storage file created')
      }

      // Create backup on startup
      await this.createBackup()
      
    } catch (error) {
      logger.error('Failed to initialize storage:', error)
      throw error
    }
  }

  private async loadData(): Promise<void> {
    try {
      const rawData = await fs.readFile(this.dataFilePath, 'utf-8')
      this.data = JSON.parse(rawData)
      
      // Migrate data if needed
      this.migrateData()
      
    } catch (error) {
      logger.error('Failed to load storage data:', error)
      throw error
    }
  }

  private async saveData(): Promise<void> {
    try {
      this.data.settings.lastBackup = new Date()
      const dataString = JSON.stringify(this.data, null, 2)
      await fs.writeFile(this.dataFilePath, dataString, 'utf-8')
      
    } catch (error) {
      logger.error('Failed to save storage data:', error)
      throw error
    }
  }

  private migrateData(): void {
    // Handle data migration between versions
    if (!this.data.settings.version) {
      this.data.settings.version = '1.0.0'
    }
    
    // Ensure all required fields exist
    if (!this.data.shows) this.data.shows = []
    if (!this.data.queue) this.data.queue = []
    if (!this.data.settings) {
      this.data.settings = {
        version: '1.0.0',
        watchInterval: 5000,
        globalWatchDirectory: process.env.GLOBAL_WATCH_DIR || 'Watch',
        globalOutputDirectory: process.env.GLOBAL_OUTPUT_DIR || 'Output'
      }
    }
    
    // Add global directories if missing
    if (!this.data.settings.globalWatchDirectory) {
      this.data.settings.globalWatchDirectory = process.env.GLOBAL_WATCH_DIR || 'Watch'
    }
    if (!this.data.settings.globalOutputDirectory) {
      this.data.settings.globalOutputDirectory = process.env.GLOBAL_OUTPUT_DIR || 'Output'
    }
  }

  private async createBackup(): Promise<void> {
    try {
      const backupDir = path.join(this.storagePath, 'backups')
      await fs.ensureDir(backupDir)
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `backup-${timestamp}.json`)
      
      await fs.copy(this.dataFilePath, backupPath)
      
      // Clean old backups (keep last 10)
      const backups = await fs.readdir(backupDir)
      const sortedBackups = backups
        .filter(f => f.startsWith('backup-'))
        .sort()
        .reverse()
      
      if (sortedBackups.length > 10) {
        const toDelete = sortedBackups.slice(10)
        await Promise.all(
          toDelete.map(backup => 
            fs.remove(path.join(backupDir, backup))
          )
        )
      }
      
    } catch (error) {
      logger.warn('Failed to create backup:', error)
    }
  }

  // Show operations
  async getAllShows(): Promise<ShowProfile[]> {
    return [...this.data.shows]
  }

  async getShow(id: string): Promise<ShowProfile | null> {
    return this.data.shows.find(show => show.id === id) || null
  }

  async createShow(showData: Omit<ShowProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShowProfile> {
    const show: ShowProfile = {
      ...showData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.data.shows.push(show)
    await this.saveData()
    
    logger.info(`Show created: ${show.name} (${show.id})`)
    return show
  }

  async updateShow(id: string, updates: Partial<ShowProfile>): Promise<ShowProfile | null> {
    const index = this.data.shows.findIndex(show => show.id === id)
    if (index === -1) return null

    this.data.shows[index] = {
      ...this.data.shows[index],
      ...updates,
      id, // Preserve ID
      updatedAt: new Date()
    }

    await this.saveData()
    
    logger.info(`Show updated: ${this.data.shows[index].name} (${id})`)
    return this.data.shows[index]
  }

  async deleteShow(id: string): Promise<boolean> {
    const index = this.data.shows.findIndex(show => show.id === id)
    if (index === -1) return false

    const deletedShow = this.data.shows.splice(index, 1)[0]
    await this.saveData()
    
    logger.info(`Show deleted: ${deletedShow.name} (${id})`)
    return true
  }

  // Queue operations
  async getQueue(): Promise<QueuedFile[]> {
    return [...this.data.queue]
  }

  async addToQueue(file: Omit<QueuedFile, 'id' | 'addedAt'>): Promise<QueuedFile> {
    const queuedFile: QueuedFile = {
      ...file,
      id: uuidv4(),
      addedAt: new Date()
    }

    this.data.queue.push(queuedFile)
    await this.saveData()
    
    logger.info(`File added to queue: ${queuedFile.filename}`)
    return queuedFile
  }

  async updateQueueItem(id: string, updates: Partial<QueuedFile>): Promise<QueuedFile | null> {
    const index = this.data.queue.findIndex(item => item.id === id)
    if (index === -1) return null

    this.data.queue[index] = {
      ...this.data.queue[index],
      ...updates,
      id // Preserve ID
    }

    await this.saveData()
    return this.data.queue[index]
  }

  async removeFromQueue(id: string): Promise<boolean> {
    const index = this.data.queue.findIndex(item => item.id === id)
    if (index === -1) return false

    const removedFile = this.data.queue.splice(index, 1)[0]
    await this.saveData()
    
    logger.info(`File removed from queue: ${removedFile.filename}`)
    return true
  }

  async clearQueue(): Promise<void> {
    this.data.queue = []
    await this.saveData()
    logger.info('Queue cleared')
  }

  // Settings operations
  async getSettings(): Promise<StorageData['settings']> {
    return { ...this.data.settings }
  }

  async updateSettings(updates: Partial<StorageData['settings']>): Promise<StorageData['settings']> {
    this.data.settings = {
      ...this.data.settings,
      ...updates
    }
    
    await this.saveData()
    logger.info('Settings updated')
    return this.data.settings
  }

  // System status
  async getSystemStatus(): Promise<SystemStatus> {
    return {
      isRunning: true,
      version: this.data.settings.version,
      uptime: process.uptime(),
      watchedDirectories: this.data.shows.filter(s => s.enabled).length,
      queuedFiles: this.data.queue.length,
      processingFiles: this.data.queue.filter(f => f.status === 'processing').length,
      lastScan: this.data.settings.lastBackup,
      errors: []
    }
  }
} 