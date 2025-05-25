import { useState, useEffect } from 'react'
import { X, Clock, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useFTPStore } from '@/store/ftp-store'
import { useShowStore } from '@/store/show-store'
import { cronPresets, getNextRunTimes, isValidCronExpression } from '@/utils/cron-helper'
import type { FTPSchedule } from '@/types/ftp'

interface ScheduleFormProps {
  isOpen: boolean
  onClose: () => void
  editingSchedule?: FTPSchedule | null
}

export function ScheduleForm({ isOpen, onClose, editingSchedule }: ScheduleFormProps) {
  const { addSchedule, updateSchedule, getAllProfiles } = useFTPStore()
  const { getAllShows } = useShowStore()
  
  const [formData, setFormData] = useState({
    name: '',
    ftpProfileId: '',
    showId: '',
    filePattern: '',
    cronExpression: '0 6 * * *', // Default: Daily at 6 AM
    enabled: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCronHelp, setShowCronHelp] = useState(false)
  const [usePreset, setUsePreset] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState('daily-6am')
  const [nextRuns, setNextRuns] = useState<Date[]>([])

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
        enabled: editingSchedule.enabled
      })
      
      // Check if it matches a preset
      const matchingPreset = cronPresets.find(p => p.expression === editingSchedule.cronExpression)
      if (matchingPreset) {
        setSelectedPreset(matchingPreset.id)
        setUsePreset(true)
      } else {
        setUsePreset(false)
      }
    } else {
      setFormData({
        name: '',
        ftpProfileId: profiles[0]?.id || '',
        showId: shows[0]?.id || '',
        filePattern: '',
        cronExpression: '0 6 * * *',
        enabled: true
      })
      setSelectedPreset('daily-6am')
      setUsePreset(true)
    }
    setErrors({})
  }, [editingSchedule, isOpen, profiles, shows])

  // Update next run times when cron expression changes
  useEffect(() => {
    if (isValidCronExpression(formData.cronExpression)) {
      try {
        const times = getNextRunTimes(formData.cronExpression, 5)
        setNextRuns(times)
      } catch {
        setNextRuns([])
      }
    } else {
      setNextRuns([])
    }
  }, [formData.cronExpression])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Schedule name is required'
    }

    if (!formData.ftpProfileId) {
      newErrors.ftpProfileId = 'FTP profile is required'
    }

    if (!formData.showId) {
      newErrors.showId = 'Show profile is required'
    }

    if (!formData.filePattern.trim()) {
      newErrors.filePattern = 'File pattern is required'
    }

    if (!isValidCronExpression(formData.cronExpression)) {
      newErrors.cronExpression = 'Invalid cron expression'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    if (editingSchedule) {
      updateSchedule(editingSchedule.id, formData)
    } else {
      addSchedule(formData)
    }

    onClose()
  }

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = cronPresets.find(p => p.id === presetId)
    if (preset) {
      setFormData({ ...formData, cronExpression: preset.expression })
    }
  }

  const handleCronModeChange = (usePresetMode: boolean) => {
    setUsePreset(usePresetMode)
    if (usePresetMode) {
      handlePresetChange(selectedPreset)
    }
  }

  const getSelectedProfile = () => {
    return profiles.find(p => p.id === formData.ftpProfileId)
  }

  const getSelectedShow = () => {
    return shows.find(s => s.id === formData.showId)
  }

  const formatNextRun = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
            {/* Schedule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Morning Show Daily Download"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* FTP Profile and Show */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FTP Profile *
                </label>
                <select
                  value={formData.ftpProfileId}
                  onChange={(e) => setFormData({ ...formData, ftpProfileId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select FTP Profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.host})
                    </option>
                  ))}
                </select>
                {errors.ftpProfileId && <p className="text-red-500 text-sm mt-1">{errors.ftpProfileId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Show Profile *
                </label>
                <select
                  value={formData.showId}
                  onChange={(e) => setFormData({ ...formData, showId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Show</option>
                  {shows.map((show) => (
                    <option key={show.id} value={show.id}>
                      {show.name}
                    </option>
                  ))}
                </select>
                {errors.showId && <p className="text-red-500 text-sm mt-1">{errors.showId}</p>}
              </div>
            </div>

            {/* File Pattern */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Pattern *
              </label>
              <input
                type="text"
                value={formData.filePattern}
                onChange={(e) => setFormData({ ...formData, filePattern: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., MorningShow_{YYYY-MM-DD}.mp3"
              />
              {errors.filePattern && <p className="text-red-500 text-sm mt-1">{errors.filePattern}</p>}
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <p>Available date variables: {'{YYYY}'}, {'{MM}'}, {'{DD}'}, {'{YYYY-MM-DD}'}</p>
                <p>Example: Show_{'{YYYY-MM-DD}'}.mp3 becomes Show_2024-05-25.mp3</p>
              </div>
            </div>

            {/* Schedule Configuration */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Schedule *
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCronHelp(!showCronHelp)}
                  className="h-6 w-6 p-0"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Schedule Mode Toggle */}
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={usePreset}
                    onChange={() => handleCronModeChange(true)}
                    className="form-radio text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Preset</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!usePreset}
                    onChange={() => handleCronModeChange(false)}
                    className="form-radio text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Custom Cron</span>
                </label>
              </div>

              {usePreset ? (
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {cronPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} - {preset.description}
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    value={formData.cronExpression}
                    onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="0 6 * * *"
                  />
                  {errors.cronExpression && <p className="text-red-500 text-sm mt-1">{errors.cronExpression}</p>}
                </div>
              )}

              {showCronHelp && (
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Cron Expression Format:
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-mono mb-2">
                    minute hour day month dayOfWeek
                  </p>
                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <p>Examples:</p>
                    <p className="font-mono">0 6 * * * - Daily at 6:00 AM</p>
                    <p className="font-mono">0 18 * * 1-5 - Weekdays at 6:00 PM</p>
                    <p className="font-mono">0 */6 * * * - Every 6 hours</p>
                  </div>
                </div>
              )}
            </div>

            {/* Next Run Preview */}
            {nextRuns.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Next 5 Scheduled Runs:
                  </span>
                </div>
                <div className="space-y-1">
                  {nextRuns.map((date, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                      {index + 1}. {formatNextRun(date)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enable Schedule */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable this schedule
              </label>
            </div>

            {/* Summary */}
            {formData.ftpProfileId && formData.showId && formData.filePattern && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Summary:
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><strong>FTP:</strong> {getSelectedProfile()?.name}</p>
                  <p><strong>Show:</strong> {getSelectedShow()?.name}</p>
                  <p><strong>Pattern:</strong> {formData.filePattern}</p>
                  <p><strong>Schedule:</strong> {cronPresets.find(p => p.expression === formData.cronExpression)?.description || formData.cronExpression}</p>
                </div>
              </div>
            )}

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
                {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 