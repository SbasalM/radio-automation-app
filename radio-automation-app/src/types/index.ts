export interface Monitor {
  id: string
  name: string
  path: string
  isActive: boolean
  lastActivity?: Date
}

export interface QueuedFile {
  id: string
  filename: string
  path: string
  size: number
  addedAt: Date
  status: 'pending' | 'processing' | 'completed' | 'error'
}

export interface ProcessedFile {
  id: string
  filename: string
  originalPath: string
  processedPath: string
  processedAt: Date
  success: boolean
  errorMessage?: string
}

export interface Schedule {
  id: string
  name: string
  time: string
  isActive: boolean
  nextRun?: Date
}

export interface ActivityLog {
  id: string
  timestamp: Date
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: string
} 