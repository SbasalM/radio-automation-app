export interface FilePattern {
  id: string
  pattern: string
  type: 'ftp' | 'watch'
  ftpProfileId?: string
}

export interface TrimSettings {
  startSeconds: number
  endSeconds: number
  fadeIn: boolean
  fadeOut: boolean
}

export interface ProcessingOptions {
  normalize: boolean
  addPromoTag: boolean
  promoTagId?: string
}

export interface ShowProfile {
  id: string
  name: string
  enabled: boolean
  filePatterns: FilePattern[]
  outputDirectory: string
  trimSettings: TrimSettings
  processingOptions: ProcessingOptions
  createdAt: Date
  updatedAt: Date
} 