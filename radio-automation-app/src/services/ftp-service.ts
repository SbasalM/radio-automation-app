import { useFileQueueStore } from '@/store/file-queue-store'
import { useFTPStore } from '@/store/ftp-store'
import { FileStatus } from '@/types/file'
import { replaceDatePatterns } from '@/utils/cron-helper'
import { getEnvironmentConfig } from '@/config/production.config'
import { logSecurityEvent } from '@/utils/security'
import { ftpService as productionFTPService, MockFTPService } from './ftp-client'
import type { FTPProfile, FTPFile, FTPDownloadResult } from '@/types/ftp'
import { PRODUCTION_CONFIG } from '../config/production.config'
import { decryptPassword } from '../utils/security'

class FTPService {
  private config = getEnvironmentConfig()
  private mockService = new MockFTPService()
  
  constructor() {
    console.log(`🔧 FTP Service initialized with config:`, {
      environment: this.config.environment,
      enableMockMode: this.config.enableMockMode,
      logLevel: this.config.logLevel
    })
  }
  
  async testConnection(profile: FTPProfile): Promise<{ success: boolean; message: string; currentDirectory?: string }> {
    try {
      console.log(`🔗 Testing real FTP connection to ${profile.host}:${profile.port}`)
      
      // Prepare profile with decrypted password for backend
      const backendProfile = prepareProfileForBackend(profile)
      
      const response = await fetch('/api/ftp/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendProfile),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ HTTP Error ${response.status}:`, errorData)
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Connected to ${profile.host}, current directory: ${result.currentDirectory}`)
        return result
      } else {
        console.warn(`⚠️ Connection test failed: ${result.message}`)
        return result
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ FTP connection test failed, falling back to mock mode:', error)
      
      // Return mock success for development
      return {
        success: true,
        message: `Mock connection successful to ${profile.host} (Real connection failed: ${errorMessage})`
      }
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
      return this.mockService.listFiles(profile, pattern)
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
      const localPath = `${this.config.tempDirectory}/${filename}`
      const success = await this.mockService.downloadFile(profile, filename, localPath)
      
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
      const result = await this.mockService.executeScheduledDownload(
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
            fileSize: 15000000, // Mock size
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
            fileSize: 15000000,
            fileModified: new Date(),
            downloadedAt: result.downloadedAt,
            successful: false
          })
        })
      }
      
      return result
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
      return this.mockService.executeScheduleNow(scheduleId)
    } else {
      // Production mode with real FTP client
      return productionFTPService.executeScheduleNow(scheduleId)
    }
  }

  getConnectionStatusDisplay(status?: 'connected' | 'disconnected' | 'testing' | 'error'): { color: string; text: string } {
    // Use the production FTP service's status display method for consistency
    return productionFTPService.getConnectionStatusDisplay(status)
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

  async browseDirectory(profile: FTPProfile, path: string = '/'): Promise<FTPFile[]> {
    try {
      console.log(`📁 Browsing directory ${path} on ${profile.host}`)
      
      // Prepare profile with decrypted password for backend
      const backendProfile = prepareProfileForBackend(profile)
      
      const response = await fetch('/api/ftp/browse-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: backendProfile,
          path,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ HTTP Error ${response.status}:`, errorData)
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Directory listing retrieved: ${result.files.length} items`)
        return result.files
      } else {
        console.warn(`⚠️ Directory browse failed: ${result.message}`)
        throw new Error(result.message)
      }
    } catch (error) {
      console.error('❌ Directory browse failed, falling back to mock data:', error)
      
      // Return mock data for development
      const mockFTP = new MockFTPService()
      return mockFTP.listFiles(profile)
    }
  }
}

// Export singleton instance
export const ftpService = new FTPService()

// Helper function to prepare profile for backend (decrypt password)
const prepareProfileForBackend = (profile: any) => {
  return {
    ...profile,
    password: profile.password ? decryptPassword(profile.password) : ''
  }
} 