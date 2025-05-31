export interface FTPProfile {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string // TODO: Encrypt in production
  protocol: 'ftp' | 'ftps' | 'sftp'
  basePath: string
  enabled: boolean
  lastTested?: Date
  connectionStatus?: 'connected' | 'disconnected' | 'testing' | 'error'
  createdAt: Date
  updatedAt: Date
}

export interface FTPSchedule {
  id: string
  name: string
  ftpProfileId: string
  showId: string
  filePattern: string // e.g., "show_{YYYY-MM-DD}.mp3"
  cronExpression: string
  lastRun?: Date
  nextRun?: Date
  enabled: boolean
  // Enhanced download options
  downloadMode: 'current-day' | 'all-new' | 'pattern-match'
  maxFilesPerRun: number // Configurable file limit (0 = unlimited)
  trackDownloadHistory: boolean // Enable duplicate detection
  createdAt: Date
  updatedAt: Date
}

export interface FTPDownloadResult {
  success: boolean
  filesDownloaded: string[]
  filesSkipped: string[] // Files skipped due to already downloaded
  totalFilesFound: number
  error?: string
  downloadedAt: Date
  scheduleId?: string
  downloadMode?: string
}

export interface FTPFile {
  name: string
  size: number
  modifiedDate: Date
  path: string
  // Enhanced tracking
  checksum?: string // For duplicate detection
  isNew?: boolean // Computed field for new/changed files
}

// Download history tracking
export interface FTPDownloadHistory {
  id: string
  scheduleId: string
  filename: string
  filePath: string
  fileSize: number
  fileModified: Date
  checksum?: string
  downloadedAt: Date
  successful: boolean
}

// History management settings
export interface FTPHistorySettings {
  // Retention settings
  successfulDownloadRetentionDays: number // Default: 90 days
  failedDownloadRetentionDays: number // Default: 30 days
  maxHistoryPerSchedule: number // Default: 1000 records
  
  // Daily export settings
  enableDailyExport: boolean // Default: true
  exportPath: string // Default: './logs/ftp-downloads'
  exportFormat: 'json' | 'csv' | 'both' // Default: 'both'
  exportTime: string // Cron expression, default: '0 1 * * *' (1 AM daily)
  
  // Cleanup settings
  enableAutoCleanup: boolean // Default: true
  cleanupTime: string // Cron expression, default: '0 2 * * *' (2 AM daily)
  
  // Last operation tracking
  lastExport?: Date
  lastCleanup?: Date
}

// Daily export log structure
export interface FTPDailyExport {
  date: string // YYYY-MM-DD
  exportedAt: Date
  totalRecords: number
  successfulDownloads: number
  failedDownloads: number
  scheduleBreakdown: {
    scheduleId: string
    scheduleName: string
    downloads: number
    failures: number
  }[]
  records: FTPDownloadHistory[]
}

// Production-ready security interface
export interface FTPSecurityConfig {
  enablePasswordEncryption: boolean
  encryptionKey?: string
  connectionTimeout: number // milliseconds
  retryAttempts: number
  retryDelay: number // milliseconds
  enableSSLValidation: boolean
  maxConcurrentConnections: number
}

// Environment configuration
export interface FTPEnvironmentConfig {
  environment: 'development' | 'staging' | 'production'
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableMockMode: boolean // Only for development
  dataStoragePath: string
  tempDirectory: string
  backupRetention: number // days
}

export interface CronPreset {
  id: string
  name: string
  expression: string
  description: string
} 