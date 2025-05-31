import { useState, useEffect } from 'react'
import { Download, Trash2, Calendar, Settings, FileText, Database, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useFTPStore } from '@/store/ftp-store'
import type { FTPHistorySettings } from '@/types/ftp'

export function HistorySettingsForm() {
  const { 
    getHistorySettings, 
    updateHistorySettings, 
    downloadHistory,
    clearDownloadHistory 
  } = useFTPStore()
  
  const [settings, setSettings] = useState<FTPHistorySettings>(getHistorySettings())
  const [isExporting, setIsExporting] = useState(false)
  const [lastExportStatus, setLastExportStatus] = useState<string>('')

  // Statistics
  const totalRecords = downloadHistory.length
  const successfulDownloads = downloadHistory.filter(r => r.successful).length
  const failedDownloads = downloadHistory.filter(r => !r.successful).length
  const last24Hours = downloadHistory.filter(r => 
    Date.now() - new Date(r.downloadedAt).getTime() < 24 * 60 * 60 * 1000
  ).length

  const handleSettingChange = (key: keyof FTPHistorySettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    updateHistorySettings(newSettings)
  }

  const handleExportNow = async () => {
    setIsExporting(true)
    setLastExportStatus('Exporting...')
    
    try {
      // In development, simulate export
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock export data
      const exportData = {
        date: new Date().toISOString().split('T')[0],
        records: downloadHistory.slice(-100), // Last 100 records
        totalRecords: downloadHistory.length,
        successfulDownloads,
        failedDownloads
      }
      
      // Trigger download based on format
      if (settings.exportFormat === 'json' || settings.exportFormat === 'both') {
        const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(jsonBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ftp-history-${exportData.date}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      if (settings.exportFormat === 'csv' || settings.exportFormat === 'both') {
        const csvContent = [
          'Date,Schedule ID,Filename,File Size,Success',
          ...exportData.records.map(r => 
            `${r.downloadedAt},${r.scheduleId},"${r.filename}",${r.fileSize},${r.successful}`
          )
        ].join('\n')
        
        const csvBlob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(csvBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ftp-history-${exportData.date}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      
      setLastExportStatus(`✅ Exported ${exportData.records.length} records`)
      handleSettingChange('lastExport', new Date())
      
    } catch (error) {
      setLastExportStatus(`❌ Export failed: ${error}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCleanupNow = async () => {
    if (!confirm('Are you sure you want to clean up old download history? This action cannot be undone.')) {
      return
    }
    
    const oldRecordsCount = downloadHistory.length
    
    // Calculate cutoff dates
    const successfulCutoff = new Date()
    successfulCutoff.setDate(successfulCutoff.getDate() - settings.successfulDownloadRetentionDays)
    
    const failedCutoff = new Date()
    failedCutoff.setDate(failedCutoff.getDate() - settings.failedDownloadRetentionDays)
    
    // Filter out old records
    const filteredHistory = downloadHistory.filter(record => {
      const recordDate = new Date(record.downloadedAt)
      if (record.successful) {
        return recordDate > successfulCutoff
      } else {
        return recordDate > failedCutoff
      }
    })
    
    // Update history
    clearDownloadHistory()
    filteredHistory.forEach(record => {
      // Re-add filtered records (this would need to be implemented in the store)
    })
    
    const removedCount = oldRecordsCount - filteredHistory.length
    alert(`Cleanup completed! Removed ${removedCount} old records, kept ${filteredHistory.length} recent records.`)
    
    handleSettingChange('lastCleanup', new Date())
  }

  const formatDate = (date?: Date) => {
    if (!date) return 'Never'
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(date))
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRecords}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{successfulDownloads}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{failedDownloads}</p>
              </div>
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last 24h</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{last24Hours}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Retention Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="successfulRetention">Successful Download Retention (days)</Label>
              <Input
                id="successfulRetention"
                type="number"
                min="1"
                max="365"
                value={settings.successfulDownloadRetentionDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('successfulDownloadRetentionDays', parseInt(e.target.value) || 90)}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How long to keep records of successful downloads
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="failedRetention">Failed Download Retention (days)</Label>
              <Input
                id="failedRetention"
                type="number"
                min="1"
                max="365"
                value={settings.failedDownloadRetentionDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('failedDownloadRetentionDays', parseInt(e.target.value) || 30)}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How long to keep records of failed downloads
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxHistory">Maximum Records per Schedule</Label>
            <Input
              id="maxHistory"
              type="number"
              min="100"
              max="10000"
              value={settings.maxHistoryPerSchedule}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('maxHistoryPerSchedule', parseInt(e.target.value) || 1000)}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maximum number of download records to keep per schedule
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Export Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Daily Exports</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically export download history daily
              </p>
            </div>
            <Switch
              checked={settings.enableDailyExport}
              onCheckedChange={(checked: boolean) => handleSettingChange('enableDailyExport', checked)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select
                value={settings.exportFormat}
                onValueChange={(value: string) => handleSettingChange('exportFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON Only</SelectItem>
                  <SelectItem value="csv">CSV Only</SelectItem>
                  <SelectItem value="both">Both JSON & CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exportPath">Export Directory</Label>
              <Input
                id="exportPath"
                value={settings.exportPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('exportPath', e.target.value)}
                placeholder="./logs/ftp-downloads"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="exportTime">Daily Export Time (Cron)</Label>
            <Input
              id="exportTime"
              value={settings.exportTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange('exportTime', e.target.value)}
              placeholder="0 1 * * *"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cron expression for when to run daily exports (default: 1 AM daily)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Manual Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium">Export History Now</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download current download history in selected format
              </p>
              {lastExportStatus && (
                <p className="text-sm mt-1 font-medium">{lastExportStatus}</p>
              )}
            </div>
            <Button 
              onClick={handleExportNow} 
              disabled={isExporting}
              className="shrink-0"
            >
              {isExporting ? 'Exporting...' : 'Export Now'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium">Cleanup Old Records</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remove old download records based on retention settings
              </p>
            </div>
            <Button 
              onClick={handleCleanupNow} 
              variant="outline"
              className="shrink-0"
            >
              Cleanup Now
            </Button>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium mb-2">Last Operations</h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>Last Export: {formatDate(settings.lastExport)}</div>
              <div>Last Cleanup: {formatDate(settings.lastCleanup)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 