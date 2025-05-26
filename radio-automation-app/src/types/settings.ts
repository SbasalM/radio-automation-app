export interface GeneralSettings {
  appName: string
  timezone: string
  dateFormat: string
  timeFormat: string
  language: string
  theme: 'light' | 'dark' | 'auto'
  compactMode: boolean
  showTooltips: boolean
}

export interface ProcessingDefaults {
  audioFormat: 'mp3' | 'wav' | 'flac'
  sampleRate: 44100 | 48000 | 96000
  bitRate: 128 | 192 | 256 | 320 // For MP3
  normalizationLevel: number // LUFS
  autoTrimSilence: boolean
  silenceThreshold: number // dB
  defaultFadeIn: number // seconds
  defaultFadeOut: number // seconds
  defaultTrimPadding: number // seconds
  enableAutoGain: boolean
  compressionRatio: number
  limiterThreshold: number // dB
}

export interface NotificationSettings {
  emailEnabled: boolean
  emailAddress: string
  smtpServer: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpSSL: boolean
  bufferTimeMinutes: number
  desktopNotifications: boolean
  soundNotifications: boolean
  webhookUrl: string
  alertTypes: {
    processingErrors: boolean
    processingComplete: boolean
    fileDetected: boolean
    lowStorage: boolean
    ftpErrors: boolean
    missedDeadlines: boolean
    systemWarnings: boolean
  }
}

export interface WatchFolderSettings {
  enabled: boolean
  scanIntervalSeconds: number
  filePatterns: string[]
  duplicateHandling: 'skip' | 'overwrite' | 'rename'
  moveProcessedFiles: boolean
  processedFilesPath: string
  maxFileAge: number // hours
  minFileSize: number // MB
  maxFileSize: number // MB
  autoCreateSubfolders: boolean
  monitorSubfolders: boolean
}

export interface StorageSettings {
  primaryStoragePath: string
  backupStoragePath: string
  retentionDays: number
  autoCleanupEnabled: boolean
  cleanupSchedule: string // cron format
  archiveOldFiles: boolean
  archivePath: string
  compressionEnabled: boolean
  maxStorageUsage: number // percentage
  lowSpaceWarning: number // GB
  cloudSyncEnabled: boolean
  cloudProvider: 'disabled' | 'aws' | 'google' | 'azure'
  cloudBucket: string
}

export interface SystemSettings {
  autoStartProcessing: boolean
  maxConcurrentJobs: number
  memoryLimit: number // MB
  cpuPriority: 'low' | 'normal' | 'high'
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  enablePerformanceMonitoring: boolean
  enableDetailedLogging: boolean
  maxLogFiles: number
  logRetentionDays: number
  enableCrashReports: boolean
  enableUsageAnalytics: boolean
  checkUpdatesAutomatically: boolean
  betaUpdates: boolean
}

export interface ApplicationSettings {
  general: GeneralSettings
  processing: ProcessingDefaults
  notifications: NotificationSettings
  watchFolders: WatchFolderSettings
  storage: StorageSettings
  system: SystemSettings
  version: string
  lastUpdated: Date
}

export interface SettingsBackup {
  exportedAt: Date
  version: string
  settings: ApplicationSettings
  metadata: {
    exportedBy: string
    systemInfo: string
    checksum: string
  }
}

export interface SettingsValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Default settings
export const defaultSettings: ApplicationSettings = {
  general: {
    appName: 'Radio Flow',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    language: 'en-US',
    theme: 'auto',
    compactMode: false,
    showTooltips: true
  },
  processing: {
    audioFormat: 'mp3',
    sampleRate: 44100,
    bitRate: 192,
    normalizationLevel: -23,
    autoTrimSilence: true,
    silenceThreshold: -60,
    defaultFadeIn: 0.5,
    defaultFadeOut: 1.0,
    defaultTrimPadding: 0.2,
    enableAutoGain: true,
    compressionRatio: 3.0,
    limiterThreshold: -1
  },
  notifications: {
    emailEnabled: false,
    emailAddress: '',
    smtpServer: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    smtpSSL: true,
    bufferTimeMinutes: 60,
    desktopNotifications: true,
    soundNotifications: false,
    webhookUrl: '',
    alertTypes: {
      processingErrors: true,
      processingComplete: true,
      fileDetected: true,
      lowStorage: true,
      ftpErrors: true,
      missedDeadlines: true,
      systemWarnings: true
    }
  },
  watchFolders: {
    enabled: true,
    scanIntervalSeconds: 30,
    filePatterns: ['*.mp3', '*.wav', '*.flac'],
    duplicateHandling: 'skip',
    moveProcessedFiles: true,
    processedFilesPath: './processed',
    maxFileAge: 168, // 7 days
    minFileSize: 0.1,
    maxFileSize: 500,
    autoCreateSubfolders: true,
    monitorSubfolders: true
  },
  storage: {
    primaryStoragePath: './audio',
    backupStoragePath: './backup',
    retentionDays: 30,
    autoCleanupEnabled: true,
    cleanupSchedule: '0 2 * * *', // 2 AM daily
    archiveOldFiles: true,
    archivePath: './archive',
    compressionEnabled: false,
    maxStorageUsage: 85,
    lowSpaceWarning: 10,
    cloudSyncEnabled: false,
    cloudProvider: 'disabled',
    cloudBucket: ''
  },
  system: {
    autoStartProcessing: true,
    maxConcurrentJobs: 3,
    memoryLimit: 1024,
    cpuPriority: 'normal',
    logLevel: 'info',
    enablePerformanceMonitoring: true,
    enableDetailedLogging: false,
    maxLogFiles: 10,
    logRetentionDays: 7,
    enableCrashReports: true,
    enableUsageAnalytics: false,
    checkUpdatesAutomatically: true,
    betaUpdates: false
  },
  version: '1.0.0',
  lastUpdated: new Date()
} 