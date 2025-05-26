import { useState, useEffect } from 'react'
import { X, Save, RotateCcw, FileText, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { QueuedFile } from '@/types/file'
import type { MetadataMapping } from '@/types/show'

interface MetadataOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  file: QueuedFile | null
  originalMetadata: Record<string, any>
  extractedData: Record<string, any>
  onSave: (metadata: Record<string, any>, filename?: string) => void
}

export function MetadataOverrideModal({
  isOpen,
  onClose,
  file,
  originalMetadata,
  extractedData,
  onSave
}: MetadataOverrideModalProps) {
  const [metadata, setMetadata] = useState<Record<string, any>>({})
  const [newFilename, setNewFilename] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')

  // Standard metadata fields
  const standardFields = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'artist', label: 'Artist', type: 'text' },
    { key: 'album', label: 'Album', type: 'text' },
    { key: 'year', label: 'Year', type: 'number' },
    { key: 'genre', label: 'Genre', type: 'text' },
    { key: 'comment', label: 'Comment', type: 'text' },
    { key: 'track', label: 'Track Number', type: 'number' }
  ]

  useEffect(() => {
    if (isOpen && file) {
      setMetadata({ ...originalMetadata })
      setNewFilename('')
      setPreviewFilename(file.filename)
    }
  }, [isOpen, file, originalMetadata])

  // Generate filename preview
  useEffect(() => {
    if (newFilename.trim()) {
      const extension = file?.filename.split('.').pop() || 'mp3'
      setPreviewFilename(`${newFilename.trim()}.${extension}`)
    } else if (file) {
      setPreviewFilename(file.filename)
    }
  }, [newFilename, file?.filename])

  const handleMetadataChange = (field: string, value: any) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleReset = () => {
    setMetadata({ ...originalMetadata })
    setNewFilename('')
  }

  const handleSave = () => {
    onSave(metadata, newFilename.trim() || undefined)
    onClose()
  }

  const addCustomField = () => {
    const fieldName = prompt('Enter custom field name:')
    if (fieldName && !metadata[fieldName]) {
      setMetadata(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }
  }

  const removeCustomField = (fieldName: string) => {
    const newMetadata = { ...metadata }
    delete newMetadata[fieldName]
    setMetadata(newMetadata)
  }

  if (!isOpen || !file) return null

  // Separate standard and custom fields
  const customFields = Object.keys(metadata).filter(
    key => !standardFields.some(field => field.key === key)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Override Metadata
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {file.filename}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Extracted Data Preview */}
          {Object.keys(extractedData).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Extracted Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <div key={key} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {key}:
                      </span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filename Override */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <Tag className="h-4 w-4" />
                <span>Output Filename</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Filename (optional)
                </label>
                <input
                  type="text"
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new filename without extension"
                />
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded border">
                <span className="text-sm text-gray-600 dark:text-gray-400">Preview: </span>
                <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {previewFilename}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Standard Metadata Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Standard Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {standardFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={metadata[field.key] || ''}
                      onChange={(e) => handleMetadataChange(
                        field.key, 
                        field.type === 'number' ? Number(e.target.value) || '' : e.target.value
                      )}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Custom Fields</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCustomField}
                  className="h-8"
                >
                  Add Field
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No custom fields. Click "Add Field" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {customFields.map(fieldName => (
                    <div key={fieldName} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {fieldName}
                        </label>
                        <input
                          type="text"
                          value={metadata[fieldName] || ''}
                          onChange={(e) => handleMetadataChange(fieldName, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter ${fieldName}`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(fieldName)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 