import { useFTPStore } from '@/store/ftp-store'
import type { FTPDownloadHistory, FTPDailyExport, FTPHistorySettings, FTPEnvironmentConfig } from '@/types/ftp'

class FTPHistoryService {
  private defaultSettings: FTPHistorySettings = {
    successfulDownloadRetentionDays: 90,
    failedDownloadRetentionDays: 30,
    maxHistoryPerSchedule: 1000,
    enableDailyExport: true,
    exportPath: './logs/ftp-downloads',
    exportFormat: 'both',
    exportTime: '0 1 * * *', // 1 AM daily
    enableAutoCleanup: true,
    cleanupTime: '0 2 * * *', // 2 AM daily
  }

  private config: FTPEnvironmentConfig

  constructor() {
    // Get environment configuration
    this.config = this.getEnvironmentConfig()
    
    // Initialize scheduled tasks in production
    if (this.config.environment === 'production') {
      this.initializeScheduledTasks()
    }
  }

  private getEnvironmentConfig(): FTPEnvironmentConfig {
    return {
      environment: (import.meta.env.VITE_APP_ENV as 'development' | 'staging' | 'production') || 'development',
      logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
      enableMockMode: import.meta.env.VITE_APP_ENV !== 'production',
      dataStoragePath: import.meta.env.VITE_DATA_STORAGE_PATH || './data',
      tempDirectory: import.meta.env.VITE_TEMP_DIRECTORY || './temp',
      backupRetention: parseInt(import.meta.env.VITE_BACKUP_RETENTION_DAYS || '30', 10)
    }
  }

  /**
   * Export yesterday's download history to files
   */
  async exportDailyHistory(date?: Date): Promise<FTPDailyExport> {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
    const dateStr = targetDate.toISOString().split('T')[0] // YYYY-MM-DD
    
    try {
      const { downloadHistory, getAllSchedules, getHistorySettings } = useFTPStore.getState()
      const settings = getHistorySettings()
      const schedules = getAllSchedules()
      
      // Filter records for the target date
      const dayStart = new Date(targetDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dayRecords = downloadHistory.filter(record => {
        const recordDate = new Date(record.downloadedAt)
        return recordDate >= dayStart && recordDate <= dayEnd
      })
      
      // Calculate statistics
      const successfulDownloads = dayRecords.filter(r => r.successful).length
      const failedDownloads = dayRecords.filter(r => !r.successful).length
      
      // Schedule breakdown
      const scheduleBreakdown = schedules.map(schedule => {
        const scheduleRecords = dayRecords.filter(r => r.scheduleId === schedule.id)
        return {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          downloads: scheduleRecords.filter(r => r.successful).length,
          failures: scheduleRecords.filter(r => !r.successful).length
        }
      }).filter(breakdown => breakdown.downloads > 0 || breakdown.failures > 0)
      
      const exportData: FTPDailyExport = {
        date: dateStr,
        exportedAt: new Date(),
        totalRecords: dayRecords.length,
        successfulDownloads,
        failedDownloads,
        scheduleBreakdown,
        records: dayRecords
      }
      
      // Export to files based on settings
      if (settings.enableDailyExport) {
        await this.writeExportFiles(exportData, settings)
      }
      
      // Update last export time
      const { updateHistorySettings } = useFTPStore.getState()
      updateHistorySettings({ lastExport: new Date() })
      
      this.log('info', `Exported ${dayRecords.length} download records for ${dateStr}`)
      
      return exportData
      
    } catch (error) {
      this.log('error', `Failed to export daily history: ${error}`)
      throw error
    }
  }
  
  /**
   * Write export data to files
   */
  private async writeExportFiles(exportData: FTPDailyExport, settings: FTPHistorySettings): Promise<void> {
    const filename = `ftp-downloads-${exportData.date}`
    
    try {
      // In production, use real file operations
      if (this.config.environment === 'production') {
        await this.writeToFileSystem(exportData, settings, filename)
      } else {
        // Development mode - use localStorage for demo
        await this.writeToLocalStorage(exportData, settings, filename)
      }
      
    } catch (error) {
      this.log('error', `Failed to export daily history: ${error}`)
      throw error
    }
  }

  /**
   * Production file system operations
   */
  private async writeToFileSystem(exportData: FTPDailyExport, settings: FTPHistorySettings, filename: string): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Ensure export directory exists
    await fs.mkdir(settings.exportPath, { recursive: true })
    
    if (settings.exportFormat === 'json' || settings.exportFormat === 'both') {
      const jsonPath = path.join(settings.exportPath, `${filename}.json`)
      const jsonContent = JSON.stringify(exportData, null, 2)
      await fs.writeFile(jsonPath, jsonContent, 'utf-8')
      this.log('info', `Exported JSON: ${jsonPath}`)
    }
    
    if (settings.exportFormat === 'csv' || settings.exportFormat === 'both') {
      const csvPath = path.join(settings.exportPath, `${filename}.csv`)
      const csvContent = this.convertToCSV(exportData.records)
      await fs.writeFile(csvPath, csvContent, 'utf-8')
      this.log('info', `Exported CSV: ${csvPath}`)
    }
    
    // Create summary file
    const summaryPath = path.join(settings.exportPath, `${filename}-summary.txt`)
    const summaryContent = this.createSummaryReport(exportData)
    await fs.writeFile(summaryPath, summaryContent, 'utf-8')
    this.log('info', `Exported Summary: ${summaryPath}`)
  }

  /**
   * Development localStorage operations
   */
  private async writeToLocalStorage(exportData: FTPDailyExport, settings: FTPHistorySettings, filename: string): Promise<void> {
    if (settings.exportFormat === 'json' || settings.exportFormat === 'both') {
      const jsonContent = JSON.stringify(exportData, null, 2)
      localStorage.setItem(`ftp-export-${exportData.date}`, jsonContent)
      this.log('info', `Exported JSON to localStorage: ${filename}.json`)
    }
    
    if (settings.exportFormat === 'csv' || settings.exportFormat === 'both') {
      const csvContent = this.convertToCSV(exportData.records)
      localStorage.setItem(`ftp-export-csv-${exportData.date}`, csvContent)
      this.log('info', `Exported CSV to localStorage: ${filename}.csv`)
    }
    
    // Summary
    const summaryContent = this.createSummaryReport(exportData)
    localStorage.setItem(`ftp-export-summary-${exportData.date}`, summaryContent)
    this.log('info', `Exported Summary to localStorage: ${filename}-summary.txt`)
  }
  
  /**
   * Convert download records to CSV format
   */
  private convertToCSV(records: FTPDownloadHistory[]): string {
    if (records.length === 0) return 'No records for this date\n'
    
    const headers = [
      'Download Time',
      'Schedule ID', 
      'Filename',
      'File Path',
      'File Size (bytes)',
      'File Modified',
      'Success',
      'Checksum'
    ]
    
    const rows = records.map(record => [
      record.downloadedAt.toISOString(),
      record.scheduleId,
      record.filename,
      record.filePath,
      record.fileSize.toString(),
      record.fileModified.toISOString(),
      record.successful ? 'Yes' : 'No',
      record.checksum || ''
    ])
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')
  }
  
  /**
   * Create a human-readable summary report
   */
  private createSummaryReport(exportData: FTPDailyExport): string {
    const lines = [
      `FTP Download Summary for ${exportData.date}`,
      `Generated: ${exportData.exportedAt.toLocaleString()}`,
      `Environment: ${this.config.environment}`,
      ``,
      `📊 STATISTICS`,
      `Total Downloads: ${exportData.totalRecords}`,
      `Successful: ${exportData.successfulDownloads}`,
      `Failed: ${exportData.failedDownloads}`,
      `Success Rate: ${exportData.totalRecords > 0 ? ((exportData.successfulDownloads / exportData.totalRecords) * 100).toFixed(1) : 0}%`,
      ``,
      `📋 BY SCHEDULE`,
    ]
    
    exportData.scheduleBreakdown.forEach(breakdown => {
      lines.push(`${breakdown.scheduleName}:`)
      lines.push(`  Downloads: ${breakdown.downloads}`)
      lines.push(`  Failures: ${breakdown.failures}`)
      lines.push(``)
    })
    
    if (exportData.failedDownloads > 0) {
      lines.push(`❌ FAILED DOWNLOADS`)
      exportData.records
        .filter(r => !r.successful)
        .forEach(record => {
          lines.push(`${record.downloadedAt.toLocaleTimeString()}: ${record.filename}`)
        })
    }
    
    return lines.join('\n')
  }
  
  /**
   * Clean up old history records based on retention settings
   */
  async cleanupOldHistory(): Promise<{ removed: number; kept: number }> {
    try {
      const { downloadHistory, getHistorySettings, setDownloadHistory } = useFTPStore.getState()
      const settings = getHistorySettings()
      
      const now = new Date()
      const successfulCutoff = new Date(now.getTime() - settings.successfulDownloadRetentionDays * 24 * 60 * 60 * 1000)
      const failedCutoff = new Date(now.getTime() - settings.failedDownloadRetentionDays * 24 * 60 * 60 * 1000)
      
      const keptRecords = downloadHistory.filter(record => {
        const recordDate = new Date(record.downloadedAt)
        
        if (record.successful) {
          return recordDate > successfulCutoff
        } else {
          return recordDate > failedCutoff
        }
      })
      
      const removedCount = downloadHistory.length - keptRecords.length
      
      if (removedCount > 0) {
        setDownloadHistory(keptRecords)
        
        // Update last cleanup time
        const { updateHistorySettings } = useFTPStore.getState()
        updateHistorySettings({ lastCleanup: new Date() })
        
        this.log('info', `Cleaned up ${removedCount} old download records, kept ${keptRecords.length}`)
      }
      
      return { removed: removedCount, kept: keptRecords.length }
      
    } catch (error) {
      this.log('error', `Failed to cleanup old history: ${error}`)
      throw error
    }
  }
  
  /**
   * Get list of available exported files
   */
  async getAvailableExports(): Promise<{ date: string; hasJson: boolean; hasCsv: boolean; hasSummary: boolean }[]> {
    if (this.config.environment === 'production') {
      return this.getFileSystemExports()
    } else {
      return this.getLocalStorageExports()
    }
  }

  /**
   * Production file system export listing
   */
  private async getFileSystemExports(): Promise<{ date: string; hasJson: boolean; hasCsv: boolean; hasSummary: boolean }[]> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const settings = useFTPStore.getState().getHistorySettings()
      
      // Check if export directory exists
      try {
        await fs.access(settings.exportPath)
      } catch {
        return []
      }
      
      const files = await fs.readdir(settings.exportPath)
      const exports: Map<string, { hasJson: boolean; hasCsv: boolean; hasSummary: boolean }> = new Map()
      
      files.forEach(file => {
        const match = file.match(/^ftp-downloads-(\d{4}-\d{2}-\d{2})\.(json|csv|txt)$/)
        if (match) {
          const [, date, ext] = match
          const existing = exports.get(date) || { hasJson: false, hasCsv: false, hasSummary: false }
          
          if (ext === 'json') existing.hasJson = true
          if (ext === 'csv') existing.hasCsv = true
          if (file.includes('-summary.txt')) existing.hasSummary = true
          
          exports.set(date, existing)
        }
      })
      
      return Array.from(exports.entries())
        .map(([date, props]) => ({ date, ...props }))
        .sort((a, b) => b.date.localeCompare(a.date))
        
    } catch (error) {
      this.log('error', `Failed to get file system exports: ${error}`)
      return []
    }
  }

  /**
   * Development localStorage export listing
   */
  private getLocalStorageExports(): { date: string; hasJson: boolean; hasCsv: boolean; hasSummary: boolean }[] {
    const exports: { date: string; hasJson: boolean; hasCsv: boolean; hasSummary: boolean }[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('ftp-export-') && !key.includes('csv') && !key.includes('summary')) {
        const date = key.replace('ftp-export-', '')
        const hasJson = localStorage.getItem(`ftp-export-${date}`) !== null
        const hasCsv = localStorage.getItem(`ftp-export-csv-${date}`) !== null
        const hasSummary = localStorage.getItem(`ftp-export-summary-${date}`) !== null
        
        exports.push({ date, hasJson, hasCsv, hasSummary })
      }
    }
    
    return exports.sort((a, b) => b.date.localeCompare(a.date))
  }
  
  /**
   * Download an exported file
   */
  async downloadExportFile(date: string, format: 'json' | 'csv' | 'summary'): Promise<void> {
    if (this.config.environment === 'production') {
      await this.downloadFromFileSystem(date, format)
    } else {
      this.downloadFromLocalStorage(date, format)
    }
  }

  /**
   * Production file system download
   */
  private async downloadFromFileSystem(date: string, format: 'json' | 'csv' | 'summary'): Promise<void> {
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      const settings = useFTPStore.getState().getHistorySettings()
      
      let filename: string
      let mimeType: string
      
      switch (format) {
        case 'json':
          filename = `ftp-downloads-${date}.json`
          mimeType = 'application/json'
          break
        case 'csv':
          filename = `ftp-downloads-${date}.csv`
          mimeType = 'text/csv'
          break
        case 'summary':
          filename = `ftp-downloads-${date}-summary.txt`
          mimeType = 'text/plain'
          break
      }
      
      const filePath = path.join(settings.exportPath, filename)
      const content = await fs.readFile(filePath, 'utf-8')
      
      // Trigger browser download
      this.triggerBrowserDownload(content, filename, mimeType)
      
      this.log('info', `Downloaded: ${filename}`)
      
    } catch (error) {
      this.log('error', `Failed to download from file system: ${error}`)
      throw error
    }
  }

  /**
   * Development localStorage download
   */
  private downloadFromLocalStorage(date: string, format: 'json' | 'csv' | 'summary'): void {
    let content: string | null = null
    let filename: string
    let mimeType: string
    
    switch (format) {
      case 'json':
        content = localStorage.getItem(`ftp-export-${date}`)
        filename = `ftp-downloads-${date}.json`
        mimeType = 'application/json'
        break
      case 'csv':
        content = localStorage.getItem(`ftp-export-csv-${date}`)
        filename = `ftp-downloads-${date}.csv`
        mimeType = 'text/csv'
        break
      case 'summary':
        content = localStorage.getItem(`ftp-export-summary-${date}`)
        filename = `ftp-downloads-${date}-summary.txt`
        mimeType = 'text/plain'
        break
    }
    
    if (!content) {
      this.log('error', `Export file not found: ${format} for ${date}`)
      return
    }
    
    this.triggerBrowserDownload(content, filename, mimeType)
    this.log('info', `Downloaded: ${filename}`)
  }

  /**
   * Trigger browser download
   */
  private triggerBrowserDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  /**
   * Initialize daily export and cleanup schedules
   */
  private initializeScheduledTasks(): void {
    const settings = useFTPStore.getState().getHistorySettings()
    
    if (this.config.environment === 'production') {
      // In production, these would be handled by the backend with proper cron jobs
      this.log('info', `Daily export scheduled for: ${settings.exportTime}`)
      this.log('info', `Daily cleanup scheduled for: ${settings.cleanupTime}`)
      
      // For now, log that these should be set up as proper cron jobs
      this.log('warn', 'Production deployment should configure cron jobs for export and cleanup')
    } else {
      // Development mode - simulate with intervals for demo
      if (settings.enableDailyExport) {
        this.log('info', `[DEV] Daily export would run at: ${settings.exportTime}`)
      }
      
      if (settings.enableAutoCleanup) {
        this.log('info', `[DEV] Daily cleanup would run at: ${settings.cleanupTime}`)
      }
    }
  }

  /**
   * Logging with environment-aware levels
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 }
    const configLevel = logLevels[this.config.logLevel]
    const messageLevel = logLevels[level]
    
    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString()
      const prefix = `[${timestamp}] [FTP-History] [${level.toUpperCase()}]`
      
      switch (level) {
        case 'error':
          console.error(`${prefix} ${message}`)
          break
        case 'warn':
          console.warn(`${prefix} ${message}`)
          break
        case 'debug':
          console.debug(`${prefix} ${message}`)
          break
        default:
          console.log(`${prefix} ${message}`)
      }
    }
  }
}

// Singleton instance
export const ftpHistoryService = new FTPHistoryService() 