import { useState, useEffect } from 'react'
import { X, Clock, Download, Calendar, FileText, History, Infinity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFTPStore } from '@/store/ftp-store'
import { useShowStore } from '@/store/show-store'
import { getNextRunTime, formatCronExpression } from '@/utils/cron-helper'
import type { FTPSchedule } from '@/types/ftp'

interface ScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  editingSchedule?: FTPSchedule | null
}

const cronPresets = [
  { id: 'daily-5am', name: 'Daily at 5:00 AM', expression: '0 5 * * *', description: 'Every day at 5:00 AM' },
  { id: 'daily-6pm', name: 'Daily at 6:00 PM', expression: '0 18 * * *', description: 'Every day at 6:00 PM' },
  { id: 'hourly', name: 'Every Hour', expression: '0 * * * *', description: 'Every hour on the hour' },
  { id: 'every-30min', name: 'Every 30 Minutes', expression: '*/30 * * * *', description: 'Every 30 minutes' },
  { id: 'weekly-mon', name: 'Weekly on Monday', expression: '0 6 * * 1', description: 'Every Monday at 6:00 AM' },
  { id: 'custom', name: 'Custom', expression: '', description: 'Define your own schedule' }
]

export function ScheduleForm({ isOpen, onClose, editingSchedule }: ScheduleFormProps) {
  const { addSchedule, updateSchedule, getAllProfiles } = useFTPStore()
  const { getAllShows } = useShowStore()
  
  const [formData, setFormData] = useState({
    name: '',
    ftpProfileId: '',
    showId: '',
    filePattern: '',
    cronExpression: '0 5 * * *',
    enabled: true,
    downloadMode: 'current-day' as 'current-day' | 'all-new' | 'pattern-match',
    maxFilesPerRun: 1,
    trackDownloadHistory: true
  })

  const [selectedPreset, setSelectedPreset] = useState('daily-5am')
  const [customCron, setCustomCron] = useState('')
  const [nextRun, setNextRun] = useState<Date | null>(null)

  const profiles = getAllProfiles()
  const shows = getAllShows()

  useEffect(() => {
    if (editingSchedule) {
      setFormData({
        name: editingSchedule.name,
        ftpProfileId: editingSchedule.ftpProfileId,
        showId: editingSchedule.showId,
        filePattern: editingSchedule.filePattern,
        cronExpression: editingSchedule.cronExpression,
        enabled: editingSchedule.enabled,
        downloadMode: editingSchedule.downloadMode || 'current-day',
        maxFilesPerRun: editingSchedule.maxFilesPerRun || 1,
        trackDownloadHistory: editingSchedule.trackDownloadHistory !== undefined ? editingSchedule.trackDownloadHistory : true
      })
      
      // Find matching preset
      const preset = cronPresets.find(p => p.expression === editingSchedule.cronExpression)
      if (preset) {
        setSelectedPreset(preset.id)
      } else {
        setSelectedPreset('custom')
        setCustomCron(editingSchedule.cronExpression)
      }
    } else {
      // Reset form for new schedule
      setFormData({
        name: '',
        ftpProfileId: profiles[0]?.id || '',
        showId: shows[0]?.id || '',
        filePattern: '',
        cronExpression: '0 5 * * *',
        enabled: true,
        downloadMode: 'current-day',
        maxFilesPerRun: 1,
        trackDownloadHistory: true
      })
      setSelectedPreset('daily-5am')
      setCustomCron('')
    }
  }, [editingSchedule, isOpen, profiles, shows])

  useEffect(() => {
    // Calculate next run time
    const cronExpr = selectedPreset === 'custom' ? customCron : formData.cronExpression
    if (cronExpr) {
      try {
        setNextRun(getNextRunTime(cronExpr))
      } catch {
        setNextRun(null)
      }
    }
  }, [formData.cronExpression, customCron, selectedPreset])

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value
    setSelectedPreset(presetId)
    const preset = cronPresets.find(p => p.id === presetId)
    if (preset && preset.expression) {
      setFormData(prev => ({ ...prev, cronExpression: preset.expression }))
    }
  }

  const handleCustomCronChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomCron(value)
    setFormData(prev => ({ ...prev, cronExpression: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const cronExpr = selectedPreset === 'custom' ? customCron : formData.cronExpression
    
    const scheduleData = {
      ...formData,
      cronExpression: cronExpr
    }

    if (editingSchedule) {
      updateSchedule(editingSchedule.id, scheduleData)
    } else {
      addSchedule(scheduleData)
    }

    onClose()
  }

  const downloadModeDescriptions = {
    'current-day': 'Download only files from the current date. Perfect for daily show updates that overwrite previous versions.',
    'all-new': 'Download all files that haven\'t been downloaded before. Uses intelligent duplicate detection to avoid re-downloading.',
    'pattern-match': 'Download all files matching the pattern, regardless of download history. Use with caution to avoid duplicates.'
  }

  const getFilePatternExample = () => {
    switch (formData.downloadMode) {
      case 'current-day':
        return 'Show_{YYYY-MM-DD}.mp3'
      case 'all-new':
        return 'Show_*.mp3 or Episode_*.wav'
      case 'pattern-match':
        return 'Show_Episode_{YYYY-MM-DD}.mp3'
      default:
        return 'Show_{YYYY-MM-DD}.mp3'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle>
            {editingSchedule ? 'Edit Download Schedule' : 'Add Download Schedule'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Schedule Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">Schedule Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Morning Show Daily Download"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="ftpProfile" className="block text-sm font-medium mb-2">FTP Profile *</label>
                    <select
                      id="ftpProfile"
                      value={formData.ftpProfileId}
                      onChange={(e) => setFormData(prev => ({ ...prev, ftpProfileId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select FTP profile</option>
                      {profiles.filter(p => p.enabled).map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} ({profile.host})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="show" className="block text-sm font-medium mb-2">Target Show *</label>
                    <select
                      id="show"
                      value={formData.showId}
                      onChange={(e) => setFormData(prev => ({ ...prev, showId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select show</option>
                      {shows.map((show) => (
                        <option key={show.id} value={show.id}>
                          {show.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    id="enabled"
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="enabled" className="text-sm font-medium">Enable this schedule</label>
                </div>
              </CardContent>
            </Card>

            {/* Download Mode Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Download Mode</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Download Strategy</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['current-day', 'all-new', 'pattern-match'] as const).map((mode) => (
                      <div
                        key={mode}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.downloadMode === mode
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, downloadMode: mode }))}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="downloadMode"
                            value={mode}
                            checked={formData.downloadMode === mode}
                            onChange={() => setFormData(prev => ({ ...prev, downloadMode: mode }))}
                            className="text-blue-600"
                          />
                          <div>
                            <div className="font-medium">
                              {mode === 'current-day' && (
                                <>
                                  <Calendar className="h-4 w-4 inline mr-1" />
                                  Current Day Only
                                </>
                              )}
                              {mode === 'all-new' && (
                                <>
                                  <History className="h-4 w-4 inline mr-1" />
                                  Smart Bulk Download
                                </>
                              )}
                              {mode === 'pattern-match' && (
                                <>
                                  <FileText className="h-4 w-4 inline mr-1" />
                                  Pattern Match All
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {downloadModeDescriptions[formData.downloadMode]}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="maxFiles" className="block text-sm font-medium mb-2">Max Files Per Run</label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="maxFiles"
                        type="number"
                        min="0"
                        value={formData.maxFilesPerRun}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxFilesPerRun: parseInt(e.target.value) || 0 }))}
                        placeholder="0 for unlimited"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      {formData.maxFilesPerRun === 0 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs flex items-center space-x-1">
                          <Infinity className="h-3 w-3" />
                          <span>Unlimited</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Set to 0 for unlimited downloads, or limit to prevent overwhelming the system
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="trackHistory"
                      type="checkbox"
                      checked={formData.trackDownloadHistory}
                      onChange={(e) => setFormData(prev => ({ ...prev, trackDownloadHistory: e.target.checked }))}
                      className="rounded"
                    />
                    <div>
                      <label htmlFor="trackHistory" className="text-sm font-medium">Track Download History</label>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Enable duplicate detection and download tracking
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Pattern */}
            <Card>
              <CardHeader>
                <CardTitle>File Pattern</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="filePattern" className="block text-sm font-medium mb-2">File Pattern *</label>
                  <input
                    id="filePattern"
                    type="text"
                    value={formData.filePattern}
                    onChange={(e) => setFormData(prev => ({ ...prev, filePattern: e.target.value }))}
                    placeholder={getFilePatternExample()}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    required
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Use patterns like <code>{getFilePatternExample()}</code>. 
                    Supports: <code>*</code> (any text), <code>{'{YYYY-MM-DD}'}</code> (current date), <code>{'{YYYY}'}</code> (year), etc.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Schedule</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="schedulePreset" className="block text-sm font-medium mb-2">Schedule Preset</label>
                  <select
                    id="schedulePreset"
                    value={selectedPreset}
                    onChange={handlePresetChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {cronPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPreset === 'custom' && (
                  <div>
                    <label htmlFor="customCron" className="block text-sm font-medium mb-2">Custom Cron Expression</label>
                    <input
                      id="customCron"
                      type="text"
                      value={customCron}
                      onChange={handleCustomCronChange}
                      placeholder="0 5 * * *"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      required
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}

                {nextRun && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm">
                      <strong>Next run:</strong> {nextRun.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatCronExpression(formData.cronExpression)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 