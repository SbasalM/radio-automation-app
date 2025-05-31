import { useState, useEffect, useCallback } from 'react'
import { X, Settings, FileText, Music, Tags, Speaker, Folder, Info, Volume2, Waves, Sliders, Zap, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FilePatternInput } from './FilePatternInput'
import { MetadataConfig } from './MetadataConfig'
import { AudioProcessingConfig } from './AudioProcessingConfig'
import { EnhancedTrimEditor } from '@/components/audio/EnhancedTrimEditor'
import { useShowStore } from '@/store/show-store'
import { audioService } from '@/services/audio-service'
import type { ShowProfile, FilePattern, MetadataMapping, AdvancedAudioSettings, FileNamingRules, ProcessingOptions } from '@/types/show'
import type { AudioFile, TrimPoints } from '@/types/audio'

interface ShowFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingShow?: ShowProfile | null
}

type TabType = 'general' | 'patterns' | 'metadata' | 'audio' | 'promo'

// Audio processing sub-tabs
type AudioSubTab = 'general' | 'quality' | 'effects' | 'advanced' | 'trim' | 'processing'

// Default values to ensure all required fields are present
const DEFAULT_AUDIO_SETTINGS: AdvancedAudioSettings = {
  normalizationLevel: -16,
  autoGain: true,
  trimSilence: false,
  silenceThreshold: -50,
  silencePadding: 0.5,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  outputFormat: 'mp3',
  sampleRate: 44100,
  bitRate: 192,
  enableCompression: false,
  compressionRatio: 3,
  compressionThreshold: -12,
  enableLimiter: false,
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

const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  normalize: true,
  addPromoTag: false,
  promoTagId: undefined,
  useGlobalSettings: true,
  audioSettings: DEFAULT_AUDIO_SETTINGS
}

const DEFAULT_METADATA_MAPPING: MetadataMapping = {
  inputPatterns: [''],
  extractionRules: [],
  outputMetadata: {
    title: '{showName}',
    artist: 'Station',
    album: '{showName} {YYYY}',
    genre: 'Radio',
    customFields: {}
  }
}

const DEFAULT_FILE_NAMING_RULES: FileNamingRules = {
  outputPattern: '{showName}',
  dateFormat: 'YYYY-MM-DD',
  caseConversion: 'none',
  invalidCharacterHandling: 'underscore'
}

export function ShowFormModal({ isOpen, onClose, editingShow }: ShowFormModalProps) {
  const { addShow, updateShow } = useShowStore()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [activeAudioSubTab, setActiveAudioSubTab] = useState<AudioSubTab>('general')
  const [trimEnabled, setTrimEnabled] = useState(false)
  const [sampleAudioFile, setSampleAudioFile] = useState<AudioFile | null>(null)
  
  const [formData, setFormData] = useState<{
    name: string
    description?: string
    enabled: boolean
    filePatterns: FilePattern[]
    outputDirectory: string
    metadataMapping: MetadataMapping
    fileNamingRules: FileNamingRules
    trimSettings: {
      startSeconds: number
      endSeconds: number
      fadeIn: boolean
      fadeOut: boolean
    }
    processingOptions: ProcessingOptions
    // Additional required fields for ShowProfile
    autoProcessing: boolean
    processOnSchedule: boolean
    schedulePattern?: string
    processExistingFiles: boolean
    enableNotifications: boolean
    notificationEmails: string[]
    alertOnErrors: boolean
    alertOnMissingFiles: boolean
    totalFilesProcessed: number
    lastProcessedAt?: Date
    averageProcessingTime: number
    errorCount: number
  }>({
    name: '',
    description: '',
    enabled: true,
    filePatterns: [{ id: '1', pattern: '', type: 'watch' as const }] as FilePattern[],
    outputDirectory: '',
    metadataMapping: DEFAULT_METADATA_MAPPING,
    fileNamingRules: DEFAULT_FILE_NAMING_RULES,
    trimSettings: {
      startSeconds: 0,
      endSeconds: 0,
      fadeIn: false,
      fadeOut: false
    },
    processingOptions: DEFAULT_PROCESSING_OPTIONS,
    autoProcessing: true,
    processOnSchedule: false,
    processExistingFiles: false,
    enableNotifications: false,
    notificationEmails: [],
    alertOnErrors: true,
    alertOnMissingFiles: false,
    totalFilesProcessed: 0,
    averageProcessingTime: 0,
    errorCount: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingShow) {
      setTrimEnabled((editingShow.trimSettings?.startSeconds || 0) > 0 || (editingShow.trimSettings?.endSeconds || 0) > 0)
      setFormData({
        name: editingShow.name,
        description: editingShow.description || '',
        enabled: editingShow.enabled,
        filePatterns: editingShow.filePatterns || [{ id: Date.now().toString(), pattern: '', type: 'watch' }],
        outputDirectory: editingShow.outputDirectory || '',
        metadataMapping: editingShow.metadataMapping || DEFAULT_METADATA_MAPPING,
        fileNamingRules: editingShow.fileNamingRules || DEFAULT_FILE_NAMING_RULES,
        trimSettings: editingShow.trimSettings || {
          startSeconds: 0,
          endSeconds: 0,
          fadeIn: false,
          fadeOut: false
        },
        processingOptions: editingShow.processingOptions || DEFAULT_PROCESSING_OPTIONS,
        autoProcessing: editingShow.autoProcessing ?? true,
        processOnSchedule: editingShow.processOnSchedule ?? false,
        schedulePattern: editingShow.schedulePattern || '',
        processExistingFiles: editingShow.processExistingFiles ?? false,
        enableNotifications: editingShow.enableNotifications ?? false,
        notificationEmails: editingShow.notificationEmails || [],
        alertOnErrors: editingShow.alertOnErrors ?? true,
        alertOnMissingFiles: editingShow.alertOnMissingFiles ?? false,
        totalFilesProcessed: editingShow.totalFilesProcessed ?? 0,
        lastProcessedAt: editingShow.lastProcessedAt,
        averageProcessingTime: editingShow.averageProcessingTime ?? 0,
        errorCount: editingShow.errorCount ?? 0
      })
    } else {
      // Reset form for new show
      setFormData({
        name: '',
        description: '',
        enabled: true,
        filePatterns: [{ id: Date.now().toString(), pattern: '', type: 'watch' }],
        outputDirectory: '',
        metadataMapping: DEFAULT_METADATA_MAPPING,
        fileNamingRules: DEFAULT_FILE_NAMING_RULES,
        trimSettings: {
          startSeconds: 0,
          endSeconds: 0,
          fadeIn: false,
          fadeOut: false
        },
        processingOptions: DEFAULT_PROCESSING_OPTIONS,
        autoProcessing: true,
        processOnSchedule: false,
        schedulePattern: '',
        processExistingFiles: false,
        enableNotifications: false,
        notificationEmails: [],
        alertOnErrors: true,
        alertOnMissingFiles: false,
        totalFilesProcessed: 0,
        averageProcessingTime: 0,
        errorCount: 0
      })
    }
    setErrors({})
    setActiveTab('general')
  }, [editingShow, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Show name is required'
    }

    // Output directory is optional - will use global default if empty
    // No validation needed for outputDirectory

    const hasValidPattern = formData.filePatterns.some(p => p.pattern.trim())
    if (!hasValidPattern) {
      newErrors.filePatterns = 'At least one file pattern is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setActiveTab('general') // Switch to general tab if validation fails
      return
    }

    try {
      // Include all form data, not just a subset
      const showData = {
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        filePatterns: formData.filePatterns.filter(p => p.pattern.trim()),
        outputDirectory: formData.outputDirectory, // Optional - backend will use global default if empty
        autoProcessing: formData.autoProcessing,
        // Include metadata and other settings
        metadataMapping: formData.metadataMapping,
        fileNamingRules: formData.fileNamingRules,
        trimSettings: formData.trimSettings,
        processingOptions: formData.processingOptions,
        processOnSchedule: formData.processOnSchedule,
        schedulePattern: formData.schedulePattern,
        processExistingFiles: formData.processExistingFiles,
        enableNotifications: formData.enableNotifications,
        notificationEmails: formData.notificationEmails,
        alertOnErrors: formData.alertOnErrors,
        alertOnMissingFiles: formData.alertOnMissingFiles
      }

      console.log('Saving show with trim settings:', formData.trimSettings)
      console.log('Full show data:', showData)

      if (editingShow) {
        await updateShow(editingShow.id, showData)
        alert(`✅ Show "${formData.name}" updated successfully!`)
      } else {
        await addShow(showData)
        alert(`✅ Show "${formData.name}" created successfully!`)
      }

      onClose()
    } catch (error) {
      console.error('Failed to save show:', error)
      alert('❌ Failed to save show. Please try again.')
    }
  }

  // Load sample file for trim editor
  const handleLoadSampleFile = async () => {
    try {
      // Try to use the actual audio file if available
      const actualFileName = 'AnswersInGenesis_100424.wav' // The actual file we know exists
      
      // Use the audio service to get real audio metadata
      const realAudioFile = await audioService.analyzeAudioFile(actualFileName, 10585084)
      console.log('Loaded real audio file:', realAudioFile)
      
      setSampleAudioFile(realAudioFile)
      
      // Set default trim points to a reasonable section (first 30 seconds) if none exist
      if (formData.trimSettings.startSeconds === 0 && formData.trimSettings.endSeconds === 0) {
        const reasonableEndTime = Math.min(30, realAudioFile.duration) // First 30 seconds or full duration if shorter
        setFormData({
          ...formData,
          trimSettings: {
            ...formData.trimSettings,
            startSeconds: 0, // Start at beginning
            endSeconds: reasonableEndTime // End after 30 seconds or at file end
          }
        })
      }
    } catch (error) {
      console.error('Failed to load sample file:', error)
      
      // Fallback to known values for the test file
      const fallbackAudioFile: AudioFile = {
        id: 'sample-' + Date.now(),
        filename: 'AnswersInGenesis_100424.wav',
        duration: 541, // Known correct duration
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        fileSize: 10585084, // Known file size
        filePath: 'http://localhost:3001/api/audio/AnswersInGenesis_100424.wav',
        createdAt: new Date(),
        lastModified: new Date()
      }
      setSampleAudioFile(fallbackAudioFile)
      
      // Set reasonable default trim for fallback too
      if (formData.trimSettings.startSeconds === 0 && formData.trimSettings.endSeconds === 0) {
        setFormData({
          ...formData,
          trimSettings: {
            ...formData.trimSettings,
            startSeconds: 0,
            endSeconds: 30 // First 30 seconds
          }
        })
      }
    }
  }

  // Save trim points to show profile
  const handleSaveTrimPoints = (trimPoints: TrimPoints) => {
    setFormData(prev => ({
      ...prev,
      trimSettings: {
        startSeconds: trimPoints.startTime,
        endSeconds: trimPoints.endTime,
        fadeIn: trimPoints.fadeInDuration > 0,
        fadeOut: trimPoints.fadeOutDuration > 0
      }
    }))
    setSampleAudioFile(null)
  }

  // Update trim points in real-time during editing
  const handleTrimPointsChange = useCallback((trimPoints: TrimPoints) => {
    setFormData(prev => ({
      ...prev,
      trimSettings: {
        startSeconds: Math.round(trimPoints.startTime * 10) / 10, // Round to 1 decimal
        endSeconds: Math.round(trimPoints.endTime * 10) / 10,
        fadeIn: trimPoints.fadeInDuration > 0,
        fadeOut: trimPoints.fadeOutDuration > 0
      }
    }))
  }, [])

  // Handle directory selection
  const handleSelectDirectory = async () => {
    try {
      // Check if the File System Access API is supported (Chrome, Edge, Opera)
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker()
        
        // Try to get a more complete path, but File System Access API
        // doesn't provide full absolute paths for security reasons
        let selectedPath = dirHandle.name
        
        // For better UX, show the directory name but inform user they can edit
        setFormData({ ...formData, outputDirectory: selectedPath })
        
        // Show a helpful alert with instructions
        alert(`📁 Directory selected: "${selectedPath}"\n\n⚠️ Browser Security Limitation:\nOnly the folder name was captured due to browser security restrictions.\n\n💡 For full path functionality:\n1. Copy the full path from File Explorer address bar\n2. Paste it into the input field\n3. Example: C:\\Users\\YourName\\OneDrive\\Archive\\MyFolder`)
      } else {
        // Fallback: Create a hidden file input for directory selection
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.style.display = 'none'
        
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files
          if (files && files.length > 0) {
            // Extract the directory path from the first file
            const firstFile = files[0]
            const pathParts = firstFile.webkitRelativePath.split('/')
            if (pathParts.length > 1) {
              // Use the parent directory name or full path
              const directoryPath = pathParts.slice(0, -1).join('\\')
              setFormData({ ...formData, outputDirectory: directoryPath })
              
              // Show helpful message
              alert(`📁 Directory selected: "${directoryPath}"\n\n⚠️ This is a relative path within the selected folder.\n\n💡 For absolute paths:\nCopy the full path from File Explorer and paste it here.\nExample: C:\\Users\\YourName\\Documents\\Radio`)
            } else {
              // Use just the directory name if no subdirectory
              setFormData({ ...formData, outputDirectory: pathParts[0] })
              alert(`📁 Directory selected: "${pathParts[0]}"\n\n💡 Tip: For full path functionality, copy the complete path from File Explorer.`)
            }
          }
          document.body.removeChild(input)
        }
        
        document.body.appendChild(input)
        input.click()
      }
    } catch (error) {
      console.log('Directory selection was cancelled or failed:', error)
    }
  }

  // Validate and provide feedback for output paths
  const validateOutputPath = (outputPath: string): { isValid: boolean; message: string; type: 'success' | 'warning' | 'error' } => {
    if (!outputPath.trim()) {
      return { isValid: true, message: 'Will use global output directory setting', type: 'success' }
    }
    
    // Clean the path by removing surrounding quotes if present
    const cleanPath = outputPath.trim().replace(/^["']|["']$/g, '')
    
    // Check if it looks like an absolute Windows path
    if (/^[A-Za-z]:\\/.test(cleanPath)) {
      return { isValid: true, message: 'Absolute Windows path - will be used exactly as specified', type: 'success' }
    }
    
    // Check if it looks like just a folder name (from browse button)
    if (!cleanPath.includes('\\') && !cleanPath.includes('/')) {
      return { 
        isValid: false, 
        message: '⚠️ This looks like just a folder name. Please enter the full path (e.g., C:\\Users\\YourName\\...)', 
        type: 'warning' 
      }
    }
    
    // Relative path
    return { isValid: true, message: 'Relative path - will be resolved within workspace', type: 'success' }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'patterns', label: 'Input & Output', icon: Folder },
    { id: 'metadata', label: 'Metadata', icon: Tags },
    { id: 'audio', label: 'Audio Processing', icon: Music },
    { id: 'promo', label: 'Promo Settings', icon: Speaker }
  ] as const

  const audioSubTabs = [
    { id: 'general', label: 'General Audio', icon: Volume2 },
    { id: 'quality', label: 'Audio Quality', icon: Waves },
    { id: 'effects', label: 'Effects', icon: Sliders },
    { id: 'advanced', label: 'Advanced', icon: Zap },
    { id: 'trim', label: 'Trim Points', icon: Scissors },
    { id: 'processing', label: 'Processing Chain', icon: Music }
  ] as const

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {editingShow ? 'Edit Show Profile' : 'Add New Show Profile'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Show Name */}
                <div>
                  <label htmlFor="show-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Show Name *
                  </label>
                  <input
                    type="text"
                    id="show-name"
                    name="showName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Morning Show"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="show-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="show-description"
                    name="showDescription"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the show"
                  />
                </div>

                {/* Basic Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Show Settings
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Show</span>
                      </label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute right-0 bottom-6 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          When enabled, this show profile will be active and will process matching files. Disable to temporarily stop processing for this show.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.autoProcessing}
                          onChange={(e) => setFormData({ ...formData, autoProcessing: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Auto Process Files</span>
                      </label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute right-0 bottom-6 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          When enabled, files matching this show's patterns will be automatically processed as soon as they're detected. Disable for manual processing only.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.processExistingFiles}
                          onChange={(e) => setFormData({ ...formData, processExistingFiles: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Process Existing Files</span>
                      </label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute right-0 bottom-6 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          When enabled, existing files in watch folders will be processed when the show starts. When disabled, only new files added after the show starts will be processed.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.alertOnErrors}
                          onChange={(e) => setFormData({ ...formData, alertOnErrors: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Alert on Processing Errors</span>
                      </label>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute right-0 bottom-6 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          When enabled, you'll receive notifications if any files fail to process for this show. Recommended to keep enabled to catch issues quickly.
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Configure audio processing settings in the <strong>Audio Processing</strong> tab.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'patterns' && (
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Input & Output Configuration
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configure where files come from and where processed files go
                  </p>
                </div>

                {/* Input Section */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-500 p-2 rounded-full mr-3">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Input Files</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Define patterns to identify which files to process
                      </p>
                    </div>
                  </div>
                  <FilePatternInput
                    patterns={formData.filePatterns}
                    onChange={(patterns) => setFormData({ ...formData, filePatterns: patterns })}
                    fileNamingRules={formData.fileNamingRules}
                  />
                  {errors.filePatterns && <p className="text-red-500 text-sm mt-3">{errors.filePatterns}</p>}
                </div>

                {/* Output Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-500 p-2 rounded-full mr-3">
                      <Folder className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Output Directory</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Where processed files will be saved
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="output-directory"
                      name="outputDirectory"
                      value={formData.outputDirectory}
                      onChange={(e) => {
                        // Automatically strip surrounding quotes from pasted paths
                        const cleanedPath = e.target.value.trim().replace(/^["']|["']$/g, '')
                        setFormData({ ...formData, outputDirectory: cleanedPath })
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Full path: C:\Users\YourName\Documents\Radio\Output (or leave blank)"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectDirectory}
                      className="px-3 py-2 h-10"
                      title="Browse (folder name only - edit to add full path)"
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Simple validation feedback */}
                  {formData.outputDirectory && (
                    <div className={`text-xs mt-1 ${
                      validateOutputPath(formData.outputDirectory).type === 'success' ? 'text-green-600 dark:text-green-400' :
                      validateOutputPath(formData.outputDirectory).type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {validateOutputPath(formData.outputDirectory).message}
                    </div>
                  )}
                  {errors.outputDirectory && <p className="text-red-500 text-sm mt-2">{errors.outputDirectory}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 Copy the full path from File Explorer's address bar for best results
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div>
                <ErrorBoundary>
                  <MetadataConfig
                    metadataMapping={formData.metadataMapping}
                    fileNamingRules={formData.fileNamingRules}
                    onUpdateMapping={(metadataMapping: MetadataMapping) => setFormData({ ...formData, metadataMapping })}
                    onUpdateNamingRules={(fileNamingRules: FileNamingRules) => setFormData({ ...formData, fileNamingRules })}
                  />
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-6">
                {/* Audio Sub-Tab Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-6">
                    {audioSubTabs.map((subTab) => {
                      const Icon = subTab.icon
                      return (
                        <button
                          key={subTab.id}
                          type="button"
                          onClick={() => setActiveAudioSubTab(subTab.id as AudioSubTab)}
                          className={`
                            flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeAudioSubTab === subTab.id
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                          `}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{subTab.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Audio Sub-Tab Content */}
                <div className="space-y-4">
                  <ErrorBoundary>
                    {activeAudioSubTab === 'general' && (
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                        activeSection="general"
                      />
                    )}

                    {activeAudioSubTab === 'quality' && (
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                        activeSection="quality"
                      />
                    )}

                    {activeAudioSubTab === 'effects' && (
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                        activeSection="effects"
                      />
                    )}

                    {activeAudioSubTab === 'advanced' && (
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                        activeSection="advanced"
                      />
                    )}

                    {activeAudioSubTab === 'trim' && (
                      <div className="space-y-6">
                        {/* Trim Enable/Disable Toggle */}
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900/50 dark:to-blue-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={trimEnabled}
                                  onChange={(e) => {
                                    setTrimEnabled(e.target.checked)
                                    if (!e.target.checked) {
                                      // Reset trim settings when disabled
                                      setFormData({
                                        ...formData,
                                        trimSettings: {
                                          startSeconds: 0,
                                          endSeconds: 0,
                                          fadeIn: false,
                                          fadeOut: false
                                        }
                                      })
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                                  Enable Audio Trimming
                                </span>
                              </label>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              trimEnabled 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {trimEnabled ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {trimEnabled 
                              ? 'Audio files will be trimmed according to the settings below.' 
                              : 'No trimming will be applied. Audio files will be processed at full length.'
                            }
                          </p>
                        </div>

                        {trimEnabled && (
                          <>
                            {/* Current trim settings display */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                                  <Music className="h-5 w-5 mr-2 text-blue-600" />
                                  Current Trim Settings
                                </h4>
                                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                  <div className={`h-2 w-2 rounded-full mr-2 ${
                                    formData.trimSettings.startSeconds > 0 || formData.trimSettings.endSeconds > 0 
                                      ? 'bg-green-500' 
                                      : 'bg-gray-400'
                                  }`}></div>
                                  {formData.trimSettings.startSeconds > 0 || formData.trimSettings.endSeconds > 0 
                                    ? 'Trim configured' 
                                    : 'No trim points set'
                                  }
                                </div>
                              </div>
                              
                              {/* Manual trim controls */}
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Start Trim (seconds)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={formData.trimSettings.startSeconds}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0
                                      const roundedValue = Math.round(value * 10) / 10
                                      setFormData({
                                        ...formData,
                                        trimSettings: { ...formData.trimSettings, startSeconds: roundedValue }
                                      })
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    End Trim (seconds)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={formData.trimSettings.endSeconds}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0
                                      const roundedValue = Math.round(value * 10) / 10
                                      setFormData({
                                        ...formData,
                                        trimSettings: { ...formData.trimSettings, endSeconds: roundedValue }
                                      })
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.0"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-4">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.trimSettings.fadeIn}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      trimSettings: { ...formData.trimSettings, fadeIn: e.target.checked }
                                    })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Fade In</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.trimSettings.fadeOut}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      trimSettings: { ...formData.trimSettings, fadeOut: e.target.checked }
                                    })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Fade Out</span>
                                </label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Reset to reasonable defaults
                                    setFormData({
                                      ...formData,
                                      trimSettings: {
                                        startSeconds: 0,
                                        endSeconds: 30,
                                        fadeIn: false,
                                        fadeOut: false
                                      }
                                    })
                                  }}
                                  className="ml-4"
                                >
                                  Reset to 0-30s
                                </Button>
                              </div>
                            </div>

                            {/* Visual Trim Editor Section */}
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                  Visual Trim Editor
                                </h3>
                                {!sampleAudioFile && (
                                  <Button
                                    type="button"
                                    onClick={handleLoadSampleFile}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    size="sm"
                                  >
                                    <Music className="h-4 w-4 mr-2" />
                                    Browse Files
                                  </Button>
                                )}
                              </div>

                              {sampleAudioFile ? (
                                <ErrorBoundary>
                                  <EnhancedTrimEditor
                                    audioFile={sampleAudioFile}
                                    onSave={handleSaveTrimPoints}
                                    onCancel={() => setSampleAudioFile(null)}
                                    onRealTimeUpdate={handleTrimPointsChange}
                                    initialTrimPoints={{
                                      startTime: formData.trimSettings.startSeconds,
                                      endTime: formData.trimSettings.endSeconds || sampleAudioFile.duration,
                                      fadeInDuration: formData.trimSettings.fadeIn ? 0.5 : 0,
                                      fadeOutDuration: formData.trimSettings.fadeOut ? 1.0 : 0
                                    }}
                                  />
                                </ErrorBoundary>
                              ) : (
                                <div 
                                  className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-8 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                                  onDrop={async (e) => {
                                    e.preventDefault()
                                    const files = Array.from(e.dataTransfer.files)
                                    const droppedFile = files.find(f => f.type.startsWith('audio/'))
                                    if (droppedFile) {
                                      try {
                                        console.log('Uploading dropped audio file:', droppedFile.name, droppedFile.size)
                                        
                                        // Upload the file to the backend for temporary preview
                                        const uploadFormData = new FormData()
                                        uploadFormData.append('audio', droppedFile)
                                        
                                        const uploadResponse = await fetch('http://localhost:3001/api/audio/upload-sample', {
                                          method: 'POST',
                                          body: uploadFormData
                                        })
                                        
                                        if (!uploadResponse.ok) {
                                          throw new Error('Upload failed')
                                        }
                                        
                                        const uploadResult = await uploadResponse.json()
                                        console.log('File uploaded successfully:', uploadResult)
                                        
                                        // Now get proper audio metadata using the uploaded filename
                                        const audioFileObj = await audioService.analyzeAudioFile(uploadResult.filename, uploadResult.size)
                                        
                                        console.log('Created audio file object:', audioFileObj)
                                        setSampleAudioFile(audioFileObj)
                                        
                                        // Set default trim points to full duration if none exist
                                        if (formData.trimSettings.startSeconds === 0 && formData.trimSettings.endSeconds === 0) {
                                          setFormData({
                                            ...formData,
                                            trimSettings: {
                                              ...formData.trimSettings,
                                              endSeconds: audioFileObj.duration
                                            }
                                          })
                                        }
                                      } catch (error) {
                                        console.error('Failed to upload and analyze audio file:', error)
                                        alert('Failed to upload audio file. Please try again.')
                                      }
                                    }
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onClick={handleLoadSampleFile}
                                >
                                  <div className="text-center text-blue-600 dark:text-blue-400">
                                    <Music className="h-16 w-16 mx-auto mb-4" />
                                    <h4 className="text-lg font-medium mb-2">Drop Audio File or Click to Browse</h4>
                                    <p className="mb-4">Load a sample audio file to visually set trim points with waveform display</p>
                                    <div className="bg-white dark:bg-blue-900/30 p-4 rounded-lg mb-4 border border-blue-200 dark:border-blue-700">
                                      <p className="text-sm text-blue-800 dark:text-blue-200">
                                        <strong>📍 How it works:</strong> Drag and drop an audio file here to see its waveform. 
                                        You can then drag the handles on the waveform to set trim points visually.
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-center space-x-2 text-sm">
                                      <span>Supported formats:</span>
                                      <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">WAV</span>
                                      <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">MP3</span>
                                      <span className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">FLAC</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {activeAudioSubTab === 'processing' && (
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                        activeSection="processing"
                      />
                    )}
                  </ErrorBoundary>
                </div>
              </div>
            )}

            {activeTab === 'promo' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Promo Settings
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.processingOptions.addPromoTag}
                        onChange={(e) => setFormData({
                          ...formData,
                          processingOptions: { ...formData.processingOptions, addPromoTag: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Add Promo Tag</span>
                    </label>
                    
                    {formData.processingOptions.addPromoTag && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Promo Tag ID
                        </label>
                        <input
                          type="text"
                          value={formData.processingOptions.promoTagId || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            processingOptions: { ...formData.processingOptions, promoTagId: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., PROMO001"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Identifier for the promo tag to be added to processed files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {editingShow ? 'Update Show' : 'Create Show'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 