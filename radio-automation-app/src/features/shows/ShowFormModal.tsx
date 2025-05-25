import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilePatternInput } from './FilePatternInput'
import { useShowStore } from '@/store/show-store'
import type { ShowProfile, FilePattern } from '@/types/show'

interface ShowFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingShow?: ShowProfile | null
}

export function ShowFormModal({ isOpen, onClose, editingShow }: ShowFormModalProps) {
  const { addShow, updateShow } = useShowStore()
  
  const [formData, setFormData] = useState<{
    name: string
    enabled: boolean
    filePatterns: FilePattern[]
    outputDirectory: string
    trimSettings: {
      startSeconds: number
      endSeconds: number
      fadeIn: boolean
      fadeOut: boolean
    }
    processingOptions: {
      normalize: boolean
      addPromoTag: boolean
      promoTagId?: string
    }
  }>({
    name: '',
    enabled: true,
    filePatterns: [{ id: '1', pattern: '', type: 'watch' as const }] as FilePattern[],
    outputDirectory: '',
    trimSettings: {
      startSeconds: 0,
      endSeconds: 0,
      fadeIn: false,
      fadeOut: false
    },
    processingOptions: {
      normalize: true,
      addPromoTag: false,
      promoTagId: undefined
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingShow) {
      setFormData({
        name: editingShow.name,
        enabled: editingShow.enabled,
        filePatterns: editingShow.filePatterns,
        outputDirectory: editingShow.outputDirectory,
        trimSettings: editingShow.trimSettings,
        processingOptions: editingShow.processingOptions
      })
    } else {
      // Reset form for new show
      setFormData({
        name: '',
        enabled: true,
        filePatterns: [{ id: Date.now().toString(), pattern: '', type: 'watch' }],
        outputDirectory: '',
        trimSettings: {
          startSeconds: 0,
          endSeconds: 0,
          fadeIn: false,
          fadeOut: false
        },
        processingOptions: {
          normalize: true,
          addPromoTag: false,
          promoTagId: undefined
        }
      })
    }
    setErrors({})
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
    
    if (!validateForm()) return

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* File Patterns */}
          <div>
            <FilePatternInput
              patterns={formData.filePatterns}
              onChange={(patterns) => setFormData({ ...formData, filePatterns: patterns })}
            />
            {errors.filePatterns && <p className="text-red-500 text-sm mt-1">{errors.filePatterns}</p>}
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

          {/* Processing Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Processing Options
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
                  checked={formData.processingOptions.addPromoTag}
                  onChange={(e) => setFormData({
                    ...formData,
                    processingOptions: { ...formData.processingOptions, addPromoTag: e.target.checked }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Add Promo Tag</span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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