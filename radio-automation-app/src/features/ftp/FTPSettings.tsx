import { useState } from 'react'
import { Plus, Server, Calendar, Edit, Trash2, TestTube, Play, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FTPProfileForm } from './FTPProfileForm'
import { ScheduleForm } from './ScheduleForm'
import { useFTPStore } from '@/store/ftp-store'
import { useShowStore } from '@/store/show-store'
import { ftpService } from '@/services/ftp-service'
import { formatNextRun } from '@/utils/cron-helper'
import type { FTPProfile, FTPSchedule } from '@/types/ftp'

export function FTPSettings() {
  const { 
    profiles, 
    schedules, 
    deleteProfile, 
    deleteSchedule, 
    updateProfile, 
    updateSchedule,
    getAllProfiles,
    getAllSchedules
  } = useFTPStore()
  const { getShow } = useShowStore()

  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false)
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<FTPProfile | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<FTPSchedule | null>(null)

  const activeProfiles = profiles.filter(p => p.enabled)
  const activeSchedules = schedules.filter(s => s.enabled)

  const handleAddProfile = () => {
    setEditingProfile(null)
    setIsProfileFormOpen(true)
  }

  const handleEditProfile = (profile: FTPProfile) => {
    setEditingProfile(profile)
    setIsProfileFormOpen(true)
  }

  const handleDeleteProfile = (id: string) => {
    if (confirm('Are you sure you want to delete this FTP profile? This will also delete all associated schedules.')) {
      deleteProfile(id)
    }
  }

  const handleTestConnection = async (profile: FTPProfile) => {
    updateProfile(profile.id, { connectionStatus: 'testing' })
    await ftpService.testConnection(profile)
  }

  const handleAddSchedule = () => {
    setEditingSchedule(null)
    setIsScheduleFormOpen(true)
  }

  const handleEditSchedule = (schedule: FTPSchedule) => {
    setEditingSchedule(schedule)
    setIsScheduleFormOpen(true)
  }

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this download schedule?')) {
      deleteSchedule(id)
    }
  }

  const handleToggleSchedule = (schedule: FTPSchedule) => {
    updateSchedule(schedule.id, { enabled: !schedule.enabled })
  }

  const handleRunScheduleNow = async (scheduleId: string) => {
    console.log(`Running schedule now: ${scheduleId}`)
    try {
      const result = await ftpService.executeScheduleNow(scheduleId)
      if (result.success) {
        alert(`Schedule executed successfully! Downloaded ${result.filesDownloaded.length} files.`)
      } else {
        alert(`Schedule execution failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Failed to execute schedule: ${error}`)
    }
  }

  const getProfile = (profileId: string) => {
    return profiles.find(p => p.id === profileId)
  }

  const formatLastTested = (date?: Date) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return `${Math.floor(diffMinutes / 1440)}d ago`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          FTP Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage FTP connections and download schedules
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FTP Profiles</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {profiles.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {activeProfiles.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Download Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {schedules.length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {activeSchedules.length} enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {profiles.filter(p => p.connectionStatus === 'connected').length}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              FTP connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Download</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {(() => {
                const nextSchedule = activeSchedules
                  .filter(s => s.nextRun)
                  .sort((a, b) => a.nextRun!.getTime() - b.nextRun!.getTime())[0]
                return nextSchedule?.nextRun ? formatNextRun(nextSchedule.nextRun) : '--'
              })()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Scheduled download
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FTP Profiles Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>FTP Profiles</span>
          </CardTitle>
          <Button onClick={handleAddProfile}>
            <Plus className="h-4 w-4 mr-2" />
            Add Profile
          </Button>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No FTP profiles yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add an FTP profile to start downloading files automatically.
              </p>
              <Button onClick={handleAddProfile}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Profile
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Host</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Protocol</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Last Tested</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const statusDisplay = ftpService.getConnectionStatusDisplay(profile.connectionStatus)
                    return (
                      <tr
                        key={profile.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {profile.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {profile.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                            {profile.host}:{profile.port}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {profile.basePath}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            {profile.protocol.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-sm font-medium ${statusDisplay.color}`}>
                            {statusDisplay.text}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatLastTested(profile.lastTested)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestConnection(profile)}
                              disabled={profile.connectionStatus === 'testing'}
                              className="h-8 w-8 p-0"
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProfile(profile)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Schedules Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Download Schedules</span>
          </CardTitle>
          <Button onClick={handleAddSchedule} disabled={profiles.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No download schedules yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {profiles.length === 0 
                  ? 'Add an FTP profile first, then create download schedules.'
                  : 'Create a schedule to automatically download files from FTP servers.'
                }
              </p>
              {profiles.length > 0 && (
                <Button onClick={handleAddSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Schedule
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Schedule</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">FTP / Show</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Pattern</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Next Run</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => {
                    const profile = getProfile(schedule.ftpProfileId)
                    const show = getShow(schedule.showId)
                    return (
                      <tr
                        key={schedule.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {schedule.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {schedule.cronExpression}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {profile?.name || 'Unknown FTP'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {show?.name || 'Unknown Show'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {schedule.filePattern}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {schedule.nextRun ? formatNextRun(schedule.nextRun) : '--'}
                          </div>
                          {schedule.lastRun && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Last: {formatLastTested(schedule.lastRun)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleSchedule(schedule)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                              schedule.enabled
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {schedule.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunScheduleNow(schedule.id)}
                              disabled={!schedule.enabled || !profile?.enabled}
                              className="h-8 w-8 p-0 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSchedule(schedule)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <FTPProfileForm
        isOpen={isProfileFormOpen}
        onClose={() => setIsProfileFormOpen(false)}
        editingProfile={editingProfile}
      />

      <ScheduleForm
        isOpen={isScheduleFormOpen}
        onClose={() => setIsScheduleFormOpen(false)}
        editingSchedule={editingSchedule}
      />
    </div>
  )
} 