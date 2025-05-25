import { useFileQueueStore } from '@/store/file-queue-store'
import { useFTPStore } from '@/store/ftp-store'
import { FileStatus } from '@/types/file'
import { replaceDatePatterns } from '@/utils/cron-helper'
import type { FTPProfile, FTPFile, FTPDownloadResult } from '@/types/ftp'

class FTPService {
  // Mock file listings for different FTP servers
  private mockFileLists: Record<string, FTPFile[]> = {
    'ftp.station.com': [
      {
        name: 'MorningShow_2024-05-25.mp3',
        size: 15678934,
        modifiedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        path: '/shows/MorningShow_2024-05-25.mp3'
      },
      {
        name: 'MorningShow_2024-05-24.mp3',
        size: 14523876,
        modifiedDate: new Date(Date.now() - 26 * 60 * 60 * 1000),
        path: '/shows/MorningShow_2024-05-24.mp3'
      },
      {
        name: 'Afternoon_Special.wav',
        size: 28934567,
        modifiedDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
        path: '/shows/Afternoon_Special.wav'
      }
    ],
    'archive.news.com': [
      {
        name: 'News_Evening_2024-05-25.wav',
        size: 18234567,
        modifiedDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
        path: '/archive/daily/News_Evening_2024-05-25.wav'
      },
      {
        name: 'News_Evening_2024-05-24.wav',
        size: 17890234,
        modifiedDate: new Date(Date.now() - 25 * 60 * 60 * 1000),
        path: '/archive/daily/News_Evening_2024-05-24.wav'
      },
      {
        name: 'Breaking_News_Alert.mp3',
        size: 5467890,
        modifiedDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
        path: '/archive/daily/Breaking_News_Alert.mp3'
      }
    ],
    'sports.media.com': [
      {
        name: 'Sports_Weekend_2024-05-20.mp3',
        size: 22345678,
        modifiedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        path: '/sports/weekly/Sports_Weekend_2024-05-20.mp3'
      },
      {
        name: 'Sports_Highlights.wav',
        size: 19876543,
        modifiedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        path: '/sports/weekly/Sports_Highlights.wav'
      }
    ]
  }

  async testConnection(profile: FTPProfile): Promise<boolean> {
    console.log(`🔗 Testing connection to ${profile.host}:${profile.port}...`)
    
    // Simulate connection test delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // Mock connection success/failure (95% success rate)
    const success = Math.random() > 0.05
    
    if (success) {
      console.log(`✅ Successfully connected to ${profile.host}`)
      // Update profile status
      const { updateProfile } = useFTPStore.getState()
      updateProfile(profile.id, {
        connectionStatus: 'connected',
        lastTested: new Date()
      })
      return true
    } else {
      console.log(`❌ Failed to connect to ${profile.host}`)
      const { updateProfile } = useFTPStore.getState()
      updateProfile(profile.id, {
        connectionStatus: 'error',
        lastTested: new Date()
      })
      return false
    }
  }

  async listFiles(profile: FTPProfile, pattern?: string): Promise<FTPFile[]> {
    console.log(`📁 Listing files from ${profile.host}${profile.basePath}`)
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    const files = this.mockFileLists[profile.host] || []
    
    if (!pattern) {
      return files
    }

    // Replace date patterns in the search pattern
    const resolvedPattern = replaceDatePatterns(pattern)
    
    // Simple pattern matching (convert * to regex)
    const regexPattern = resolvedPattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    
    const matchedFiles = files.filter(file => regex.test(file.name))
    console.log(`Found ${matchedFiles.length} files matching pattern: ${resolvedPattern}`)
    
    return matchedFiles
  }

  async downloadFile(profile: FTPProfile, filename: string, showId: string): Promise<boolean> {
    console.log(`⬇️ Downloading ${filename} from ${profile.host}`)
    
    // Simulate download time based on file size
    const mockFile = this.mockFileLists[profile.host]?.find(f => f.name === filename)
    const downloadTime = mockFile ? Math.min(mockFile.size / 1000000, 10000) : 3000 // Max 10 seconds
    
    await new Promise(resolve => setTimeout(resolve, downloadTime))
    
    // 90% success rate for downloads
    const success = Math.random() > 0.1
    
    if (success) {
      console.log(`✅ Successfully downloaded ${filename}`)
      
      // Add downloaded file to the file queue
      const { addFile } = useFileQueueStore.getState()
      addFile({
        filename,
        showId,
        status: FileStatus.PENDING,
        sourcePath: `${profile.basePath}/${filename}`,
        outputPath: undefined
      })
      
      return true
    } else {
      console.log(`❌ Failed to download ${filename}`)
      return false
    }
  }

  async downloadFilesForSchedule(scheduleId: string): Promise<FTPDownloadResult> {
    const { getSchedule, getProfile } = useFTPStore.getState()
    
    const schedule = getSchedule(scheduleId)
    if (!schedule) {
      return {
        success: false,
        filesDownloaded: [],
        error: 'Schedule not found',
        downloadedAt: new Date()
      }
    }

    const profile = getProfile(schedule.ftpProfileId)
    if (!profile) {
      return {
        success: false,
        filesDownloaded: [],
        error: 'FTP profile not found',
        downloadedAt: new Date()
      }
    }

    if (!profile.enabled) {
      return {
        success: false,
        filesDownloaded: [],
        error: 'FTP profile is disabled',
        downloadedAt: new Date()
      }
    }

    console.log(`🕒 Running scheduled download: ${schedule.name}`)

    try {
      // Test connection first
      const connected = await this.testConnection(profile)
      if (!connected) {
        return {
          success: false,
          filesDownloaded: [],
          error: 'Failed to connect to FTP server',
          downloadedAt: new Date()
        }
      }

      // List files matching the pattern
      const files = await this.listFiles(profile, schedule.filePattern)
      
      if (files.length === 0) {
        console.log(`📭 No files found matching pattern: ${schedule.filePattern}`)
        return {
          success: true,
          filesDownloaded: [],
          downloadedAt: new Date(),
          scheduleId
        }
      }

      // Download found files
      const downloadedFiles: string[] = []
      const errors: string[] = []

      for (const file of files.slice(0, 3)) { // Limit to 3 files per schedule run
        try {
          const downloaded = await this.downloadFile(profile, file.name, schedule.showId)
          if (downloaded) {
            downloadedFiles.push(file.name)
          } else {
            errors.push(`Failed to download ${file.name}`)
          }
        } catch (error) {
          errors.push(`Error downloading ${file.name}: ${error}`)
        }
      }

      return {
        success: downloadedFiles.length > 0,
        filesDownloaded: downloadedFiles,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        downloadedAt: new Date(),
        scheduleId
      }

    } catch (error) {
      return {
        success: false,
        filesDownloaded: [],
        error: `Schedule execution failed: ${error}`,
        downloadedAt: new Date(),
        scheduleId
      }
    }
  }

  // Manual download execution (for "Run Now" functionality)
  async executeScheduleNow(scheduleId: string): Promise<FTPDownloadResult> {
    console.log(`▶️ Manually executing schedule: ${scheduleId}`)
    return this.downloadFilesForSchedule(scheduleId)
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  // Get connection status display
  getConnectionStatusDisplay(status?: string): { text: string; color: string } {
    switch (status) {
      case 'connected':
        return { text: 'Connected', color: 'text-green-600 dark:text-green-400' }
      case 'testing':
        return { text: 'Testing...', color: 'text-blue-600 dark:text-blue-400' }
      case 'error':
        return { text: 'Connection Error', color: 'text-red-600 dark:text-red-400' }
      case 'disconnected':
      default:
        return { text: 'Disconnected', color: 'text-gray-600 dark:text-gray-400' }
    }
  }
}

// Singleton instance
export const ftpService = new FTPService() 