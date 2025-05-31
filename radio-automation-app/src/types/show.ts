export interface FilePattern {
  id: string
  pattern: string // Smart pattern that supports both wildcards (*) and extraction placeholders ({YYYY}, {DOTW})
  type: 'ftp' | 'watch'
  ftpProfileId?: string
  watchPath?: string // Folder path to watch (for 'watch' type) - falls back to global setting if not specified
}

export interface MetadataExtractionRule {
  field: 'showName' | 'date' | 'episode' | 'segment' | 'reporter' | 'storyId' | 'custom'
  source: 'filename' | 'directory' | 'static' | 'regex'
  regexGroup?: number  // For regex extraction
  staticValue?: string // For static values
  customFieldName?: string // For custom fields
  dateFormat?: string // For date parsing
  fallbackValue?: string
}

export interface MetadataMapping {
  inputPatterns: string[] // Array of regex patterns to match incoming filenames
  extractionRules: MetadataExtractionRule[]
  outputMetadata: {
    title?: string // Can include placeholders like {showName}, {date}, {episode}
    artist?: string
    album?: string
    year?: string
    genre?: string
    comment?: string
    customFields: Record<string, string> // Additional metadata fields
  }
}

export interface FileNamingRules {
  outputPattern: string // e.g., "{ShowName}_{YYYY-MM-DD}_{Episode}"
  dateFormat: 'YYYY-MM-DD' | 'YYYYMMDD' | 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'custom'
  customDateFormat?: string
  caseConversion: 'none' | 'uppercase' | 'lowercase' | 'titlecase' | 'camelcase'
  invalidCharacterHandling: 'remove' | 'replace' | 'underscore'
  replacementCharacter?: string
  maxLength?: number
  prefixPattern?: string
  suffixPattern?: string
}

export interface TrimSettings {
  startSeconds: number
  endSeconds: number
  fadeIn: boolean
  fadeOut: boolean
}

export interface AdvancedAudioSettings {
  // Normalization
  normalizationLevel: number // LUFS (-30 to -12)
  autoGain: boolean
  
  // Silence Detection
  trimSilence: boolean
  silenceThreshold: number // dB
  silencePadding: number // seconds
  
  // Fades
  fadeInDuration: number // seconds
  fadeOutDuration: number // seconds
  
  // Format & Quality
  outputFormat: 'mp3' | 'wav' | 'flac' | 'aac'
  sampleRate: 44100 | 48000 | 96000
  bitRate: 128 | 192 | 256 | 320 // For MP3
  
  // Effects
  enableCompression: boolean
  compressionRatio: number // 1:1 to 10:1
  compressionThreshold: number // dB
  enableLimiter: boolean
  limiterThreshold: number // dB
  
  // EQ Settings
  enableEQ: boolean
  lowFreqGain: number // dB
  midFreqGain: number // dB
  highFreqGain: number // dB
  
  // Advanced
  enableDeEsser: boolean
  deEsserThreshold: number
  enableNoiseGate: boolean
  noiseGateThreshold: number
}

export interface ProcessingOptions {
  normalize: boolean
  addPromoTag: boolean
  promoTagId?: string
  useGlobalSettings: boolean // If true, ignore audioSettings below
  audioSettings: AdvancedAudioSettings
}

export interface ShowTemplate {
  id: string
  name: string
  description: string
  metadataMapping: MetadataMapping
  fileNamingRules: FileNamingRules
  processingOptions: ProcessingOptions
  isBuiltIn: boolean
  createdBy?: string
  createdAt: Date
}

export interface ShowProfile {
  id: string
  name: string
  description?: string
  enabled: boolean
  filePatterns: FilePattern[]
  outputDirectory: string
  
  // Enhanced metadata and naming
  metadataMapping: MetadataMapping
  fileNamingRules: FileNamingRules
  
  // Legacy trim settings (for backward compatibility)
  trimSettings: TrimSettings
  
  // Enhanced processing options
  processingOptions: ProcessingOptions
  
  // Templates and presets
  templateId?: string // Reference to a saved template
  
  // Scheduling and automation
  autoProcessing: boolean
  processOnSchedule: boolean
  schedulePattern?: string // Cron pattern
  processExistingFiles: boolean // Whether to process existing files in watch folders or only new ones
  
  // Monitoring and alerts
  enableNotifications: boolean
  notificationEmails: string[]
  alertOnErrors: boolean
  alertOnMissingFiles: boolean
  
  // Statistics and logging
  totalFilesProcessed: number
  lastProcessedAt?: Date
  averageProcessingTime: number
  errorCount: number
  
  createdAt: Date
  updatedAt: Date
}

// Processing results and metadata
export interface FileProcessingResult {
  originalFilename: string
  newFilename: string
  extractedMetadata: Record<string, any>
  appliedMetadata: Record<string, any>
  processingSettings: AdvancedAudioSettings
  processingTime: number
  errors: string[]
  warnings: string[]
  confidence: number // How confident we are in the pattern match
}

// Pattern testing and validation
export interface PatternTestResult {
  pattern: string
  filename: string
  matches: boolean
  extractedData: Record<string, any>
  previewFilename: string
  previewMetadata: Record<string, any>
  warnings: string[]
  confidence: number
}

// Built-in templates for common show types
export const BUILT_IN_TEMPLATES: ShowTemplate[] = [
  {
    id: 'morning-show',
    name: 'Morning Show',
    description: 'Daily morning show with date and segment tracking',
    metadataMapping: {
      inputPatterns: [
        'MorningShow_(\\d{8})_([^.]+)\\.(mp3|wav)',
        'morning[_-](\\d{4})(\\d{2})(\\d{2})[_-](.+)\\.(mp3|wav)'
      ],
      extractionRules: [
        { field: 'date', source: 'regex', regexGroup: 1, dateFormat: 'YYYYMMDD' },
        { field: 'segment', source: 'regex', regexGroup: 2 }
      ],
      outputMetadata: {
        title: 'Morning Show - {segment}',
        artist: 'WXYZ Radio',
        album: 'Morning Show {YYYY}',
        genre: 'Talk Radio',
        customFields: {}
      }
    },
    fileNamingRules: {
      outputPattern: 'Morning_Show_{YYYY}-{MM}-{DD}_Seg{segment}',
      dateFormat: 'YYYY-MM-DD',
      caseConversion: 'none',
      invalidCharacterHandling: 'underscore'
    },
    processingOptions: {
      normalize: true,
      addPromoTag: false,
      useGlobalSettings: false,
      audioSettings: {
        normalizationLevel: -16,
        autoGain: true,
        trimSilence: true,
        silenceThreshold: -50,
        silencePadding: 0.5,
        fadeInDuration: 1,
        fadeOutDuration: 2,
        outputFormat: 'mp3',
        sampleRate: 44100,
        bitRate: 192,
        enableCompression: true,
        compressionRatio: 3,
        compressionThreshold: -12,
        enableLimiter: true,
        limiterThreshold: -3,
        enableEQ: false,
        lowFreqGain: 0,
        midFreqGain: 0,
        highFreqGain: 0,
        enableDeEsser: false,
        deEsserThreshold: -20,
        enableNoiseGate: false,
        noiseGateThreshold: -60
      }
    },
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: 'news-hour',
    name: 'News Hour',
    description: 'Hourly news with reporter and story tracking',
    metadataMapping: {
      inputPatterns: [
        'news[_-](\\w+)[_-](\\d+)\\.(wav|mp3)',
        'News_(\\d{8})_(\\w+)_Story(\\d+)\\.(wav|mp3)'
      ],
      extractionRules: [
        { field: 'reporter', source: 'regex', regexGroup: 1 },
        { field: 'storyId', source: 'regex', regexGroup: 2 }
      ],
      outputMetadata: {
        title: 'News - Story {storyId}',
        artist: '{reporter}',
        album: 'News {YYYY}',
        genre: 'News',
        customFields: {}
      }
    },
    fileNamingRules: {
      outputPattern: 'News_{YYYY}{MM}{DD}_{reporter}_{storyId}',
      dateFormat: 'YYYYMMDD',
      caseConversion: 'titlecase',
      invalidCharacterHandling: 'underscore'
    },
    processingOptions: {
      normalize: true,
      addPromoTag: false,
      useGlobalSettings: false,
      audioSettings: {
        normalizationLevel: -23,
        autoGain: false,
        trimSilence: false,
        silenceThreshold: -60,
        silencePadding: 0,
        fadeInDuration: 0,
        fadeOutDuration: 0.5,
        outputFormat: 'mp3',
        sampleRate: 44100,
        bitRate: 256,
        enableCompression: true,
        compressionRatio: 6,
        compressionThreshold: -18,
        enableLimiter: true,
        limiterThreshold: -1,
        enableEQ: true,
        lowFreqGain: -2,
        midFreqGain: 2,
        highFreqGain: 1,
        enableDeEsser: true,
        deEsserThreshold: -15,
        enableNoiseGate: true,
        noiseGateThreshold: -50
      }
    },
    isBuiltIn: true,
    createdAt: new Date()
  }
] 