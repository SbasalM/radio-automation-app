import { useState, useEffect } from 'react'
import { X, Settings, FileText, Music, Tags, Speaker } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilePatternInput } from './FilePatternInput'
import { MetadataConfig } from './MetadataConfig'
import { AudioProcessingConfig } from './AudioProcessingConfig'
import { useShowStore } from '@/store/show-store'
import type { ShowProfile, FilePattern, MetadataMapping, AdvancedAudioSettings, FileNamingRules, ProcessingOptions } from '@/types/show'

interface ShowFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingShow?: ShowProfile | null
}

type TabType = 'general' | 'patterns' | 'metadata' | 'audio' | 'promo'

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
  outputPattern: '{showName}_{YYYY}-{MM}-{DD}',
  dateFormat: 'YYYY-MM-DD',
  caseConversion: 'none',
  invalidCharacterHandling: 'underscore'
}

export function ShowFormModal({ isOpen, onClose, editingShow }: ShowFormModalProps) {
  const { addShow, updateShow } = useShowStore()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  
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
      setFormData({
        name: editingShow.name,
        description: editingShow.description || '',
        enabled: editingShow.enabled,
        filePatterns: editingShow.filePatterns,
        outputDirectory: editingShow.outputDirectory,
        metadataMapping: editingShow.metadataMapping || DEFAULT_METADATA_MAPPING,
        fileNamingRules: editingShow.fileNamingRules || DEFAULT_FILE_NAMING_RULES,
        trimSettings: editingShow.trimSettings,
        processingOptions: editingShow.processingOptions,
        autoProcessing: editingShow.autoProcessing,
        processOnSchedule: editingShow.processOnSchedule,
        schedulePattern: editingShow.schedulePattern,
        enableNotifications: editingShow.enableNotifications,
        notificationEmails: editingShow.notificationEmails,
        alertOnErrors: editingShow.alertOnErrors,
        alertOnMissingFiles: editingShow.alertOnMissingFiles,
        totalFilesProcessed: editingShow.totalFilesProcessed,
        lastProcessedAt: editingShow.lastProcessedAt,
        averageProcessingTime: editingShow.averageProcessingTime,
        errorCount: editingShow.errorCount
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

    if (!formData.outputDirectory.trim()) {
      newErrors.outputDirectory = 'Output directory is required'
    }

    const hasValidPattern = formData.filePatterns.some(p => p.pattern.trim())
    if (!hasValidPattern) {
      newErrors.filePatterns = 'At least one file pattern is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setActiveTab('general') // Switch to general tab if validation fails
      return
    }

    const showData = {
      ...formData,
      filePatterns: formData.filePatterns.filter(p => p.pattern.trim())
    }

    if (editingShow) {
      updateShow(editingShow.id, showData)
    } else {
      addShow(showData)
    }

    onClose()
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'patterns', label: 'File Patterns', icon: FileText },
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Show Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Morning Show"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the show"
                  />
                </div>

                {/* Output Directory */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Output Directory *
                  </label>
                  <input
                    type="text"
                    value={formData.outputDirectory}
                    onChange={(e) => setFormData({ ...formData, outputDirectory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., /processed/morning-show"
                  />
                  {errors.outputDirectory && <p className="text-red-500 text-sm mt-1">{errors.outputDirectory}</p>}
                </div>

                {/* Trim Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Trim Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
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
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
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
                  <div className="flex space-x-4 mt-3">
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

                {/* Basic Processing Options */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Basic Settings
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Processing</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.processingOptions.normalize}
                        onChange={(e) => setFormData({
                          ...formData,
                          processingOptions: { ...formData.processingOptions, normalize: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Normalize Audio</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.processingOptions.useGlobalSettings}
                        onChange={(e) => setFormData({
                          ...formData,
                          processingOptions: { ...formData.processingOptions, useGlobalSettings: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Global Audio Settings</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'patterns' && (
              <div>
                <FilePatternInput
                  patterns={formData.filePatterns}
                  onChange={(patterns) => setFormData({ ...formData, filePatterns: patterns })}
                />
                {errors.filePatterns && <p className="text-red-500 text-sm mt-1">{errors.filePatterns}</p>}
              </div>
            )}

            {activeTab === 'metadata' && (
              <div>
                <MetadataConfig
                  metadataMapping={formData.metadataMapping}
                  fileNamingRules={formData.fileNamingRules}
                  onUpdateMapping={(metadataMapping: MetadataMapping) => setFormData({ ...formData, metadataMapping })}
                  onUpdateNamingRules={(fileNamingRules: FileNamingRules) => setFormData({ ...formData, fileNamingRules })}
                />
              </div>
            )}

            {activeTab === 'audio' && (
              <div>
                <AudioProcessingConfig
                  processingOptions={formData.processingOptions}
                  onUpdateProcessingOptions={(processingOptions: ProcessingOptions) => setFormData({ ...formData, processingOptions })}
                />
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