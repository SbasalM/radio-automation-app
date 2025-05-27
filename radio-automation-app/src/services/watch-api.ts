import { httpClient } from '@/utils/http-client'

export interface WatchStatus {
  isWatching: boolean
  watchedShows: string[]
  lastScanTime?: string
  totalFilesProcessed: number
  errors: string[]
}

export interface StartWatchingRequest {
  showIds: string[]
}

class WatchApiService {
  private readonly basePath = '/api/watch'

  async startWatching(showIds: string[]): Promise<void> {
    try {
      console.log('🔄 Starting file watching for shows:', showIds)
      await httpClient.post(`${this.basePath}/start`, { showIds })
      console.log('✅ Successfully started file watching')
    } catch (error) {
      console.error('❌ Failed to start file watching:', error)
      throw new Error(`Failed to start watching: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async stopWatching(): Promise<void> {
    try {
      console.log('🔄 Stopping file watching...')
      await httpClient.post(`${this.basePath}/stop`)
      console.log('✅ Successfully stopped file watching')
    } catch (error) {
      console.error('❌ Failed to stop file watching:', error)
      throw new Error(`Failed to stop watching: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getWatchStatus(): Promise<WatchStatus> {
    try {
      console.log('🔄 Fetching watch status...')
      const response = await httpClient.get<WatchStatus>(`${this.basePath}/status`)
      console.log('✅ Successfully fetched watch status')
      return response
    } catch (error) {
      console.error('❌ Failed to fetch watch status:', error)
      throw new Error(`Failed to get watch status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async healthCheck(): Promise<boolean> {
    return await httpClient.healthCheck()
  }
}

// Export singleton instance
export const watchApiService = new WatchApiService()

// Export class for testing
export { WatchApiService } 