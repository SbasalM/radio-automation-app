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