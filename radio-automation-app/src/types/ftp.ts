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
  createdAt: Date
  updatedAt: Date
}

export interface FTPDownloadResult {
  success: boolean
  filesDownloaded: string[]
  error?: string
  downloadedAt: Date
  scheduleId?: string
}

export interface FTPFile {
  name: string
  size: number
  modifiedDate: Date
  path: string
}

export interface CronPreset {
  id: string
  name: string
  expression: string
  description: string
} 