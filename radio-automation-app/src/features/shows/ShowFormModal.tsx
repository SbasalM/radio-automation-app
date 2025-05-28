import { useState, useEffect, useCallback } from 'react'
import { X, Settings, FileText, Music, Tags, Speaker, Folder, Info } from 'lucide-react'
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
type AudioSubSection = 'general' | 'quality' | 'effects' | 'advanced' | 'trim' | 'processing'


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
  const [audioSubSection, setAudioSubSection] = useState<AudioSubSection>('general')

  const [sampleAudioFile, setSampleAudioFile] = useState<AudioFile | null>(null)
  const [trimEnabled, setTrimEnabled] = useState(false)
  
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
        enableNotifications: formData.enableNotifications,
        notificationEmails: formData.notificationEmails,
        alertOnErrors: formData.alertOnErrors,
        alertOnMissingFiles: formData.alertOnMissingFiles
      }

      console.log('Saving show with trim settings:', formData.trimSettings)
      console.log('Full show data:', showData)

      if (editingShow) {
        await updateShow(editingShow.id, showData)
      } else {
        await addShow(showData)
      }

      onClose()
    } catch (error) {
      console.error('Failed to save show:', error)
      alert('Failed to save show. Please try again.')
    }
  }

  // Load sample file for trim editor
  const handleLoadSampleFile = async () => {
    try {
      // Try to use the actual audio file if available
      const actualFileName = 'AnswersInGenesis_100424.wav' // The actual file we know exists
      
      // Create audio file object for the real file
      const realAudioFile: AudioFile = {
        id: 'real-' + Date.now(),
        filename: actualFileName,
        duration: 541, // 9:01 in seconds - we'll get this from the backend later
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        fileSize: 10585084, // Actual file size from ls command
        filePath: `http://localhost:3001/api/audio/${actualFileName}`, // Serve via backend
        createdAt: new Date(),
        lastModified: new Date()
      }
      
      setSampleAudioFile(realAudioFile)
      
      // Set default trim points to full duration if none exist
      if (formData.trimSettings.startSeconds === 0 && formData.trimSettings.endSeconds === 0) {
        setFormData({
          ...formData,
          trimSettings: {
            ...formData.trimSettings,
            endSeconds: realAudioFile.duration // Set end to full duration
          }
        })
      }
    } catch (error) {
      console.error('Failed to load sample file:', error)
      
      // Fallback to mock file
      const mockAudioFile: AudioFile = {
        id: 'sample-' + Date.now(),
        filename: 'sample-audio.wav',
        duration: 541,
        sampleRate: 44100,
        channels: 2,
        format: 'wav',
        fileSize: 10 * 1024 * 1024,
        filePath: '/sample/sample-audio.wav',
        createdAt: new Date(),
        lastModified: new Date()
      }
      setSampleAudioFile(mockAudioFile)
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
        
        // Show a helpful message
        console.log('Selected directory:', dirHandle.name, '- You can edit this to specify the full path')
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
              const directoryPath = pathParts.slice(0, -1).join('/')
              setFormData({ ...formData, outputDirectory: directoryPath })
            } else {
              // Use just the directory name if no subdirectory
              setFormData({ ...formData, outputDirectory: pathParts[0] })
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

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'patterns', label: 'Input & Output', icon: Folder },
    { id: 'metadata', label: 'Metadata', icon: Tags },
    { id: 'audio', label: 'Audio Processing', icon: Music },
    { id: 'promo', label: 'Promo Settings', icon: Speaker }
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
                  onClick={() => setActiveTab(tab.id)}
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
                      onChange={(e) => setFormData({ ...formData, outputDirectory: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., C:\Radio\Processed\MyShow or leave blank for global setting"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectDirectory}
                      className="px-3 py-2 h-10 flex items-center space-x-2 border-green-300 hover:bg-green-50 dark:border-green-700 dark:hover:bg-green-900/20"
                      title="Browse for directory"
                    >
                      <Folder className="h-4 w-4" />
                      <span className="hidden sm:inline">Browse</span>
                    </Button>
                  </div>
                  {errors.outputDirectory && <p className="text-red-500 text-sm mt-2">{errors.outputDirectory}</p>}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <strong>Optional:</strong> If not specified, the global output directory setting will be used. <br />
                    <strong>Note:</strong> The Browse button may only show the folder name for security reasons. You can manually enter the full path.
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
              <div className="space-y-4">
                {/* Sub-navigation for Audio Processing */}
                <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {[
                    { id: 'general', label: 'General' },
                    { id: 'quality', label: 'Audio Quality' },
                    { id: 'effects', label: 'Effects' },
                    { id: 'advanced', label: 'Advanced' },
                    { id: 'trim', label: 'Trim Points' },
                    { id: 'processing', label: 'Processing Chain' }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAudioSubSection(id as AudioSubSection)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        audioSubSection === id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Audio Section Content */}
                <div>
                  {audioSubSection === 'trim' ? (
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
                                  value={formData.trimSettings.startSeconds}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    trimSettings: { ...formData.trimSettings, startSeconds: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  End Trim (seconds)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formData.trimSettings.endSeconds}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    trimSettings: { ...formData.trimSettings, endSeconds: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                      // Use audio service to analyze the dropped file
                                      const audioFileObj = await audioService.analyzeAudioFile(droppedFile.name, droppedFile.size)
                                      audioFileObj.filePath = URL.createObjectURL(droppedFile)
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
                                      console.error('Failed to analyze dropped audio file:', error)
                                      alert('Failed to analyze audio file. Please try again.')
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
                  ) : (
                    <ErrorBoundary>
                      <AudioProcessingConfig
                        processingOptions={formData.processingOptions}
                        onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                      />
                    </ErrorBoundary>
                  )}
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
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingShow ? 'Update Show' : 'Create Show'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 