// Shared types between frontend and backend

export enum FileStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface QueuedFile {
  id: string
  filename: string
  showId: string
  status: FileStatus
  addedAt: Date
  processedAt?: Date
  error?: string
  sourcePath: string
  outputPath?: string
  processingTimeMs?: number
}

export interface ProcessingResult {
  success: boolean
  outputPath?: string
  error?: string
  processingTimeMs?: number
}

export interface WatchDirectory {
  id: string
  path: string
  enabled: boolean
  lastScanned?: Date
  fileCount?: number
}

export interface SystemStatus {
  isRunning: boolean
  version: string
  uptime: number
  watchedDirectories: number
  queuedFiles: number
  processingFiles: number
  lastScan?: Date
  errors: string[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface FileOperationResult {
  success: boolean
  path?: string
  error?: string
  bytesProcessed?: number
}

// API Request/Response types
export interface StartWatchingRequest {
  showIds: string[]
}

export interface ScanFilesRequest {
  directories?: string[]
  force?: boolean
}

export interface RetryFileRequest {
  fileId: string
}

export interface CreateShowRequest {
  name: string
  description?: string
  enabled: boolean
  filePatterns: Array<{
    pattern: string
    type: 'ftp' | 'watch'
    ftpProfileId?: string
  }>
  outputDirectory: string
  // ... other show properties
} 