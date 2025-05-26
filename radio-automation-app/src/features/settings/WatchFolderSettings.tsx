import { useState } from 'react'
import { Folder, FolderOpen, Plus, Trash2, Clock, File, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSettingsStore } from '@/store/settings-store'

export function WatchFolderSettings() {
  const { settings, updateWatchFolderSettings } = useSettingsStore()
  const { watchFolders } = settings
  
  const [newPattern, setNewPattern] = useState('')

  const handleAddPattern = () => {
    if (newPattern.trim() && !watchFolders.filePatterns.includes(newPattern.trim())) {
      updateWatchFolderSettings({
        filePatterns: [...watchFolders.filePatterns, newPattern.trim()]
      })
      setNewPattern('')
    }
  }

  const handleRemovePattern = (index: number) => {
    updateWatchFolderSettings({
      filePatterns: watchFolders.filePatterns.filter((_, i) => i !== index)
    })
  }

  const formatFileSize = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb} MB`
  }

  return (
    <div className="space-y-6">
      {/* Watch Folder Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="h-5 w-5" />
              <span>Watch Folder Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="watch-enabled"
                checked={watchFolders.enabled}
                onChange={(e) => updateWatchFolderSettings({ enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="watch-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable monitoring
              </label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border-2 ${
            watchFolders.enabled 
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                watchFolders.enabled ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {watchFolders.enabled ? 'Monitoring Active' : 'Monitoring Disabled'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {watchFolders.enabled 
                ? `Scanning every ${watchFolders.scanIntervalSeconds} seconds for ${watchFolders.filePatterns.length} file types`
                : 'File monitoring is currently disabled. Enable to automatically detect new audio files.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scan Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Scan Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scan Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={watchFolders.scanIntervalSeconds}
                onChange={(e) => updateWatchFolderSettings({ scanIntervalSeconds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How often to check for new files (5-300 seconds)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duplicate File Handling
              </label>
              <select
                value={watchFolders.duplicateHandling}
                onChange={(e) => updateWatchFolderSettings({ duplicateHandling: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="skip">Skip duplicate files</option>
                <option value="overwrite">Overwrite existing files</option>
                <option value="rename">Rename new files</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                What to do when a file with the same name exists
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="monitor-subfolders"
                checked={watchFolders.monitorSubfolders}
                onChange={(e) => updateWatchFolderSettings({ monitorSubfolders: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="monitor-subfolders" className="text-sm text-gray-700 dark:text-gray-300">
                Monitor subfolders
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-create-subfolders"
                checked={watchFolders.autoCreateSubfolders}
                onChange={(e) => updateWatchFolderSettings({ autoCreateSubfolders: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto-create-subfolders" className="text-sm text-gray-700 dark:text-gray-300">
                Auto-create subfolders by show
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <File className="h-5 w-5" />
            <span>File Patterns</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPattern()}
              placeholder="*.mp3, *.wav, *.flac"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleAddPattern} disabled={!newPattern.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {watchFolders.filePatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="h-4 w-4 text-gray-500" />
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">{pattern}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePattern(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {watchFolders.filePatterns.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No file patterns configured. Add patterns to monitor specific file types.
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <strong>Examples:</strong> *.mp3 (MP3 files), *.wav (WAV files), show_*.* (files starting with "show_"), 
            *morning* (files containing "morning")
          </div>
        </CardContent>
      </Card>

      {/* File Size Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>File Size Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum File Size (MB)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={watchFolders.minFileSize}
                onChange={(e) => updateWatchFolderSettings({ minFileSize: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ignore files smaller than this size
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum File Size (MB)
              </label>
              <input
                type="number"
                min="1"
                max="2000"
                value={watchFolders.maxFileSize}
                onChange={(e) => updateWatchFolderSettings({ maxFileSize: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Reject files larger than this size
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maximum File Age (hours)
            </label>
            <input
              type="number"
              min="1"
              max="720"
              value={watchFolders.maxFileAge}
              onChange={(e) => updateWatchFolderSettings({ maxFileAge: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ignore files older than this (1-720 hours)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Processed Files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Processed Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="move-processed"
              checked={watchFolders.moveProcessedFiles}
              onChange={(e) => updateWatchFolderSettings({ moveProcessedFiles: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="move-processed" className="text-sm text-gray-700 dark:text-gray-300">
              Move processed files to separate folder
            </label>
          </div>

          {watchFolders.moveProcessedFiles && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Processed Files Path
              </label>
              <input
                type="text"
                value={watchFolders.processedFilesPath}
                onChange={(e) => updateWatchFolderSettings({ processedFilesPath: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="./processed"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Folder where processed files will be moved
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {watchFolders.enabled ? 'Monitoring Active' : 'Disabled'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Scan Interval:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {watchFolders.scanIntervalSeconds}s
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">File Patterns:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {watchFolders.filePatterns.length} configured
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Size Range:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {formatFileSize(watchFolders.minFileSize)} - {formatFileSize(watchFolders.maxFileSize)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Duplicates:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {watchFolders.duplicateHandling}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Max Age:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {watchFolders.maxFileAge}h
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 