import { useState, useCallback } from 'react'
import { Upload, X, Check, AlertCircle, File, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePromoStore } from '@/store/promo-store'
import { useShowStore } from '@/store/show-store'
import { audioService } from '@/services/audio-service'
import type { PromoFile, AudioFile } from '@/types/audio'

interface PromoUploadFormProps {
  onClose: () => void
  onSuccess?: (promo: PromoFile) => void
}

export function PromoUploadForm({ onClose, onSuccess }: PromoUploadFormProps) {
  const { addPromo, categories } = usePromoStore()
  const { getAllShows } = useShowStore()
  
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedCategories: [] as string[],
    selectedShows: [] as string[],
    timeSlots: [] as string[],
    priority: 'medium' as 'high' | 'medium' | 'low'
  })

  const shows = getAllShows()
  const timeSlotOptions = [
    { value: 'morning', label: 'Morning (6-10 AM)' },
    { value: 'afternoon', label: 'Afternoon (12-6 PM)' },
    { value: 'evening', label: 'Evening (6-11 PM)' },
    { value: 'late-night', label: 'Late Night (11-6 AM)' },
    { value: 'weekend', label: 'Weekend' }
  ]

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/flac', 'audio/x-flac']
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|flac)$/i)) {
      return 'Only MP3, WAV, and FLAC files are supported'
    }

    if (file.size > maxSize) {
      return 'File size must be less than 50MB'
    }

    return null
  }

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      const validationError = validateFile(file)
      
      if (validationError) {
        setError(validationError)
        return
      }

      setSelectedFile(file)
      
      // Auto-populate name from filename
      if (!formData.name) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "")
        setFormData(prev => ({ ...prev, name: nameWithoutExtension }))
      }
    }
  }, [formData.name])

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validationError = validateFile(file)
      
      if (validationError) {
        setError(validationError)
        return
      }

      setSelectedFile(file)
      
      // Auto-populate name from filename
      if (!formData.name) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "")
        setFormData(prev => ({ ...prev, name: nameWithoutExtension }))
      }
    }
  }

  // Handle form field changes
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle checkbox group changes
  const handleCheckboxChange = (field: 'selectedCategories' | 'selectedShows' | 'timeSlots', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  // Validate form
  const validateForm = (): string | null => {
    if (!selectedFile) return 'Please select an audio file'
    if (!formData.name.trim()) return 'Please enter a promo name'
    if (formData.selectedCategories.length === 0) return 'Please select at least one category'
    if (formData.timeSlots.length === 0) return 'Please select at least one time slot'
    return null
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate file upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Analyze audio file
      const audioFile: AudioFile = await audioService.analyzeAudioFile(selectedFile.name, selectedFile.size)
      
      setUploadProgress(100)
      clearInterval(uploadInterval)

      // Create promo file object
      const newPromo = addPromo({
        name: formData.name.trim(),
        filename: selectedFile.name,
        duration: audioFile.duration,
        categories: formData.selectedCategories,
        shows: formData.selectedShows,
        timeSlots: formData.timeSlots as any,
        playCount: 0,
        filePath: `/promos/${selectedFile.name}`,
        audioFile
      })

      console.log('✅ Promo uploaded successfully:', newPromo.name)
      
      // Call success callback
      onSuccess?.(newPromo)
      
      // Reset form
      setSelectedFile(null)
      setFormData({
        name: '',
        description: '',
        selectedCategories: [],
        selectedShows: [],
        timeSlots: [],
        priority: 'medium'
      })
      setUploadProgress(0)
      
      // Close form after brief delay
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to upload promo. Please try again.')
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${Math.round(mb * 1024)}KB` : `${mb.toFixed(1)}MB`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upload New Promo</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit}>
            {/* File Upload Area */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Audio File
              </label>
              
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Drop audio file here or browse
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Supports MP3, WAV, and FLAC files up to 50MB
                  </div>
                  <input
                    type="file"
                    accept="audio/*,.mp3,.wav,.flac"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button type="button" variant="outline">
                      Browse Files
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Music className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedFile.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Promo Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Promo Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter promo name"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => updateFormData('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isUploading}
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description..."
                disabled={isUploading}
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categories *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedCategories.includes(category.id)}
                      onChange={() => handleCheckboxChange('selectedCategories', category.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isUploading}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {category.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Slots *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {timeSlotOptions.map(slot => (
                  <label key={slot.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.timeSlots.includes(slot.value)}
                      onChange={() => handleCheckboxChange('timeSlots', slot.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isUploading}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {slot.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Show Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign to Shows
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shows.map((show: any) => (
                  <label key={show.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedShows.includes(show.id)}
                      onChange={() => handleCheckboxChange('selectedShows', show.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isUploading}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {show.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : uploadProgress === 100 ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Upload Complete
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Promo
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 