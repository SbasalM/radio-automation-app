import { useFileQueueStore } from '@/store/file-queue-store'
import { useFTPStore } from '@/store/ftp-store'
import { FileStatus } from '@/types/file'
import { replaceDatePatterns } from '@/utils/cron-helper'
import { getEnvironmentConfig } from '@/config/production.config'
import { logSecurityEvent } from '@/utils/security'
import { ftpService as productionFTPService } from './ftp-client'
import type { FTPProfile, FTPFile, FTPDownloadResult } from '@/types/ftp'

class FTPService {
  private config = getEnvironmentConfig()
  
  // Mock file listings for development/testing (environment-aware)
  private mockFileLists: Record<string, FTPFile[]> = {
    'test.example.com': [
      {
        name: `test_${new Date().toISOString().split('T')[0]}.mp3`,
        size: 15678934,
        modifiedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        path: `/test/test_${new Date().toISOString().split('T')[0]}.mp3`
      },
      {
        name: `test_${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}.mp3`,
        size: 14523876,
        modifiedDate: new Date(Date.now() - 26 * 60 * 60 * 1000),
        path: `/test/test_${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}.mp3`
      }
    ],
    'sftp.example.com': [
      {
        name: `sftp_test_${new Date().toISOString().split('T')[0]}.wav`,
        size: 18234567,
        modifiedDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
        path: `/sftp/test/sftp_test_${new Date().toISOString().split('T')[0]}.wav`
      }
    ]
  }

  async testConnection(profile: FTPProfile): Promise<boolean> {
    logSecurityEvent('FTP connection test initiated', {
      profileId: profile.id,
      host: profile.host,
      protocol: profile.protocol,
      environment: this.config.environment
    })
    
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      return this.testConnectionMock(profile)
    } else {
      // Production mode with real FTP client
      return productionFTPService.testConnection(profile)
    }
  }

  async listFiles(profile: FTPProfile, pattern?: string): Promise<FTPFile[]> {
    logSecurityEvent('FTP file listing initiated', {
      profileId: profile.id,
      host: profile.host,
      pattern,
      environment: this.config.environment
    })
    
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      return this.listFilesMock(profile, pattern)
    } else {
      // Production mode with real FTP client
      return productionFTPService.listFiles(profile, pattern)
    }
  }

  async downloadFile(profile: FTPProfile, filename: string, showId: string): Promise<boolean> {
    logSecurityEvent('FTP file download initiated', {
      profileId: profile.id,
      host: profile.host,
      filename,
      showId,
      environment: this.config.environment
    })
    
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      return this.downloadFileMock(profile, filename, showId)
    } else {
      // Production mode with real FTP client
      const localPath = `${this.config.tempDirectory}/${filename}`
      const success = await productionFTPService.downloadFile(profile, filename, localPath)
      
      if (success) {
        // Add downloaded file to the file queue
        const { addFile } = useFileQueueStore.getState()
        addFile({
          filename,
          showId,
          status: FileStatus.PENDING,
          sourcePath: `${profile.basePath}/${filename}`,
          outputPath: localPath
        })
      }
      
      return success
    }
  }

  async runScheduledDownload(scheduleId: string): Promise<FTPDownloadResult> {
    const { getSchedule, getProfile, addDownloadHistory } = useFTPStore.getState()
    
    const schedule = getSchedule(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }
    
    const profile = getProfile(schedule.ftpProfileId)
    if (!profile) {
      throw new Error(`Profile not found: ${schedule.ftpProfileId}`)
    }
    
    logSecurityEvent('Scheduled FTP download started', {
      scheduleId,
      profileId: profile.id,
      downloadMode: schedule.downloadMode,
      maxFiles: schedule.maxFilesPerRun,
      environment: this.config.environment
    })
    
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      return this.runScheduledDownloadMock(schedule, profile)
    } else {
      // Production mode with real FTP client
      const result = await productionFTPService.executeScheduledDownload(
        profile,
        schedule.filePattern,
        schedule.downloadMode,
        schedule.maxFilesPerRun,
        this.config.tempDirectory
      )
      
      // Track download history if enabled
      if (schedule.trackDownloadHistory) {
        result.filesDownloaded.forEach(filename => {
          addDownloadHistory({
            scheduleId,
            filename,
            filePath: `${profile.basePath}/${filename}`,
            fileSize: 0, // Would need to get from file listing
            fileModified: new Date(),
            downloadedAt: result.downloadedAt,
            successful: true
          })
        })
        
        result.filesSkipped.forEach(filename => {
          addDownloadHistory({
            scheduleId,
            filename,
            filePath: `${profile.basePath}/${filename}`,
            fileSize: 0,
            fileModified: new Date(),
            downloadedAt: result.downloadedAt,
            successful: false
          })
        })
      }
      
      return result
    }
  }

  async executeScheduleNow(scheduleId: string): Promise<FTPDownloadResult> {
    logSecurityEvent('Manual schedule execution initiated', {
      scheduleId,
      environment: this.config.environment
    })
    
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      const { getSchedule, getProfile } = useFTPStore.getState()
      const schedule = getSchedule(scheduleId)
      const profile = schedule ? getProfile(schedule.ftpProfileId) : null
      
      if (!schedule || !profile) {
        throw new Error(`Schedule or profile not found for ID: ${scheduleId}`)
      }
      
      return this.runScheduledDownloadMock(schedule, profile)
    } else {
      // Production mode with real FTP client
      return productionFTPService.executeScheduleNow(scheduleId)
    }
  }

  getConnectionStatusDisplay(status?: 'connected' | 'disconnected' | 'testing' | 'error'): { color: string; text: string } {
    if (this.config.enableMockMode) {
      // Development mode with mock implementation
      return productionFTPService.getConnectionStatusDisplay(status)
    } else {
      // Production mode with real FTP client
      return productionFTPService.getConnectionStatusDisplay(status)
    }
  }

  // Mock implementations for development/testing
  private async testConnectionMock(profile: FTPProfile): Promise<boolean> {
    console.log(`🔗 [MOCK] Testing connection to ${profile.host}:${profile.port}`)
    
    // Simulate connection time
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Higher success rate for test servers
    const success = profile.host.includes('test') || profile.host.includes('example') ? 
      Math.random() > 0.1 : Math.random() > 0.3
    
    if (success) {
      console.log(`✅ [MOCK] Connected to ${profile.host}`)
      
      // Update profile connection status
      const { updateProfile } = useFTPStore.getState()
      updateProfile(profile.id, {
        connectionStatus: 'connected',
        lastTested: new Date()
      })
    } else {
      console.log(`❌ [MOCK] Failed to connect to ${profile.host}`)
      
      // Update profile connection status
      const { updateProfile } = useFTPStore.getState()
      updateProfile(profile.id, {
        connectionStatus: 'error',
        lastTested: new Date()
      })
    }
    
    return success
  }

  private async listFilesMock(profile: FTPProfile, pattern?: string): Promise<FTPFile[]> {
    console.log(`📋 [MOCK] Listing files from ${profile.host}${profile.basePath}`)
    
    // Simulate listing time
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockFiles = this.mockFileLists[profile.host] || []
    
    if (!pattern) {
      return mockFiles
    }

    // Enhanced pattern matching with support for current-day filtering
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Replace date patterns in the pattern
    const expandedPattern = replaceDatePatterns(pattern)
    
    // Convert glob pattern to regex
    const regexPattern = expandedPattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\{([^}]+)\}/g, '($1)')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    
    return mockFiles.filter(file => {
      // Basic pattern matching
      if (!regex.test(file.name)) return false
      
      return true
    })
  }

  private async downloadFileMock(profile: FTPProfile, filename: string, showId: string): Promise<boolean> {
    console.log(`⬇️ [MOCK] Downloading ${filename} from ${profile.host}`)
    
    // Simulate download time based on file size
    const mockFile = this.mockFileLists[profile.host]?.find(f => f.name === filename)
    const downloadTime = mockFile ? Math.min(mockFile.size / 2000000, 3000) : 1000 // Max 3 seconds
    
    await new Promise(resolve => setTimeout(resolve, downloadTime))
    
    // 95% success rate in development
    const success = Math.random() > 0.05
    
    if (success) {
      console.log(`✅ [MOCK] Successfully downloaded ${filename}`)
      
      // Add downloaded file to the file queue
      const { addFile } = useFileQueueStore.getState()
      addFile({
        filename,
        showId,
        status: FileStatus.PENDING,
        sourcePath: `${profile.basePath}/${filename}`,
        outputPath: `${this.config.tempDirectory}/${filename}`
      })
      
      return true
    } else {
      console.log(`❌ [MOCK] Failed to download ${filename}`)
      return false
    }
  }

  private async runScheduledDownloadMock(schedule: any, profile: FTPProfile): Promise<FTPDownloadResult> {
    console.log(`🚀 [MOCK] Running scheduled download: ${schedule.name}`)
    
    const result: FTPDownloadResult = {
      success: false,
      filesDownloaded: [],
      filesSkipped: [],
      totalFilesFound: 0,
      downloadedAt: new Date(),
      scheduleId: schedule.id,
      downloadMode: schedule.downloadMode
    }
    
    try {
      // List available files
      const allFiles = await this.listFilesMock(profile, schedule.filePattern)
      result.totalFilesFound = allFiles.length
      
      // Filter files based on download mode
      let filesToDownload = allFiles
      
      if (schedule.downloadMode === 'current-day') {
        const today = new Date().toISOString().split('T')[0]
        filesToDownload = allFiles.filter(file => file.name.includes(today))
      }
      
      // Apply file limit
      if (schedule.maxFilesPerRun > 0) {
        filesToDownload = filesToDownload.slice(0, schedule.maxFilesPerRun)
      }
      
      // Simulate downloads
      for (const file of filesToDownload) {
        const success = await this.downloadFileMock(profile, file.name, schedule.showId)
        if (success) {
          result.filesDownloaded.push(file.name)
        } else {
          result.filesSkipped.push(file.name)
        }
      }
      
      result.success = result.filesDownloaded.length > 0 || filesToDownload.length === 0
      
      // Track download history if enabled
      if (schedule.trackDownloadHistory) {
        const { addDownloadHistory } = useFTPStore.getState()
        
        result.filesDownloaded.forEach(filename => {
          addDownloadHistory({
            scheduleId: schedule.id,
            filename,
            filePath: `${profile.basePath}/${filename}`,
            fileSize: 15000000, // Mock size
            fileModified: new Date(),
            downloadedAt: result.downloadedAt,
            successful: true
          })
        })
        
        result.filesSkipped.forEach(filename => {
          addDownloadHistory({
            scheduleId: schedule.id,
            filename,
            filePath: `${profile.basePath}/${filename}`,
            fileSize: 15000000,
            fileModified: new Date(),
            downloadedAt: result.downloadedAt,
            successful: false
          })
        })
      }
      
      console.log(`📊 [MOCK] Download completed: ${result.filesDownloaded.length} files downloaded, ${result.filesSkipped.length} skipped`)
      
      return result
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error'
      result.success = false
      console.error(`❌ [MOCK] Scheduled download failed:`, error)
      return result
    }
  }

  // Filter files by download mode with enhanced logic
  filterFilesByDownloadMode(
    files: FTPFile[], 
    downloadMode: 'current-day' | 'all-new' | 'pattern-match',
    maxFiles: number = 0
  ): { filesToDownload: FTPFile[]; reasons: Record<string, string> } {
    const reasons: Record<string, string> = {}
    let filtered = files
    
    switch (downloadMode) {
      case 'current-day':
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        filtered = files.filter(file => {
          // Extract date from filename (supports various date formats)
          const dateMatches = [
            file.name.match(/(\d{4}-\d{2}-\d{2})/), // YYYY-MM-DD
            file.name.match(/(\d{4})(\d{2})(\d{2})/), // YYYYMMDD
            file.name.match(/(\d{2})(\d{2})(\d{4})/) // MMDDYYYY or DDMMYYYY
          ]
          
          for (const match of dateMatches) {
            if (match) {
              let fileDate: string
              if (match[0].includes('-')) {
                fileDate = match[1] // Already YYYY-MM-DD format
              } else if (match.length === 4) {
                // YYYYMMDD format
                fileDate = `${match[1]}-${match[2]}-${match[3]}`
              } else {
                // Skip other formats for now
                continue
              }
              
              if (fileDate === today) {
                return true
              } else {
                reasons[file.name] = `Date ${fileDate} does not match today (${today})`
                return false
              }
            }
          }
          
          reasons[file.name] = 'No recognizable date format found in filename'
          return false
        })
        break
        
      case 'all-new':
        // This would use download history in real implementation
        const { isFileAlreadyDownloaded } = useFTPStore.getState()
        filtered = files.filter(file => {
          // For this to work, we'd need the schedule ID
          // For now, just return all files
          return true
        })
        break
        
      case 'pattern-match':
      default:
        // Return all matching files
        filtered = files
        break
    }
    
    // Sort by modification date (newest first)
    filtered.sort((a, b) => b.modifiedDate.getTime() - a.modifiedDate.getTime())
    
    // Apply file limit if specified
    if (maxFiles > 0 && filtered.length > maxFiles) {
      const skipped = filtered.slice(maxFiles)
      skipped.forEach(file => {
        reasons[file.name] = `Exceeds file limit of ${maxFiles}`
      })
      filtered = filtered.slice(0, maxFiles)
    }
    
    return { filesToDownload: filtered, reasons }
  }
}

// Export singleton instance
export const ftpService = new FTPService() 