export interface AudioFile {
  id: string
  filename: string
  duration: number // in seconds
  sampleRate: number // Hz (e.g., 44100, 48000)
  channels: number // 1 = mono, 2 = stereo
  format: string // e.g., 'mp3', 'wav', 'flac'
  bitRate?: number // kbps
  fileSize: number // bytes
  filePath: string
  createdAt: Date
  lastModified: Date
}

export interface WaveformData {
  peaks: number[] // Normalized peak values (0-1)
  duration: number // Duration in seconds
  samplesPerPixel: number // How many audio samples each peak represents
  sampleRate: number
  channels: number
}

export interface TrimPoints {
  startTime: number // Start trim point in seconds
  endTime: number // End trim point in seconds
  fadeInDuration: number // Fade in duration in seconds
  fadeOutDuration: number // Fade out duration in seconds
}

export interface AudioProcessingJob {
  id: string
  fileId: string
  showId: string
  operations: AudioOperation[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  startedAt?: Date
  completedAt?: Date
  error?: string
  outputPath?: string
  processingTimeMs?: number
}

export interface AudioOperation {
  type: 'trim' | 'normalize' | 'fade' | 'noise-reduction' | 'eq'
  parameters: Record<string, any>
  enabled: boolean
}

export interface TrimOperation extends AudioOperation {
  type: 'trim'
  parameters: {
    startTime: number
    endTime: number
    fadeInDuration: number
    fadeOutDuration: number
  }
}

export interface NormalizeOperation extends AudioOperation {
  type: 'normalize'
  parameters: {
    targetLevel: number // dB (e.g., -23 for broadcast standard)
    peakLimit: number // dB
  }
}

export interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isLoading: boolean
  error?: string
}

export interface PromoFile {
  id: string
  name: string
  filename: string
  duration: number
  categories: string[]
  shows: string[] // Show IDs this promo is assigned to
  timeSlots: string[] // e.g., 'morning', 'afternoon', 'evening'
  playCount: number
  lastPlayed?: Date
  filePath: string
  audioFile: AudioFile
  createdAt: Date
  updatedAt: Date
}

export interface AudioSettings {
  defaultTrimSettings: TrimPoints
  normalizationEnabled: boolean
  normalizationLevel: number // dB
  fadeInDefault: number // seconds
  fadeOutDefault: number // seconds
  autoTrimSilence: boolean
  silenceThreshold: number // dB
  outputFormat: 'mp3' | 'wav' | 'aac'
  outputQuality: number // 1-10
} 