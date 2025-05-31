import { getPasswordForUse, validateFTPHost, validateFTPPort, logSecurityEvent } from '@/utils/security'
import { PRODUCTION_CONFIG } from '@/config/production.config'
import type { FTPProfile, FTPFile, FTPDownloadResult } from '@/types/ftp'

/**
 * Frontend FTP service that communicates with the backend API
 * All actual FTP operations happen on the backend for security and compatibility
 */
export class ProductionFTPService {
  private apiBaseUrl = PRODUCTION_CONFIG.api.baseUrl
  
  /**
   * Test connection to FTP server via backend API
   */
  async testConnection(profile: FTPProfile): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      // Input validation on frontend
      if (!validateFTPHost(profile.host)) {
        logSecurityEvent('Invalid FTP host', { host: profile.host, profileId: profile.id })
        throw new Error('Invalid hostname or IP address')
      }
      
      if (!validateFTPPort(profile.port)) {
        logSecurityEvent('Invalid FTP port', { port: profile.port, profileId: profile.id })
        throw new Error('Invalid port number')
      }
      
      // Call backend API
      const response = await fetch(`${this.apiBaseUrl}/api/ftp/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            ...profile,
            password: getPasswordForUse(profile.password) // Decrypt before sending
          }
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Backend error: ${error}`)
      }
      
      const result = await response.json()
      
      const duration = Date.now() - startTime
      logSecurityEvent('FTP connection test via API', {
        profileId: profile.id,
        host: profile.host,
        protocol: profile.protocol,
        duration,
        success: result.success
      })
      
      return result.success
      
    } catch (error) {
      const duration = Date.now() - startTime
      logSecurityEvent('FTP connection test failed', {
        profileId: profile.id,
        host: profile.host,
        protocol: profile.protocol,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      console.error(`[FTP] Connection test failed for ${profile.host}:`, error)
      return false
    }
  }
  
  /**
   * List files from FTP server via backend API
   */
  async listFiles(profile: FTPProfile, pattern?: string): Promise<FTPFile[]> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ftp/list-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            ...profile,
            password: getPasswordForUse(profile.password)
          },
          pattern
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Backend error: ${error}`)
      }
      
      const result = await response.json()
      const files: FTPFile[] = result.files.map((file: any) => ({
        ...file,
        modifiedDate: new Date(file.modifiedDate)
      }))
      
      const duration = Date.now() - startTime
      logSecurityEvent('FTP file listing successful', {
        profileId: profile.id,
        filesFound: files.length,
        duration,
        pattern
      })
      
      return files
      
    } catch (error) {
      const duration = Date.now() - startTime
      logSecurityEvent('FTP file listing failed', {
        profileId: profile.id,
        duration,
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
  
  /**
   * Download a single file via backend API
   */
  async downloadFile(profile: FTPProfile, filename: string, localPath: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ftp/download-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            ...profile,
            password: getPasswordForUse(profile.password)
          },
          filename,
          localPath
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Backend error: ${error}`)
      }
      
      const result = await response.json()
      
      logSecurityEvent('FTP file download via API', {
        profileId: profile.id,
        filename,
        success: result.success
      })
      
      return result.success
      
    } catch (error) {
      logSecurityEvent('FTP file download failed', {
        profileId: profile.id,
        filename,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
  
  /**
   * Execute scheduled download via backend API
   */
  async executeScheduledDownload(
    profile: FTPProfile, 
    filePattern: string, 
    downloadMode: 'current-day' | 'all-new' | 'pattern-match',
    maxFiles: number = 0,
    localDirectory: string
  ): Promise<FTPDownloadResult> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ftp/scheduled-download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            ...profile,
            password: getPasswordForUse(profile.password)
          },
          filePattern,
          downloadMode,
          maxFiles,
          localDirectory
        })
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Backend error: ${error}`)
      }
      
      const result = await response.json()
      
      // Convert date strings back to Date objects
      const downloadResult: FTPDownloadResult = {
        ...result,
        filesDownloaded: result.downloadedFiles || [],
        filesSkipped: result.skippedFiles || [],
        totalFilesFound: result.totalFiles || 0,
        downloadedAt: new Date(result.endTime || Date.now())
      }
      
      const duration = Date.now() - startTime
      logSecurityEvent('FTP scheduled download via API', {
        profileId: profile.id,
        filesDownloaded: downloadResult.filesDownloaded.length,
        filesSkipped: downloadResult.filesSkipped.length,
        duration,
        downloadMode
      })
      
      return downloadResult
      
    } catch (error) {
      const duration = Date.now() - startTime
      logSecurityEvent('FTP scheduled download failed', {
        profileId: profile.id,
        duration,
        downloadMode,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Return error result
      return {
        success: false,
        filesDownloaded: [],
        filesSkipped: [],
        totalFilesFound: 0,
        downloadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Execute a schedule immediately by schedule ID
   */
  async executeScheduleNow(scheduleId: string): Promise<FTPDownloadResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ftp/execute-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId })
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Backend error: ${error}`)
      }
      
      const result = await response.json()
      
      return {
        success: result.success,
        filesDownloaded: result.downloadedFiles || [],
        filesSkipped: result.skippedFiles || [],
        totalFilesFound: result.totalFiles || 0,
        downloadedAt: new Date(result.endTime || Date.now()),
        error: result.error,
        scheduleId
      }
      
    } catch (error) {
      logSecurityEvent('Manual schedule execution failed', {
        scheduleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        success: false,
        filesDownloaded: [],
        filesSkipped: [],
        totalFilesFound: 0,
        downloadedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        scheduleId
      }
    }
  }
  
  /**
   * Get backend health status
   */
  async getBackendStatus(): Promise<{ healthy: boolean; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/health`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        return { healthy: false, message: 'Backend not responding' }
      }
      
      const result = await response.json()
      return { healthy: true, message: result.message || 'Backend healthy' }
      
    } catch (error) {
      return { 
        healthy: false, 
        message: `Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Get connection status display information for UI
   */
  getConnectionStatusDisplay(status?: 'connected' | 'disconnected' | 'testing' | 'error'): { color: string; text: string } {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600 dark:text-green-400',
          text: 'Connected'
        }
      case 'testing':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          text: 'Testing...'
        }
      case 'error':
        return {
          color: 'text-red-600 dark:text-red-400',
          text: 'Error'
        }
      case 'disconnected':
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          text: 'Not tested'
        }
    }
  }
}

/**
 * Mock FTP service for development
 * Simulates FTP operations without requiring a backend
 */
export class MockFTPService {
  async testConnection(profile: FTPProfile): Promise<boolean> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    // Simulate occasional failures for testing
    const success = Math.random() > 0.1 // 90% success rate
    
    logSecurityEvent('Mock FTP connection test', {
      profileId: profile.id,
      host: profile.host,
      protocol: profile.protocol,
      success
    })
    
    return success
  }
  
  async listFiles(profile: FTPProfile, pattern?: string): Promise<FTPFile[]> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    // Generate mock files
    const mockFiles: FTPFile[] = [
      {
        name: 'show_2024-05-30_morning.mp3',
        size: 52428800, // 50MB
        modifiedDate: new Date(),
        path: '/uploads/morning_show/show_2024-05-30_morning.mp3'
      },
      {
        name: 'news_update_12pm.wav',
        size: 26214400, // 25MB
        modifiedDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        path: '/uploads/news/news_update_12pm.wav'
      },
      {
        name: 'commercial_block_A.mp3',
        size: 10485760, // 10MB
        modifiedDate: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        path: '/uploads/commercials/commercial_block_A.mp3'
      }
    ]
    
    // Filter by pattern if provided
    let filteredFiles = mockFiles
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
      filteredFiles = mockFiles.filter(file => regex.test(file.name))
    }
    
    logSecurityEvent('Mock FTP file listing', {
      profileId: profile.id,
      filesFound: filteredFiles.length,
      pattern
    })
    
    return filteredFiles
  }
  
  async downloadFile(profile: FTPProfile, filename: string, localPath: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    const success = Math.random() > 0.05 // 95% success rate
    
    logSecurityEvent('Mock FTP file download', {
      profileId: profile.id,
      filename,
      localPath,
      success
    })
    
    return success
  }
  
  async executeScheduledDownload(
    profile: FTPProfile,
    filePattern: string,
    downloadMode: 'current-day' | 'all-new' | 'pattern-match',
    maxFiles: number = 0,
    localDirectory: string
  ): Promise<FTPDownloadResult> {
    const startTime = new Date()
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))
    
    // Mock downloaded and skipped files
    const downloadedFiles = ['show_2024-05-30_morning.mp3', 'news_update_12pm.wav']
    const skippedFiles = ['old_file.mp3']
    
    // Mock download results
    const mockResult: FTPDownloadResult = {
      success: true,
      filesDownloaded: downloadedFiles,
      filesSkipped: skippedFiles,
      totalFilesFound: downloadedFiles.length + skippedFiles.length,
      downloadedAt: new Date()
    }
    
    logSecurityEvent('Mock FTP scheduled download', {
      profileId: profile.id,
      filesDownloaded: mockResult.filesDownloaded.length,
      filesSkipped: mockResult.filesSkipped.length,
      downloadMode
    })
    
    return mockResult
  }
  
  async getBackendStatus(): Promise<{ healthy: boolean; message: string }> {
    return { healthy: true, message: 'Mock service active (development mode)' }
  }

  /**
   * Get connection status display information for UI
   */
  getConnectionStatusDisplay(status?: 'connected' | 'disconnected' | 'testing' | 'error'): { color: string; text: string } {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600 dark:text-green-400',
          text: 'Connected'
        }
      case 'testing':
        return {
          color: 'text-yellow-600 dark:text-yellow-400',
          text: 'Testing...'
        }
      case 'error':
        return {
          color: 'text-red-600 dark:text-red-400',
          text: 'Error'
        }
      case 'disconnected':
      default:
        return {
          color: 'text-gray-600 dark:text-gray-400',
          text: 'Not tested'
        }
    }
  }

  /**
   * Execute a schedule immediately by schedule ID (mock implementation)
   */
  async executeScheduleNow(scheduleId: string): Promise<FTPDownloadResult> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    
    // Mock schedule execution
    const downloadedFiles = ['mock_schedule_file_1.mp3', 'mock_schedule_file_2.mp3']
    const skippedFiles = ['already_downloaded.mp3']
    
    const mockResult: FTPDownloadResult = {
      success: Math.random() > 0.1, // 90% success rate
      filesDownloaded: downloadedFiles,
      filesSkipped: skippedFiles,
      totalFilesFound: downloadedFiles.length + skippedFiles.length,
      downloadedAt: new Date(),
      scheduleId
    }
    
    logSecurityEvent('Mock schedule execution', {
      scheduleId,
      filesDownloaded: mockResult.filesDownloaded.length,
      filesSkipped: mockResult.filesSkipped.length,
      success: mockResult.success
    })
    
    return mockResult
  }
}

// Export the appropriate service based on environment
const isDevelopment = import.meta.env.VITE_APP_ENV !== 'production'
export const ftpService = isDevelopment ? new MockFTPService() : new ProductionFTPService() 